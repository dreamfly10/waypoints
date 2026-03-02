/**
 * Readiness Engine config: placeholder thresholds and lookup tables.
 * v1 uses placeholder mappings; real tables can be swapped in later.
 */

import type { PayGrade } from "./types";

export interface ReadinessConfig {
  minTIGByRank: Record<PayGrade, number>;
  maxTIGCreditByRank: Record<PayGrade, number>;
  minTISByRank?: Record<PayGrade, number>;
  maxTISCreditByRank?: Record<PayGrade, number>;
  requiredPMEByRank: Record<PayGrade, boolean | string | null>;
  educationMaxPointsByRank: Record<PayGrade, number>;
}

const RANKS: PayGrade[] = ["E1", "E2", "E3", "E4", "E5", "E6", "E7", "E8", "E9"];

function fromPairs<T>(pairs: [PayGrade, T][]): Record<PayGrade, T> {
  return Object.fromEntries(pairs) as Record<PayGrade, T>;
}

export const defaultReadinessConfig: ReadinessConfig = {
  minTIGByRank: fromPairs([
    ["E1", 0],
    ["E2", 6],
    ["E3", 12],
    ["E4", 12],
    ["E5", 24],
    ["E6", 24],
    ["E7", 36],
    ["E8", 36],
    ["E9", 36],
  ]),
  maxTIGCreditByRank: fromPairs(RANKS.map((r) => [r, 36])),
  minTISByRank: fromPairs(RANKS.map((r) => [r, 0])),
  maxTISCreditByRank: fromPairs(RANKS.map((r) => [r, 96])),
  requiredPMEByRank: fromPairs(RANKS.map((r) => [r, true])),
  educationMaxPointsByRank: fromPairs(RANKS.map((r) => [r, 100])),
};
