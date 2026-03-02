/**
 * PRD Readiness Engine: weighted components (30/25/20/15/10), TIG rules, PFT percentile stub.
 */

import type { Profile, VaultItem } from "./schema";
import { differenceInDays, parseISO } from "date-fns";

// Minimum TIG (months) by rank for eligibility — simplified for v1
const TIG_REQUIRED_MONTHS: Record<string, number> = {
  E1: 0,
  E2: 6,
  E3: 12,
  E4: 12,
  E5: 24,
  E6: 24,
  E7: 36,
  E8: 36,
  E9: 36,
};

const WEIGHTS = {
  documentation: 30,
  pftPercentile: 25,
  tigEligibility: 20,
  certifications: 15,
  medicalClearance: 10,
} as const;

function getTigRequiredMonths(rank: string): number {
  return TIG_REQUIRED_MONTHS[rank] ?? 24;
}

/** Documentation completeness (30%): required doc types present and not expired */
function docComponentScore(items: VaultItem[]): number {
  const required = ["pft", "promotion_letter", "cert", "medical_clearance"] as const;
  const now = new Date();
  let present = 0;
  let valid = 0;
  for (const type of required) {
    const doc = items.find((i) => i.type === type);
    if (!doc) continue;
    present++;
    if (doc.expiresAt) {
      try {
        const exp = parseISO(doc.expiresAt);
        if (differenceInDays(exp, now) > 0) valid++;
      } catch {
        valid++;
      }
    } else {
      valid++;
    }
  }
  if (present === 0) return 0;
  return Math.round((valid / required.length) * 100);
}

/** PFT percentile (25%): stub — use raw score bands until percentile table exists */
function pftPercentileComponentScore(pftScore: number): number {
  if (pftScore <= 0) return 0;
  if (pftScore >= 285) return 100;
  if (pftScore >= 250) return 80;
  if (pftScore >= 220) return 60;
  if (pftScore >= 180) return 40;
  return 20;
}

/** TIG eligibility (20%): full if TIG >= required for rank */
function tigComponentScore(profile: Profile): number {
  const tig = profile.tigMonths ?? 0;
  const required = getTigRequiredMonths(profile.rank);
  return tig >= required ? 100 : Math.min(100, Math.round((tig / required) * 100));
}

/** Certifications up-to-date (15%): from vault cert docs not expired */
function certComponentScore(items: VaultItem[], now: Date): number {
  const certs = items.filter((i) => i.type === "cert");
  if (certs.length === 0) return 0;
  const valid = certs.filter((i) => {
    if (!i.expiresAt) return true;
    try {
      return differenceInDays(parseISO(i.expiresAt), now) > 0;
    } catch {
      return true;
    }
  });
  return Math.round((valid.length / certs.length) * 100);
}

/** Medical clearance (10%): profile or vault medical not expired */
function medicalComponentScore(profile: Profile, items: VaultItem[], now: Date): number {
  const profileExp = profile.medicalClearanceExpiresAt;
  if (profileExp) {
    try {
      if (differenceInDays(parseISO(profileExp), now) > 0) return 100;
    } catch {
      return 50;
    }
  }
  const vaultMedical = items.find((i) => i.type === "medical_clearance");
  if (vaultMedical?.expiresAt) {
    try {
      return differenceInDays(parseISO(vaultMedical.expiresAt), now) > 0 ? 100 : 0;
    } catch {
      return 50;
    }
  }
  return profileExp || vaultMedical ? 0 : 0;
}

export interface ReadinessInput {
  profile: Profile;
  vaultItems: VaultItem[];
}

export function computeReadinessScore(input: ReadinessInput): number {
  const { profile, vaultItems } = input;
  const now = new Date();

  const doc = docComponentScore(vaultItems);
  const pft = pftPercentileComponentScore(profile.pftScore);
  const tig = tigComponentScore(profile);
  const cert = certComponentScore(vaultItems, now);
  const medical = medicalComponentScore(profile, vaultItems, now);

  const raw =
    (doc * WEIGHTS.documentation) / 100 +
    (pft * WEIGHTS.pftPercentile) / 100 +
    (tig * WEIGHTS.tigEligibility) / 100 +
    (cert * WEIGHTS.certifications) / 100 +
    (medical * WEIGHTS.medicalClearance) / 100;

  return Math.min(100, Math.max(0, Math.round(raw)));
}

export { getTigRequiredMonths };
