/**
 * Maps app Profile + VaultItem[] to Readiness Engine UserState.
 */
import type { Profile, VaultItem } from "../schema";
import type { UserState, PayGrade, PftState, MedicalClearance, PMEState } from "./types";
import { parseISO, differenceInDays } from "date-fns";
import { computePftStatus } from "./pft";
import { USMC_PROMO_REQS, type EnlistedRank } from "../rules/promotion-requirements";

const ENLISTED_RANKS = ["E1", "E2", "E3", "E4", "E5", "E6", "E7", "E8", "E9"] as const;
const REQUIRED_DOC_TYPES = ["pft", "promotion_letter", "cert", "orders"] as const;

function isValidPayGrade(rank: string): rank is PayGrade {
  return ENLISTED_RANKS.includes(rank as PayGrade);
}

function getPftState(profile: Profile, items: VaultItem[]): PftState {
  const pftDocs = items.filter((i) => i.type === "pft");
  if (!pftDocs.length) {
    const fallbackScore = profile.pftScore || undefined;
    return { status: "MISSING", score: fallbackScore };
  }

  // Choose latest by uploadTimestamp (fallback: test date)
  const latest = pftDocs
    .slice()
    .sort((a, b) => {
      const aTime = (a as any).uploadTimestamp
        ? new Date((a as any).uploadTimestamp).getTime()
        : (() => {
            try {
              return parseISO(a.date).getTime();
            } catch {
              return 0;
            }
          })();
      const bTime = (b as any).uploadTimestamp
        ? new Date((b as any).uploadTimestamp).getTime()
        : (() => {
            try {
              return parseISO(b.date).getTime();
            } catch {
              return 0;
            }
          })();
      return aTime - bTime;
    })
    .at(-1)!;

  const extractedScore = (latest.extractedFields as { score?: number }).score;
  const score =
    profile.pftScore ||
    (typeof extractedScore === "number" ? extractedScore : undefined);

  const { status, expiresOn } = computePftStatus(latest.date);

  let mappedStatus: PftState["status"];
  if (status === "VALID") mappedStatus = "VALID";
  else if (status === "EXPIRING_SOON") mappedStatus = "EXPIRING_SOON";
  else mappedStatus = "EXPIRED";

  const verified =
    typeof (latest.extractedFields as any)?.verified === "boolean"
      ? (latest.extractedFields as any).verified
      : false;

  return {
    status: mappedStatus,
    score: score ?? undefined,
    testDate: latest.date,
    expiresOn,
    verified,
  };
}

function getMedicalClearance(profile: Profile, items: VaultItem[]): MedicalClearance {
  const profileExp = profile.medicalClearanceExpiresAt;
  const vaultMedical = items.find((i) => i.type === "medical_clearance");
  // Prefer Vault record over old profile field; fall back to profile only if no doc exists.
  const expiresAt = vaultMedical?.expiresAt || profileExp;
  // If a medical clearance document exists but has no explicit expiry, treat as valid
  // so that uploading any current clearance clears the action item.
  if (!expiresAt) {
    if (vaultMedical) return { status: "valid" };
    return { status: "unknown" };
  }
  try {
    const exp = parseISO(expiresAt);
    const now = new Date();
    return differenceInDays(exp, now) > 0 ? { status: "valid", expiresAt } : { status: "expired", expiresAt };
  } catch {
    // If parsing fails but a document exists, treat as valid rather than blocking readiness.
    if (vaultMedical) return { status: "valid", expiresAt };
    return { status: "unknown", expiresAt };
  }
}

function computeDocsCompleteness(items: VaultItem[]): number {
  const total: number = REQUIRED_DOC_TYPES.length;
  if (total === 0) return 0;
  const now = new Date();

  let have = 0;
  for (const type of REQUIRED_DOC_TYPES) {
    const hasValid = items.some((i) => {
      if (i.type !== type) return false;
      if (!i.expiresAt) return true;
      try {
        return differenceInDays(parseISO(i.expiresAt), now) > 0;
      } catch {
        return true;
      }
    });
    if (hasValid) have++;
  }

  return (have / total) * 100;
}

function getPmeState(profile: Profile, items: VaultItem[], rankPayGrade: PayGrade): PMEState {
  const rank = (rankPayGrade as EnlistedRank) ?? "E5";
  const nextReq = USMC_PROMO_REQS.find((r) => r.from === rank);

  const pmeDocs = items.filter((i) => i.type === "pme_cert");
  const latest = pmeDocs
    .slice()
    .sort((a, b) => {
      const aTime = (a as any).uploadTimestamp
        ? new Date((a as any).uploadTimestamp).getTime()
        : (() => {
            try {
              return parseISO(a.date).getTime();
            } catch {
              return 0;
            }
          })();
      const bTime = (b as any).uploadTimestamp
        ? new Date((b as any).uploadTimestamp).getTime()
        : (() => {
            try {
              return parseISO(b.date).getTime();
            } catch {
              return 0;
            }
          })();
      return aTime - bTime;
    })
    .at(-1);

  const passed = latest ? (latest.extractedFields as any)?.passed : undefined;
  const verified = latest ? Boolean((latest.extractedFields as any)?.verified) : false;
  const completedOn = latest?.date;
  const courseFromDoc = latest ? (latest.extractedFields as any)?.course : undefined;

  // Prefer vault record; fallback to profile boolean when no record exists.
  const status: PMEState["status"] =
    typeof passed === "boolean"
      ? passed
        ? "COMPLETE"
        : "IN_PROGRESS"
      : profile.pmeComplete
        ? "COMPLETE"
        : "MISSING";

  return {
    status,
    course: courseFromDoc ?? (nextReq?.requiresPME ? nextReq.pmeLabel : undefined),
    completedOn: status === "COMPLETE" ? completedOn : undefined,
    verified,
  };
}

export function mapToUserState(profile: Profile, vaultItems: VaultItem[]): UserState {
  const rankPayGrade: PayGrade = isValidPayGrade(profile.rank) ? profile.rank : "E5";
  const pft = getPftState(profile, vaultItems);
  const medicalClearance = getMedicalClearance(profile, vaultItems);
  const docsCompleteness = computeDocsCompleteness(vaultItems);
  const pme = getPmeState(profile, vaultItems, rankPayGrade);

  const certs = vaultItems.filter((i) => i.type === "cert");
  const trainingComplete = certs.length > 0 && certs.some((c) => {
    if (!c.expiresAt) return true;
    try {
      return differenceInDays(parseISO(c.expiresAt), new Date()) > 0;
    } catch {
      return true;
    }
  });

  const profileComplete = Boolean(
    profile.firstName?.trim() && profile.lastName?.trim()
  );

  return {
    rankPayGrade,
    mos: profile.mos,
    dob: profile.dateOfBirth ?? undefined,
    tisMonths: profile.tisMonths ?? 0,
    tigMonths: profile.tigMonths ?? 0,
    hasAdverseAction: false,
    medicalClearance,
    pft,
    pme,
    docsCompleteness,
    trainingComplete,
    educationPoints: 0,
    mosProficiency: 50,
    fitrepAvg: 60,
    leadershipIndex: 50,
    careerDiversityIndex: 50,
    awardsIndex: 50,
    profileComplete,
  };
}
