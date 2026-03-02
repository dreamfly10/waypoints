Readiness Engine v1 — Marines E1–E9 (Tiered Model)
Goal

Compute a Readiness Score (0–100) + Explainability (breakdown, caps, missing items, next actions), based on rank tier:

Tier A: E1–E3 (Time-based eligibility + compliance)

Tier B: E4–E5 (Composite-style weighted score)

Tier C: E6–E9 (Board-strength index)

Also apply global gating caps (medical/PFT/adverse actions).

1) Inputs (Required User State)
Required fields

rankPayGrade: "E1" | "E2" | ... | "E9"

mos: string (e.g., "0311")

dob or age (for percentile normalization; v1 can use age group)

tisMonths: number (Time in service, months)

tigMonths: number (Time in grade, months)

hasAdverseAction: boolean (or enum)

medicalClearance: { status: "valid"|"expired"|"unknown", expiresAt?: ISODate }

pft: { status: "valid"|"expired"|"missing", score?: number, date?: ISODate, ageGroup?: string }

optional: cft, rifle, pme, educationPoints, fitrep, billets, awards, deployments

Data sources (configuration / lookup tables)

minTIGByRank (months): e.g. {E1:0,E2:?,E3:?,E4:?,...} (you’ll fill exact later)

maxTIGCreditByRank (months): cap for linear scaling

maxTISCreditByRank (months)

pftPercentileTable[ageGroup][score] -> percentile (0–100)

v1 can use a simplified bucket mapping if you don’t have tables yet

same for cftPercentileTable

rifleScoreToPercentile or simple normalization

requiredPMEByRank (boolean or course name)

educationMaxPointsByRank

Cursor note: implement v1 with placeholder mappings; keep API stable so real tables can be swapped in.

2) Output Contract
type ReadinessTier = "TIER_A_E1_E3" | "TIER_B_E4_E5" | "TIER_C_E6_E9";

type ComponentResult = {
  key: string;                // e.g., "PFT", "TIG_ELIGIBILITY"
  label: string;
  weight: number;             // 0..1 in tier B/C; in tier A can still use weights
  rawValue?: number | string; // e.g., score, months
  normalized: number;         // 0..100 before weight
  weighted: number;           // 0..100 after weight application
  status: "ok" | "missing" | "expired" | "blocked";
  notes?: string[];
  suggestedActions?: string[];
};

type ReadinessResult = {
  tier: ReadinessTier;
  score: number;              // final after caps 0..100
  scorePreCap: number;        // before global caps
  capApplied?: {
    reason: "MEDICAL_EXPIRED" | "PFT_EXPIRED" | "ADVERSE_ACTION";
    capValue: number;         // e.g., 70
  };
  components: ComponentResult[];
  missingCritical: string[];  // keys of missing that block score quality
  nextBestActions: string[];  // ordered list
  debug?: any;                // optional for tuning
};
3) Global Caps (Apply After Tier Score)

Apply these after tier scoring:

Cap rules (v1 defaults)

If medicalClearance.status === "expired" → cap score at 70

If pft.status === "expired" → cap score at 75

If hasAdverseAction === true → cap score at 60

If multiple caps apply, use the lowest cap.

function applyGlobalCaps(score: number, user: UserState): {score: number, capApplied?: {...}} {
  const caps: Array<{reason: ReadinessResult["capApplied"]["reason"], capValue: number}> = [];
  if (user.medicalClearance.status === "expired") caps.push({reason:"MEDICAL_EXPIRED", capValue:70});
  if (user.pft.status === "expired") caps.push({reason:"PFT_EXPIRED", capValue:75});
  if (user.hasAdverseAction) caps.push({reason:"ADVERSE_ACTION", capValue:60});

  if (!caps.length) return {score};
  const chosen = caps.sort((a,b)=>a.capValue-b.capValue)[0];
  return {score: Math.min(score, chosen.capValue), capApplied: chosen};
}
4) Tier Selection Logic
function getTier(rank: PayGrade): ReadinessTier {
  if (["E1","E2","E3"].includes(rank)) return "TIER_A_E1_E3";
  if (["E4","E5"].includes(rank)) return "TIER_B_E4_E5";
  return "TIER_C_E6_E9"; // E6-E9
}
5) Normalization Helpers
Percentile from score

If you don’t have real percentile tables yet, use buckets:

function normalizePft(score?: number): number {
  if (score == null) return 0;
  if (score <= 200) return 20;
  if (score <= 235) return 45;
  if (score <= 265) return 65;
  if (score <= 285) return 80;
  return 95;
}

Same pattern for CFT and rifle until real tables are available.

