/**
 * Readiness Engine v1 — Marines E1–E9 (Tiered Model)
 * Implements READINESS_ENGINE.md: tiers A/B/C, global caps, explainability.
 */

import type {
  UserState,
  ReadinessResult,
  ComponentResult,
  ComponentStatus,
  CapReason,
  PayGrade,
} from "./types";

export type { ReadinessResult, ComponentResult, UserState } from "./types";
import type { ReadinessConfig } from "./config";
import { defaultReadinessConfig } from "./config";

// --- Tier selection ---
export function getTier(rank: PayGrade): ReadinessResult["tier"] {
  if (["E1", "E2", "E3"].includes(rank)) return "TIER_A_E1_E3";
  if (["E4", "E5"].includes(rank)) return "TIER_B_E4_E5";
  return "TIER_C_E6_E9";
}

// --- Normalization helpers ---
export function normalizePft(score?: number): number {
  if (score == null) return 0;
  if (score <= 200) return 20;
  if (score <= 235) return 45;
  if (score <= 265) return 65;
  if (score <= 285) return 80;
  if (score < 300) return 95;
  // Perfect score (300+) should receive full credit.
  return 100;
}

export function normalizeCft(score?: number): number {
  if (score == null) return 0;
  if (score <= 200) return 20;
  if (score <= 235) return 45;
  if (score <= 265) return 65;
  if (score <= 285) return 80;
  return 95;
}

export function normalizeRifle(score?: number): number {
  if (score == null) return 0;
  return Math.min(100, Math.round((score / 250) * 100));
}

