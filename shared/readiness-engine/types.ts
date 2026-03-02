/**
 * Readiness Engine v1 — Marines E1–E9 (Tiered Model)
 * Types from READINESS_ENGINE.md
 */

export type PayGrade = "E1" | "E2" | "E3" | "E4" | "E5" | "E6" | "E7" | "E8" | "E9";

export type ReadinessTier = "TIER_A_E1_E3" | "TIER_B_E4_E5" | "TIER_C_E6_E9";

export type ComponentStatus = "ok" | "missing" | "expired" | "blocked";

export interface ComponentResult {
  key: string;
  label: string;
  weight: number;
  rawValue?: number | string;
  normalized: number;
  weighted: number;
  status: ComponentStatus;
  notes?: string[];
  suggestedActions?: string[];
}

export type CapReason =
  | "MEDICAL_EXPIRED"
  | "PFT_EXPIRED"
  | "PFT_BELOW_STANDARD"
  | "PFT_NOT_COMPETITIVE"
  | "ADVERSE_ACTION"
  | "PME_INCOMPLETE";

export interface ReadinessResult {
  tier: ReadinessTier;
  score: number;
  /** Total points before caps (0–100) */
  rawTotal: number;
  /** Backwards-compatible pre-cap score (rounded rawTotal) */
  scorePreCap: number;
  /** Change in score vs last readiness result (rounded), if available. */
  delta?: number;
  capApplied: {
    capValue: number;
    reasons: CapReason[];
  } | null;
  breakdown: {
    documentation: { pointsEarned: number; pointsMax: number };
    fitness: { pointsEarned: number; pointsMax: number };
    eligibility: { pointsEarned: number; pointsMax: number };
    admin: { pointsEarned: number; pointsMax: number };
  };
  /** Human-readable explanation lines (2–6, never empty) */
  explanation: string[];
  components: ComponentResult[];
  missingCritical: string[];
  nextBestActions: string[];
  debug?: unknown;
}

export type MedicalStatus = "valid" | "expired" | "unknown";
export type FitnessStatus = "valid" | "expired" | "missing";
export type PftStatus = "VALID" | "EXPIRING_SOON" | "EXPIRED" | "MISSING";

export type PMEStatus = "MISSING" | "IN_PROGRESS" | "COMPLETE";

export type PMEState = {
  status: PMEStatus;
  /** Required course label for next promotion (if applicable) */
  course?: string;
  /** ISO date */
  completedOn?: string;
  /** Demo toggle */
  verified?: boolean;
};

export interface MedicalClearance {
  status: MedicalStatus;
  expiresAt?: string;
}

export interface PftState {
  status: PftStatus;
  score?: number;
  /** ISO test date */
  testDate?: string;
  /** Computed ISO expiration date (testDate + 6 months) */
  expiresOn?: string;
  /** Demo toggle from UI */
  verified?: boolean;
}

export interface CftState {
  status: FitnessStatus;
  score?: number;
  date?: string;
}

export interface RifleState {
  status: FitnessStatus;
  score?: number;
}

export interface UserState {
  rankPayGrade: PayGrade;
  mos: string;
  /** ISO date or age in years for v1 */
  dob?: string;
  age?: number;
  tisMonths: number;
  tigMonths: number;
  hasAdverseAction: boolean;
  medicalClearance: MedicalClearance;
  pft: PftState;
  cft?: CftState;
  rifle?: RifleState;
  pme: PMEState;
  /**
   * 0..100 vault completeness for required docs (PFT, promotion, cert, orders).
   * Used for the top-level "Documentation" bucket in the 4-bucket score model.
   */
  docsCompleteness?: number;
  educationPoints?: number;
  trainingComplete?: boolean;
  /** 0..100 proxy for Tier B */
  mosProficiency?: number;
  /** Tier C: 0..100 */
  fitrepAvg?: number;
  leadershipIndex?: number;
  careerDiversityIndex?: number;
  awardsIndex?: number;
  /** First + last name set so profile is complete; adds up to 5% to score when true */
  profileComplete?: boolean;
}