Linear scaling with min/max
function scaleLinear(value: number, min: number, max: number): number {
  if (value <= min) return 0;
  if (value >= max) return 100;
  return ((value - min) / (max - min)) * 100;
}
6) Tier A (E1–E3) — Time-Based + Compliance
Weights (sum to 1.0)

TIG eligibility: 0.40

No adverse action: 0.30

PFT valid: 0.15

Required training complete: 0.15 (v1 proxy field)

Component logic

TIG eligibility: normalized is scaleLinear(tigMonths, minTIG, maxTIGCredit)

No adverse action: normalized 100 if !hasAdverseAction else 0

PFT valid: normalized 100 if pft.status==="valid" else 0 (expired/missing = 0)

Training complete: normalized 100 if trainingComplete else 0 (v1 placeholder)

function computeTierA(user: UserState, cfg: Config): {score: number, components: ComponentResult[]} {
  const minTIG = cfg.minTIGByRank[user.rankPayGrade] ?? 0;
  const maxTIG = cfg.maxTIGCreditByRank[user.rankPayGrade] ?? (minTIG + 12);

  const comps: ComponentResult[] = [];

  const tigNorm = scaleLinear(user.tigMonths, minTIG, maxTIG);
  comps.push(component("TIG_ELIGIBILITY","Time-in-Grade Eligibility",0.40, user.tigMonths, tigNorm, "ok",
    tigNorm < 100 ? ["Not yet at max TIG credit"] : [], 
    tigNorm < 100 ? ["Maintain performance; check eligibility timeline"] : []));

  const adverseNorm = user.hasAdverseAction ? 0 : 100;
  comps.push(component("ADVERSE_ACTION","No Adverse Actions",0.30, String(!user.hasAdverseAction), adverseNorm,
    user.hasAdverseAction ? "blocked":"ok",
    user.hasAdverseAction ? ["Adverse action limits readiness"] : [],
    user.hasAdverseAction ? ["Resolve administrative status with command"] : []));

  const pftNorm = user.pft.status === "valid" ? 100 : 0;
  comps.push(component("PFT_VALID","PFT Valid",0.15, user.pft.score ?? "n/a", pftNorm,
    user.pft.status === "valid" ? "ok" : (user.pft.status === "expired" ? "expired":"missing"),
    user.pft.status !== "valid" ? ["PFT is missing/expired"] : [],
    user.pft.status !== "valid" ? ["Upload latest PFT scorecard"] : []));

  const trainingComplete = user.trainingComplete ?? false; // v1 placeholder
  const trainNorm = trainingComplete ? 100 : 0;
  comps.push(component("TRAINING","Required Training Complete",0.15, String(trainingComplete), trainNorm,
    trainingComplete ? "ok":"missing",
    !trainingComplete ? ["Required training not confirmed"] : [],
    !trainingComplete ? ["Mark training complete or upload certificate"] : []));

  const score = comps.reduce((sum,c)=>sum + c.weighted, 0);
  return {score, components: comps};
}
7) Tier B (E4–E5) — Composite Weighted Model
Weights (sum to 1.0)

PFT percentile: 0.20

CFT percentile: 0.15

Rifle: 0.10

TIG: 0.15

TIS: 0.10

PME completion: 0.10

Education points: 0.10

MOS proficiency: 0.10 (v1 proxy, later tie to quals/PME/command inputs)

Component rules

If PFT missing/expired → status missing/expired, normalized 0

TIG/TIS: linear scale with min/max thresholds

PME: 100 if complete else 0

Education: min(points/maxPoints,1)*100

MOS proficiency: v1 selfReported 0..100 or derived from training completion

