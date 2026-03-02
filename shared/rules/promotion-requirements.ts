export type EnlistedRank = "E1" | "E2" | "E3" | "E4" | "E5" | "E6" | "E7" | "E8" | "E9";

export type PromotionRequirement = {
  from: EnlistedRank;
  to: EnlistedRank;
  minTigMonths: number;

  // PME gate
  requiresPME: boolean;
  pmeLabel?: string;

  // Future gates (not used in prototype)
  // requiresNJPFree?: boolean;
  // requiresMedical?: boolean;
};

// Prototype USMC TIG + PME requirements for enlisted ranks.
export const USMC_PROMO_REQS: PromotionRequirement[] = [
  { from: "E1", to: "E2", minTigMonths: 6, requiresPME: false },
  { from: "E2", to: "E3", minTigMonths: 9, requiresPME: false },

  // PME begins as you get into NCO track (prototype assumption)
  {
    from: "E3",
    to: "E4",
    minTigMonths: 12,
    requiresPME: true,
    pmeLabel: "Lance Corporal Seminar",
  },
  {
    from: "E4",
    to: "E5",
    minTigMonths: 12,
    requiresPME: true,
    pmeLabel: "Corporals Course",
  },
  {
    from: "E5",
    to: "E6",
    minTigMonths: 24,
    requiresPME: true,
    pmeLabel: "Sergeants Course",
  },
  {
    from: "E6",
    to: "E7",
    minTigMonths: 36,
    requiresPME: true,
    pmeLabel: "Career Course",
  },
  {
    from: "E7",
    to: "E8",
    minTigMonths: 36,
    requiresPME: true,
    pmeLabel: "Advanced Course",
  },
  {
    from: "E8",
    to: "E9",
    minTigMonths: 36,
    requiresPME: true,
    pmeLabel: "Senior Enlisted Course",
  },
];

