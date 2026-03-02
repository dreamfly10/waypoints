import { USMC_PROMO_REQS, type EnlistedRank } from "../rules/promotion-requirements";

export type EligibilityResult = {
  status: "QUALIFIED" | "UNQUALIFIED";
  from: EnlistedRank;
  to: EnlistedRank | null;

  tigMonths: number;
  requiredTigMonths: number;
  remainingTigMonths: number;

  requiresPME: boolean;
  pmeLabel?: string;
  pmeComplete: boolean;

  reasons: string[];
};

export function getNextRank(rank: EnlistedRank): EnlistedRank | null {
  const n = Number(rank.replace("E", ""));
  if (n >= 9) return null;
  return `E${n + 1}` as EnlistedRank;
}

export function computeEligibility(args: {
  rank: EnlistedRank;
  tigMonths: number;
  pmeStatus: "MISSING" | "IN_PROGRESS" | "COMPLETE";
}): EligibilityResult {
  const { rank, tigMonths, pmeStatus } = args;
  const to = getNextRank(rank);

  if (!to) {
    return {
      status: "QUALIFIED",
      from: rank,
      to: null,
      tigMonths,
      requiredTigMonths: 0,
      remainingTigMonths: 0,
      requiresPME: false,
      pmeComplete: true,
      reasons: [],
    };
  }

  const req = USMC_PROMO_REQS.find((r) => r.from === rank && r.to === to)!;
  const remainingTigMonths = Math.max(0, req.minTigMonths - tigMonths);

  const reasons: string[] = [];

  if (remainingTigMonths > 0) reasons.push(`Needs ${remainingTigMonths} more months TIG`);
  const pmeComplete = req.requiresPME ? pmeStatus === "COMPLETE" : true;
  if (req.requiresPME && !pmeComplete) reasons.push("PME incomplete");

  const status =
    remainingTigMonths === 0 && pmeComplete ? "QUALIFIED" : "UNQUALIFIED";

  return {
    status,
    from: rank,
    to,
    tigMonths,
    requiredTigMonths: req.minTigMonths,
    remainingTigMonths,
    requiresPME: req.requiresPME,
    pmeLabel: req.pmeLabel,
    pmeComplete,
    reasons,
  };
}