function computeTierB(user: UserState, cfg: Config): {score: number, components: ComponentResult[]} {
  const comps: ComponentResult[] = [];

  // PFT
  const pftNorm = user.pft.status === "valid" ? normalizePft(user.pft.score) : 0;
  comps.push(component("PFT","PFT Percentile",0.20, user.pft.score ?? "n/a", pftNorm,
    user.pft.status === "valid" ? "ok" : (user.pft.status==="expired"?"expired":"missing"),
    user.pft.status !== "valid" ? ["PFT missing/expired reduces competitiveness"] : [],
    user.pft.status !== "valid" ? ["Upload latest PFT scorecard"] : []));

  // CFT
  const cftNorm = user.cft?.status === "valid" ? normalizeCft(user.cft.score) : 0;
  comps.push(component("CFT","CFT Percentile",0.15, user.cft?.score ?? "n/a", cftNorm,
    user.cft?.status === "valid" ? "ok" : (user.cft?.status==="expired"?"expired":"missing"),
    user.cft?.status !== "valid" ? ["CFT missing/expired"] : [],
    user.cft?.status !== "valid" ? ["Upload latest CFT score"] : []));

  // Rifle
  const rifleNorm = user.rifle?.status === "valid" ? normalizeRifle(user.rifle.score) : 0;
  comps.push(component("RIFLE","Rifle Score",0.10, user.rifle?.score ?? "n/a", rifleNorm,
    user.rifle?.status === "valid" ? "ok" : (user.rifle?.status==="expired"?"expired":"missing"),
    user.rifle?.status !== "valid" ? ["Rifle score missing/expired"] : [],
    user.rifle?.status !== "valid" ? ["Upload latest rifle qualification"] : []));

  // TIG / TIS
  const minTIG = cfg.minTIGByRank[user.rankPayGrade] ?? 0;
  const maxTIG = cfg.maxTIGCreditByRank[user.rankPayGrade] ?? (minTIG + 24);
  const tigNorm = scaleLinear(user.tigMonths, minTIG, maxTIG);
  comps.push(component("TIG","Time in Grade",0.15, user.tigMonths, tigNorm, "ok",
    tigNorm < 100 ? ["More TIG increases readiness up to cap"] : [],
    tigNorm < 100 ? ["Continue building TIG"] : []));

  const minTIS = cfg.minTISByRank?.[user.rankPayGrade] ?? 0;
  const maxTIS = cfg.maxTISCreditByRank?.[user.rankPayGrade] ?? (minTIS + 48);
  const tisNorm = scaleLinear(user.tisMonths, minTIS, maxTIS);
  comps.push(component("TIS","Time in Service",0.10, user.tisMonths, tisNorm, "ok"));

  // PME
  const pmeReq = cfg.requiredPMEByRank[user.rankPayGrade] ?? null;
  const pmeComplete = pmeReq ? Boolean(user.pme?.completed) : true;
  const pmeNorm = pmeComplete ? 100 : 0;
  comps.push(component("PME","PME Completion",0.10, pmeComplete, pmeNorm,
    pmeComplete ? "ok":"missing",
    !pmeComplete ? ["PME incomplete blocks competitiveness"] : [],
    !pmeComplete ? ["Complete required PME or upload completion cert"] : []));

  // Education
  const maxEdu = cfg.educationMaxPointsByRank[user.rankPayGrade] ?? 100;
  const eduPts = user.educationPoints ?? 0;
  const eduNorm = Math.min(eduPts / maxEdu, 1) * 100;
  comps.push(component("EDU","Education Points",0.10, eduPts, eduNorm, "ok",
    eduNorm < 100 ? ["More points can improve readiness"] : [],
    eduNorm < 100 ? ["Add eligible education/self-ed credits"] : []));

  // MOS proficiency (v1 proxy)
  const mosProf = clamp(user.mosProficiency ?? 50, 0, 100);
  comps.push(component("MOS","MOS Proficiency",0.10, mosProf, mosProf, "ok",
    mosProf < 70 ? ["Low proficiency proxy"] : [],
    mosProf < 70 ? ["Add quals/certs tied to MOS"] : []));

  const score = comps.reduce((sum,c)=>sum + c.weighted, 0);
  return {score, components: comps};
}
8) Tier C (E6–E9) — Board Strength Index
Weights (sum to 1.0)

FitRep strength: 0.30

Leadership billets: 0.15

PME completion: 0.15

PFT/CFT valid: 0.10

Career diversity: 0.10

Awards/decorations: 0.10

TIG/TIS timing: 0.10

Component notes

FitReps are often unavailable in prototypes; v1 can accept user-entered rating (0–100) or “last 3 average”

Career diversity can be a count-based proxy (deployments, instructor duty, special billets)