export function scaleLinear(value: number, min: number, max: number): number {
  if (value <= min) return 0;
  if (value >= max) return 100;
  return ((value - min) / (max - min)) * 100;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round(x: number): number {
  return Math.round(x);
}

// --- Global caps ---
export function applyGlobalCaps(
  score: number,
  user: UserState
): { score: number; capApplied?: { capValue: number; reasons: CapReason[] } } {
  const caps: Array<{ reason: CapReason; capValue: number }> = [];
  if (user.medicalClearance.status === "expired")
    caps.push({ reason: "MEDICAL_EXPIRED", capValue: 70 });
  // PFT cap rules (prototype):
  // - If missing or expired → cap at 60
  // - If score < 200 → cap at 60
  // - If score 200–234 → cap at 85
  const pftUsable = user.pft && (user.pft.status === "VALID" || user.pft.status === "EXPIRING_SOON");
  const pftScore = user.pft?.score;
  if (!user.pft || user.pft.status === "MISSING" || user.pft.status === "EXPIRED") {
    caps.push({ reason: "PFT_EXPIRED", capValue: 60 });
  }
  if (pftUsable && typeof pftScore === "number") {
    if (pftScore < 200) caps.push({ reason: "PFT_BELOW_STANDARD", capValue: 60 });
    else if (pftScore < 235) caps.push({ reason: "PFT_NOT_COMPETITIVE", capValue: 85 });
  }
  if (user.hasAdverseAction) caps.push({ reason: "ADVERSE_ACTION", capValue: 60 });

  // PME hard cap: only when next promotion step requires PME and it's incomplete.
  const elig = computeEligibility({
    rank: user.rankPayGrade as any,
    tigMonths: user.tigMonths,
    pmeStatus: user.pme.status,
  });
  const pmeCap = 90;
  if (elig.requiresPME && !elig.pmeComplete) {
    caps.push({ reason: "PME_INCOMPLETE", capValue: pmeCap });
  }

  if (!caps.length) return { score };
  const chosen = caps.sort((a, b) => a.capValue - b.capValue)[0];
  const reasons = caps
    .filter((c) => c.capValue === chosen.capValue)
    .map((c) => c.reason);
  return { score: Math.min(score, chosen.capValue), capApplied: { capValue: chosen.capValue, reasons } };
}

// --- Component builder ---
function component(
  key: string,
  label: string,
  weight: number,
  rawValue: number | string | undefined,
  normalized: number,
  status: ComponentStatus,
  notes?: string[],
  suggestedActions?: string[]
): ComponentResult {
  const weighted = (normalized / 100) * weight * 100; // scale weight to 0..100 contribution
  return {
    key,
    label,
    weight,
    rawValue,
    normalized,
    weighted: round(weighted),
    status,
    notes,
    suggestedActions,
  };
}

// --- Tier A (E1–E3) ---
function computeTierA(
  user: UserState,
  cfg: ReadinessConfig
): { score: number; components: ComponentResult[] } {
  const minTIG = cfg.minTIGByRank[user.rankPayGrade] ?? 0;
  const maxTIG = cfg.maxTIGCreditByRank[user.rankPayGrade] ?? minTIG + 12;

  const comps: ComponentResult[] = [];

  const tigNorm = scaleLinear(user.tigMonths, minTIG, maxTIG);
  comps.push(
    component(
      "TIG_ELIGIBILITY",
      "Time-in-Grade Eligibility",
      0.4,
      user.tigMonths,
      tigNorm,
      "ok",
      tigNorm < 100 ? ["Not yet at max TIG credit"] : [],
      tigNorm < 100 ? ["Maintain performance; check eligibility timeline"] : []
    )
  );

  const adverseNorm = user.hasAdverseAction ? 0 : 100;
  comps.push(
    component(
      "ADVERSE_ACTION",
      "No Adverse Actions",
      0.3,
      String(!user.hasAdverseAction),
      adverseNorm,
      user.hasAdverseAction ? "blocked" : "ok",
      user.hasAdverseAction ? ["Adverse action limits readiness"] : [],
      user.hasAdverseAction ? ["Resolve administrative status with command"] : []
    )
  );

  const pftIsUsable = user.pft.status === "VALID" || user.pft.status === "EXPIRING_SOON";
  const pftNorm = pftIsUsable ? 100 : 0;
  comps.push(
    component(
      "PFT_VALID",
      "PFT Valid",
      0.15,
      user.pft.score ?? "n/a",
      pftNorm,
      pftIsUsable ? "ok" : user.pft.status === "EXPIRED" ? "expired" : "missing",
      !pftIsUsable ? ["PFT is missing/expired"] : [],
      !pftIsUsable ? ["Upload latest PFT scorecard"] : []
    )
  );

  const trainingComplete = user.trainingComplete ?? false;
  const trainNorm = trainingComplete ? 100 : 0;
  comps.push(
    component(
      "TRAINING",
      "Required Training Complete",
      0.15,
      String(trainingComplete),
      trainNorm,
      trainingComplete ? "ok" : "missing",
      !trainingComplete ? ["Required training not confirmed"] : [],
      !trainingComplete ? ["Mark training complete or upload certificate"] : []
    )
  );

  const score = comps.reduce((sum, c) => sum + c.weighted, 0);
  return { score, components: comps };
}

// --- Tier B (E4–E5) ---
function computeTierB(
  user: UserState,
  cfg: ReadinessConfig
): { score: number; components: ComponentResult[] } {
  const comps: ComponentResult[] = [];

  const pftIsUsable = user.pft.status === "VALID" || user.pft.status === "EXPIRING_SOON";
  const pftNorm = pftIsUsable ? normalizePft(user.pft.score) : 0;
  comps.push(
    component(
      "PFT",
      "PFT Percentile",
      0.2,
      user.pft.score ?? "n/a",
      pftNorm,
      pftIsUsable ? "ok" : user.pft.status === "EXPIRED" ? "expired" : "missing",
      !pftIsUsable ? ["PFT missing/expired reduces competitiveness"] : [],
      !pftIsUsable ? ["Upload latest PFT scorecard"] : []
    )
  );

  const cftNorm = user.cft?.status === "valid" ? normalizeCft(user.cft.score) : 0;
  comps.push(
    component(
      "CFT",
      "CFT Percentile",
      0.15,
      user.cft?.score ?? "n/a",
      cftNorm,
      user.cft?.status === "valid" ? "ok" : user.cft?.status === "expired" ? "expired" : "missing",
      user.cft?.status !== "valid" ? ["CFT missing/expired"] : [],
      user.cft?.status !== "valid" ? ["Upload latest CFT score"] : []
    )
  );

  const rifleNorm = user.rifle?.status === "valid" ? normalizeRifle(user.rifle.score) : 0;
  comps.push(
    component(
      "RIFLE",
      "Rifle Score",
      0.1,
      user.rifle?.score ?? "n/a",
      rifleNorm,
      user.rifle?.status === "valid" ? "ok" : user.rifle?.status === "expired" ? "expired" : "missing",
      user.rifle?.status !== "valid" ? ["Rifle score missing/expired"] : [],
      user.rifle?.status !== "valid" ? ["Upload latest rifle qualification"] : []
    )
  );

  const minTIG = cfg.minTIGByRank[user.rankPayGrade] ?? 0;
  const maxTIG = cfg.maxTIGCreditByRank[user.rankPayGrade] ?? minTIG + 24;
  const tigNorm = scaleLinear(user.tigMonths, minTIG, maxTIG);
  comps.push(
    component("TIG", "Time in Grade", 0.15, user.tigMonths, tigNorm, "ok", tigNorm < 100 ? ["More TIG increases readiness up to cap"] : [], tigNorm < 100 ? ["Continue building TIG"] : [])
  );

  const minTIS = cfg.minTISByRank?.[user.rankPayGrade] ?? 0;
  const maxTIS = cfg.maxTISCreditByRank?.[user.rankPayGrade] ?? minTIS + 48;
  const tisNorm = scaleLinear(user.tisMonths, minTIS, maxTIS);
  comps.push(component("TIS", "Time in Service", 0.1, user.tisMonths, tisNorm, "ok"));

  const pmeReq = cfg.requiredPMEByRank[user.rankPayGrade] ?? null;
  const pmeComplete = pmeReq ? user.pme.status === "COMPLETE" : true;
  const pmeNorm = pmeComplete ? 100 : 0;
  comps.push(
    component(
      "PME",
      "PME Completion",
      0.1,
      String(pmeComplete),
      pmeNorm,
      pmeComplete ? "ok" : "missing",
      !pmeComplete ? ["PME incomplete blocks competitiveness"] : [],
      !pmeComplete ? ["Complete required PME or upload completion cert"] : []
    )
  );

  const maxEdu = cfg.educationMaxPointsByRank[user.rankPayGrade] ?? 100;
  const eduPts = user.educationPoints ?? 0;
  const eduNorm = Math.min(eduPts / maxEdu, 1) * 100;
  comps.push(
    component("EDU", "Education Points", 0.1, eduPts, eduNorm, "ok", eduNorm < 100 ? ["More points can improve readiness"] : [], eduNorm < 100 ? ["Add eligible education/self-ed credits"] : [])
  );

  const mosProf = clamp(user.mosProficiency ?? 50, 0, 100);
  comps.push(
    component("MOS", "MOS Proficiency", 0.1, mosProf, mosProf, "ok", mosProf < 70 ? ["Low proficiency proxy"] : [], mosProf < 70 ? ["Add quals/certs tied to MOS"] : [])
  );

  const score = comps.reduce((sum, c) => sum + c.weighted, 0);
  return { score, components: comps };
}

// --- Tier C (E6–E9) ---
function computeTierC(
  user: UserState,
  cfg: ReadinessConfig
): { score: number; components: ComponentResult[] } {
  const comps: ComponentResult[] = [];

  const fitrep = clamp(user.fitrepAvg ?? 60, 0, 100);
  comps.push(
    component(
      "FITREP",
      "FitRep Strength (Avg)",
      0.3,
      fitrep,
      fitrep,
      "ok",
      fitrep < 70 ? ["Below strong board profile range"] : [],
      fitrep < 70 ? ["Improve performance marks / seek mentorship"] : []
    )
  );

  const leadership = clamp(user.leadershipIndex ?? 50, 0, 100);
  comps.push(
    component(
      "LEAD",
      "Leadership Roles",
      0.15,
      leadership,
      leadership,
      "ok",
      leadership < 70 ? ["Leadership profile could be stronger"] : [],
      leadership < 70 ? ["Add leadership billet evidence"] : []
    )
  );

  const pmeReq = cfg.requiredPMEByRank[user.rankPayGrade] ?? null;
  const pmeComplete = pmeReq ? user.pme.status === "COMPLETE" : true;
  const pmeNorm = pmeComplete ? 100 : 0;
  comps.push(
    component(
      "PME",
      "PME Completion",
      0.15,
      String(pmeComplete),
      pmeNorm,
      pmeComplete ? "ok" : "missing",
      !pmeComplete ? ["PME incomplete weakens board package"] : [],
      !pmeComplete ? ["Complete required PME"] : []
    )
  );

  const fitnessValid = (user.pft.status === "VALID" || user.pft.status === "EXPIRING_SOON") && user.cft?.status !== "missing";
  const fitNorm = fitnessValid ? 100 : 0;
  comps.push(
    component(
      "FIT",
      "PFT/CFT Valid",
      0.1,
      String(fitnessValid),
      fitNorm,
      fitnessValid ? "ok" : "missing",
      !fitnessValid ? ["PFT/CFT missing reduces readiness"] : [],
      !fitnessValid ? ["Upload latest PFT/CFT"] : []
    )
  );

  const diversity = clamp(user.careerDiversityIndex ?? 50, 0, 100);
  comps.push(
    component(
      "DIV",
      "Career Diversity",
      0.1,
      diversity,
      diversity,
      "ok",
      diversity < 70 ? ["Limited breadth of assignments"] : [],
      diversity < 70 ? ["Add billet/tour history"] : []
    )
  );

  const awards = clamp(user.awardsIndex ?? 50, 0, 100);
  comps.push(
    component(
      "AWARDS",
      "Awards & Recognition",
      0.1,
      awards,
      awards,
      "ok",
      awards < 60 ? ["Recognition profile light"] : [],
      awards < 60 ? ["Add awards/citations in Vault"] : []
    )
  );

  const minTIG = cfg.minTIGByRank[user.rankPayGrade] ?? 0;
  const timing = scaleLinear(user.tigMonths, minTIG, minTIG + 36);
  comps.push(component("TIMING", "Timing (TIG/TIS)", 0.1, user.tigMonths, timing, "ok"));

  const score = comps.reduce((sum, c) => sum + c.weighted, 0);
  return { score, components: comps };
}

// --- 4-bucket model (Documentation / Fitness / Career / Admin-Risk) ---
import { computeEligibility, type EligibilityResult } from "./eligibility";

function computeEligibilityPoints(elig: EligibilityResult): {
  points: number;
} {
  let points = 0;

  // TIG portion = 15 points
  const tigRatio =
    elig.requiredTigMonths === 0
      ? 1
      : Math.min(1, elig.tigMonths / elig.requiredTigMonths);
  points += Math.round(15 * tigRatio);

  // PME portion = 10 points
  if (!elig.requiresPME) {
    points += 10;
  } else {
    points += elig.pmeComplete ? 10 : 0;
  }

  return { points };
}

// --- 4-bucket model (Documentation / Fitness / Eligibility / Admin-Risk) ---
function computeBuckets(
  user: UserState,
  cfg: ReadinessConfig
): { score: number; components: ComponentResult[] } {
  const components: ComponentResult[] = [];

  // A) Documentation (Vault) — 25 pts
  const docsNorm = clamp(user.docsCompleteness ?? 0, 0, 100);
  const docsStatus: ComponentStatus =
    docsNorm >= 90 ? "ok" : docsNorm === 0 ? "missing" : "missing";
  components.push(
    component(
      "DOCS",
      "Documentation (Vault)",
      0.25,
      docsNorm,
      docsNorm,
      docsStatus,
      docsNorm < 100 ? ["Upload required docs: PFT, promotion, cert, orders"] : [],
      docsNorm < 100 ? ["Add missing documents to your Vault"] : []
    )
  );

  // B) Fitness (PFT) — 30 pts
  let fitnessNorm = 0;
  let fitnessStatus: ComponentStatus = "missing";
  const fitnessNotes: string[] = [];
  const fitnessActions: string[] = [];

  const pftUsable = user.pft.status === "VALID" || user.pft.status === "EXPIRING_SOON";
  const pftScore = user.pft.score;

  if (!pftUsable) {
    fitnessNorm = 0;
    fitnessStatus = user.pft.status === "EXPIRED" ? "expired" : "missing";
    fitnessNotes.push("PFT is missing or expired");
    fitnessActions.push("Upload latest PFT scorecard");
  } else if (typeof pftScore !== "number") {
    fitnessNorm = 0;
    fitnessStatus = "missing";
    fitnessNotes.push("PFT score missing");
    fitnessActions.push("Add your PFT score");
  } else if (pftScore < 200) {
    // Hard gate: below competitive standard
    fitnessNorm = 0; // Fitness bucket = 0/30
    fitnessStatus = "blocked";
    fitnessNotes.push("PFT below competitive standard (<200)");
    fitnessActions.push("Increase PFT above 200");
  } else if (pftScore < 235) {
    // Passing but not competitive: fixed partial credit (10/30)
    fitnessNorm = (10 / 30) * 100;
    fitnessStatus = "missing";
    fitnessNotes.push("PFT passing but not competitive (200–234)");
    fitnessActions.push("Increase PFT to 235+");
  } else {
    // Competitive: scales normally
    fitnessNorm = normalizePft(pftScore);
    fitnessStatus = "ok";
  }
  components.push(
    component(
      "FITNESS",
      "Fitness (PFT)",
      0.3,
      user.pft.score ?? "n/a",
      fitnessNorm,
      fitnessStatus,
      fitnessNotes,
      fitnessActions
    )
  );

  // C) Eligibility — 25 pts (TIG + PME gate)
  const elig = computeEligibility({
    rank: user.rankPayGrade as any,
    tigMonths: user.tigMonths,
    pmeStatus: user.pme.status,
  });
  const eligPoints = computeEligibilityPoints(elig);
  const eligNorm = clamp(
    eligPoints.points <= 0 ? 0 : (eligPoints.points / 25) * 100,
    0,
    100
  );
  const careerStatus: ComponentStatus =
    elig.status === "QUALIFIED" ? "ok" : "missing";

  const careerIssues: string[] = [];
  const careerActions: string[] = [];
  if (elig.remainingTigMonths > 0) {
    careerIssues.push(`Needs ${elig.remainingTigMonths} more months TIG`);
    careerActions.push(`Build TIG: +${elig.remainingTigMonths} months`);
  }
  if (elig.requiresPME && !elig.pmeComplete) {
    careerIssues.push("PME incomplete");
    careerActions.push(
      `Complete PME${elig.pmeLabel ? `: ${elig.pmeLabel}` : ""}`
    );
  }

  components.push(
    component(
      "ELIGIBILITY",
      "Career Eligibility",
      0.25,
      `${user.tigMonths} TIG months`,
      eligNorm,
      careerStatus,
      careerStatus !== "ok"
        ? (careerIssues.length ? careerIssues : ["Not board eligible yet"])
        : [],
      careerStatus !== "ok"
        ? (careerActions.length ? careerActions : ["Review eligibility requirements"])
        : []
    )
  );

  // D) Admin / Risk — 20 pts (Adverse actions + medical)
  let adminNorm = 100;
  let adminStatus: ComponentStatus = "ok";

  if (user.hasAdverseAction) {
    adminNorm = 0;
    adminStatus = "blocked";
  } else if (user.medicalClearance.status === "expired") {
    adminNorm = 40;
    adminStatus = "expired";
  } else if (user.medicalClearance.status === "unknown") {
    adminNorm = 70;
    adminStatus = "missing";
  }

  const adminIssues: string[] = [];
  const adminActions: string[] = [];
  if (user.hasAdverseAction) {
    adminIssues.push("Adverse action on file");
    adminActions.push("Resolve adverse action status");
  } else if (user.medicalClearance.status === "expired") {
    adminIssues.push("Medical clearance expired");
    adminActions.push("Update medical clearance");
  } else if (user.medicalClearance.status === "unknown") {
    adminIssues.push("Medical clearance not on file");
    adminActions.push("Upload medical clearance");
  }

  components.push(
    component(
      "ADMIN_RISK",
      "Admin / Risk",
      0.2,
      `${user.hasAdverseAction ? "Adverse action" : "No adverse action"} / ${
        user.medicalClearance.status
      } medical`,
      adminNorm,
      adminStatus,
      adminStatus !== "ok"
        ? (adminIssues.length ? adminIssues : ["Admin or medical issues are reducing readiness"])
        : [],
      adminStatus !== "ok"
        ? (adminActions.length ? adminActions : ["Review admin/risk requirements"])
        : []
    )
  );

  const score = components.reduce((sum, c) => sum + c.weighted, 0);
  return { score, components };
}

function extractBucketPoints(components: ComponentResult[]): {
  docs: number;
  fitness: number;
  eligibility: number;
  admin: number;
} {
  const get = (key: string) =>
    components.find((c) => c.key === key)?.weighted ?? 0;
  return {
    docs: get("DOCS"),
    fitness: get("FITNESS"),
    eligibility: get("ELIGIBILITY"),
    admin: get("ADMIN_RISK"),
  };
}

// --- Next-best-actions ranking ---
function rankNextActions(components: ComponentResult[]): string[] {
  const statusRank = (s: ComponentStatus) =>
    s === "blocked" ? 3 : s === "expired" ? 2 : s === "missing" ? 1 : 0;

  return components
    .filter((c) => c.status !== "ok" && (c.suggestedActions?.length ?? 0) > 0)
    .sort((a, b) => statusRank(b.status) - statusRank(a.status) || b.weight - a.weight)
    .flatMap((c) => c.suggestedActions!)
    .slice(0, 5);
}

// --- Validation (before scoring) ---
function validateUserState(user: UserState): { valid: boolean; missingCritical: string[] } {
  const missing: string[] = [];
  if (!user.rankPayGrade) missing.push("Complete profile (rank)");
  if (user.tigMonths == null) missing.push("TIG");
  if (user.tisMonths == null) missing.push("TIS");
  const pftScore = user.pft?.score;
  if (pftScore != null && (pftScore < 0 || pftScore > 300)) missing.push("Correct PFT score (0–300)");
  return { valid: missing.length === 0, missingCritical: missing };
}

// --- Orchestrator ---
export function computeReadiness(
  user: UserState,
  cfg: ReadinessConfig = defaultReadinessConfig,
  last?: ReadinessResult | null
): ReadinessResult {
  try {
    const validation = validateUserState(user);
    if (!validation.valid && !user.rankPayGrade) {
      return {
        tier: getTier((user.rankPayGrade || "E1") as PayGrade),
        score: 0,
        rawTotal: 0,
        scorePreCap: 0,
        capApplied: null,
        breakdown: {
          documentation: { pointsEarned: 0, pointsMax: 25 },
          fitness: { pointsEarned: 0, pointsMax: 30 },
          eligibility: { pointsEarned: 0, pointsMax: 25 },
          admin: { pointsEarned: 0, pointsMax: 20 },
        },
        explanation: ["Breakdown: Docs 0/25, Fitness 0/30, Eligibility 0/25, Admin 0/20"],
        components: [
          component(
            "PROFILE_INCOMPLETE",
            "Complete profile",
            1,
            undefined,
            0,
            "missing",
            validation.missingCritical,
            ["Complete profile (rank required)"]
          ),
        ],
        missingCritical: validation.missingCritical,
        nextBestActions: ["Complete profile"],
      };
    }

    const rank = (user.rankPayGrade || "E1") as PayGrade;
    const tier = getTier(rank);

    // New 4-bucket model (documentation, fitness, career, admin/risk)
    const base = computeBuckets(user, cfg);
    const allComponents = base.components;

    // Bucket points and breakdown
    const pts = extractBucketPoints(allComponents);
    const rawTotal = round(pts.docs + pts.fitness + pts.eligibility + pts.admin);
    const scorePreCap = rawTotal;

    const breakdown = {
      documentation: { pointsEarned: pts.docs, pointsMax: 25 },
      fitness: { pointsEarned: pts.fitness, pointsMax: 30 },
      eligibility: { pointsEarned: pts.eligibility, pointsMax: 25 },
      admin: { pointsEarned: pts.admin, pointsMax: 20 },
    };

    const capped = applyGlobalCaps(scorePreCap, user);

    const missingCritical = allComponents
      .filter((c) => ["missing", "expired", "blocked"].includes(c.status) && c.weight >= 0.1)
      .map((c) => c.key);

    const nextBestActions = rankNextActions(allComponents);

    // Explanation lines
    const explanation: string[] = [];

    // 1) Always include breakdown
    explanation.push(
      `Breakdown: Docs ${pts.docs}/25, Fitness ${pts.fitness}/30, Eligibility ${pts.eligibility}/25, Admin ${pts.admin}/20`
    );

    // 2) Cap line if applied
    const capApplied =
      capped.capApplied && capped.capApplied.reasons.length
        ? {
            capValue: capped.capApplied.capValue,
            reasons: capped.capApplied.reasons,
          }
        : null;

    if (capApplied) {
      const reasonText = capApplied.reasons
        .map((r) => r.replace(/_/g, " ").toLowerCase())
        .join(", ");
      explanation.push(`CAPPED at ${capApplied.capValue}: ${reasonText}`);
    }

    // 3) Delta vs last readiness, if provided
    let delta: number | undefined;
    if (last && last.breakdown) {
      const lastPts = last.breakdown
        ? {
            docs: last.breakdown.documentation.pointsEarned,
            fitness: last.breakdown.fitness.pointsEarned,
            eligibility: last.breakdown.eligibility.pointsEarned,
            admin: last.breakdown.admin.pointsEarned,
          }
        : extractBucketPoints(last.components);

      const currentScore = round(capped.score);
      const previousScore = last.score;
      const deltaTotal = currentScore - previousScore;
      delta = deltaTotal;

      if (deltaTotal !== 0) {
        const deltas = [
          { key: "Docs", delta: pts.docs - lastPts.docs },
          { key: "Fitness", delta: pts.fitness - lastPts.fitness },
          { key: "Eligibility", delta: pts.eligibility - lastPts.eligibility },
          { key: "Admin", delta: pts.admin - lastPts.admin },
        ].filter((b) => b.delta !== 0);

        deltas.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
        const top = deltas.slice(0, 2);
        const reasons = top.map(
          (b) => `${b.key} ${b.delta > 0 ? "+" : ""}${b.delta}`
        );

        const deltaLinePrefix = deltaTotal > 0 ? `+${deltaTotal}` : `${deltaTotal}`;
        const reasonPart = reasons.length ? `: ${reasons.join(", ")}` : "";
        explanation.push(`${deltaLinePrefix}${reasonPart}`);
      }
    }

    return {
      tier,
      score: round(capped.score),
      rawTotal,
      scorePreCap,
      capApplied,
      breakdown,
      explanation,
      components: allComponents,
      missingCritical,
      nextBestActions,
      delta,
      debug: { pftScoreUsed: user.pft.score ?? null },
    };
  } catch (err) {
    if (typeof console !== "undefined" && console.error) console.error("Readiness scoring failed", err);
    return {
      tier: "TIER_B_E4_E5",
      score: 0,
      rawTotal: 0,
      scorePreCap: 0,
      capApplied: null,
      breakdown: {
        documentation: { pointsEarned: 0, pointsMax: 25 },
        fitness: { pointsEarned: 0, pointsMax: 30 },
        eligibility: { pointsEarned: 0, pointsMax: 25 },
        admin: { pointsEarned: 0, pointsMax: 20 },
      },
      explanation: ["Breakdown: Docs 0/25, Fitness 0/30, Eligibility 0/25, Admin 0/20"],
      components: [
        component(
          "SYSTEM_ERROR",
          "System error",
          1,
          undefined,
          0,
          "missing",
          ["Scoring failed"],
          ["Try again / Contact support"]
        ),
      ],
      missingCritical: ["SYSTEM_ERROR"],
      nextBestActions: ["Try again / Contact support"],
      debug: err instanceof Error ? err.message : String(err),
    };
  }
}
