export type EnlistedRank = "E1" | "E2" | "E3" | "E4" | "E5" | "E6" | "E7" | "E8" | "E9";

export type YearsOfServiceBracketId =
  | "LT2"
  | "Y2"
  | "Y3"
  | "Y4"
  | "Y6"
  | "Y8"
  | "Y10PLUS";

export const YEARS_OF_SERVICE_BRACKETS: Array<{
  id: YearsOfServiceBracketId;
  label: string;
  minMonths: number;
}> = [
  { id: "LT2", label: "Less than 2 years", minMonths: 0 },
  { id: "Y2", label: "2 years", minMonths: 24 },
  { id: "Y3", label: "3 years", minMonths: 36 },
  { id: "Y4", label: "4 years", minMonths: 48 },
  { id: "Y6", label: "6 years", minMonths: 72 },
  { id: "Y8", label: "8 years", minMonths: 96 },
  { id: "Y10PLUS", label: "10+ years", minMonths: 120 },
];

const BAS_MONTHLY = 476.95;

// Prototype pay model. Goal: deterministic, monotonic, and matches demo screenshots.
const BASE_PAY_LT2: Record<EnlistedRank, number> = {
  E1: 2407.2,
  E2: 2550.0,
  E3: 2650.0,
  E4: 2730.0,
  E5: 3150.0,
  E6: 3600.0,
  E7: 4100.0,
  E8: 4600.0,
  E9: 5100.0,
};

function rankNumber(rank: EnlistedRank): number {
  return Number(rank.replace("E", ""));
}

export function formatMoney(n: number): string {
  const v = Number.isFinite(n) ? n : 0;
  return v.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

export function getYearsOfServiceBracketIdFromTisMonths(tisMonths: number | null | undefined): YearsOfServiceBracketId {
  const m = Math.max(0, tisMonths ?? 0);
  // pick highest bracket whose minMonths <= m
  let id: YearsOfServiceBracketId = "LT2";
  for (const b of YEARS_OF_SERVICE_BRACKETS) {
    if (m >= b.minMonths) id = b.id;
  }
  return id;
}

export function computeBasePayMonthly(rank: EnlistedRank, yos: YearsOfServiceBracketId): number {
  const base = BASE_PAY_LT2[rank] ?? 0;
  const bracketIndex = Math.max(
    0,
    YEARS_OF_SERVICE_BRACKETS.findIndex((b) => b.id === yos)
  );
  // Small step-up per YOS bracket, scaled by rank.
  const step = 55 + rankNumber(rank) * 12;
  return round2(base + bracketIndex * step);
}

export function computeBahMonthly(args: {
  rank: EnlistedRank;
  liveOnBase: boolean;
  hasDependents: boolean;
}): number {
  const { rank, liveOnBase, hasDependents } = args;
  if (liveOnBase) return 0;
  const n = rankNumber(rank);
  const base = hasDependents ? 1250 : 1050;
  return round2(base + n * (hasDependents ? 45 : 35));
}

export function computeBasMonthly(includeBas: boolean): number {
  return includeBas ? BAS_MONTHLY : 0;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