function computeTierC(user: UserState, cfg: Config): {score: number, components: ComponentResult[]} {
  const comps: ComponentResult[] = [];

  const fitrep = clamp(user.fitrepAvg ?? 60, 0, 100);
  comps.push(component("FITREP","FitRep Strength (Avg)",0.30, fitrep, fitrep, "ok",
    fitrep < 70 ? ["Below strong board profile range"] : [],
    fitrep < 70 ? ["Improve performance marks / seek mentorship"] : []));

  const leadership = clamp(user.leadershipIndex ?? 50, 0, 100); // proxy
  comps.push(component("LEAD","Leadership Roles",0.15, leadership, leadership, "ok",
    leadership < 70 ? ["Leadership profile could be stronger"] : [],
    leadership < 70 ? ["Add leadership billet evidence"] : []));

  const pmeReq = cfg.requiredPMEByRank[user.rankPayGrade] ?? null;
  const pmeComplete = pmeReq ? Boolean(user.pme?.completed) : true;
  const pmeNorm = pmeComplete ? 100 : 0;
  comps.push(component("PME","PME Completion",0.15, pmeComplete, pmeNorm,
    pmeComplete ? "ok":"missing",
    !pmeComplete ? ["PME incomplete weakens board package"] : [],
    !pmeComplete ? ["Complete required PME"] : []));

  const fitnessValid = (user.pft.status === "valid") && (user.cft?.status !== "missing");
  const fitNorm = fitnessValid ? 100 : 0;
  comps.push(component("FIT","PFT/CFT Valid",0.10, fitnessValid, fitNorm,
    fitnessValid ? "ok":"missing",
    !fitnessValid ? ["PFT/CFT missing reduces readiness"] : [],
    !fitnessValid ? ["Upload latest PFT/CFT"] : []));

  const diversity = clamp(user.careerDiversityIndex ?? 50, 0, 100); // proxy from billets/tours
  comps.push(component("DIV","Career Diversity",0.10, diversity, diversity, "ok",
    diversity < 70 ? ["Limited breadth of assignments"] : [],
    diversity < 70 ? ["Add billet/tour history"] : []));

  const awards = clamp(user.awardsIndex ?? 50, 0, 100); // proxy from count/level
  comps.push(component("AWARDS","Awards & Recognition",0.10, awards, awards, "ok",
    awards < 60 ? ["Recognition profile light"] : [],
    awards < 60 ? ["Add awards/citations in Vault"] : []));

  const timing = scaleLinear(user.tigMonths, cfg.minTIGByRank[user.rankPayGrade] ?? 0,
                             (cfg.minTIGByRank[user.rankPayGrade] ?? 0) + 36);
  comps.push(component("TIMING","Timing (TIG/TIS)",0.10, user.tigMonths, timing, "ok"));

  const score = comps.reduce((sum,c)=>sum + c.weighted, 0);
  return {score, components: comps};
}
9) Orchestrator: Compute Readiness
function computeReadiness(user: UserState, cfg: Config): ReadinessResult {
  const tier = getTier(user.rankPayGrade);

  let base: {score: number, components: ComponentResult[]};
  if (tier === "TIER_A_E1_E3") base = computeTierA(user, cfg);
  else if (tier === "TIER_B_E4_E5") base = computeTierB(user, cfg);
  else base = computeTierC(user, cfg);

  const scorePreCap = round(base.score);
  const capped = applyGlobalCaps(scorePreCap, user);

  const missingCritical = base.components
    .filter(c => ["missing","expired","blocked"].includes(c.status) && c.weight >= 0.10)
    .map(c => c.key);

  const nextBestActions = rankNextActions(base.components);

  return {
    tier,
    score: round(capped.score),
    scorePreCap,
    capApplied: capped.capApplied,
    components: base.components,
    missingCritical,
    nextBestActions
  };
}
Next-best-actions ranking

Rank by:

status priority: blocked > expired > missing > ok

weight descending

soonest due date if available

function rankNextActions(components: ComponentResult[]): string[] {
  const statusRank = (s: ComponentResult["status"]) =>
    s === "blocked" ? 3 : s === "expired" ? 2 : s === "missing" ? 1 : 0;

  return components
    .filter(c => c.status !== "ok" && (c.suggestedActions?.length))
    .sort((a,b) => statusRank(b.status) - statusRank(a.status) || b.weight - a.weight)
    .flatMap(c => c.suggestedActions!)
    .slice(0, 5);
}
10) Error Scenarios & Guardrails (Cursor must implement)
Validation (before scoring)

If rankPayGrade missing → return score 0, component status missing, prompt “Complete profile”

If tigMonths or tisMonths missing → treat as 0 and add warning component

If PFT score present but outside 0–300 → mark invalid, don’t use; prompt “Correct PFT score”

If document dates conflict (newer score lower?) → allow but flag note “Multiple PFTs detected, using most recent”

Consistency rules

Always return a ReadinessResult (never throw to UI)

If scoring fails unexpectedly, fallback:

score = 0

components = one “SYSTEM_ERROR” component with suggested action “Try again / Contact support”

log error

11) UI-Ready Strings (Explainability)

Each component should render:

label

normalized percent

short notes (“PFT expired—upload latest scorecard”)

1–2 suggested actions

This makes the readiness screen instantly actionable.

Quick “Cursor Commands” Summary (What to Implement)

Create readiness/types.ts with ReadinessResult, ComponentResult, UserState

Create readiness/config.ts with placeholder thresholds + requiredPMEByRank

Implement computeReadiness(user,cfg) orchestrator

Implement computeTierA/B/C functions

Implement applyGlobalCaps, normalization helpers, validators

Expose API: POST /api/readiness/compute (or local function)

UI reads ReadinessResult to render score, breakdown, missing critical, next actions