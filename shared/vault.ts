/**
 * PRD business rules: vault activation, validation, PFT range.
 */

import type { VaultItem } from "./schema";

export const PFT_SCORE_MIN = 0;
export const PFT_SCORE_MAX = 300;

/** Activation: 2+ structured docs OR 1 PFT + 1 promotion-related */
export function isVaultActivated(items: VaultItem[]): boolean {
  const structured = items.filter(
    (i) =>
      i.type !== "other" &&
      (i.verificationStatus === "verified" || i.verificationStatus === "pending")
  );
  if (structured.length >= 2) return true;
  const hasPft = items.some((i) => i.type === "pft");
  const hasPromo = items.some(
    (i) => i.type === "promotion_letter" || i.type === "fitness_report"
  );
  return !!(hasPft && hasPromo);
}

export function isPromotionRelatedType(type: string): boolean {
  return (
    type === "promotion_letter" ||
    type === "fitness_report" ||
    type === "orders"
  );
}
