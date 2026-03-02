import { addMonths, parseISO } from "date-fns";

export type PftStatus = "VALID" | "EXPIRING_SOON" | "EXPIRED";

export interface PftRecord {
  score: number;
  testDate: string; // ISO date
  verified: boolean;
  status: PftStatus;
  expiresOn: string; // ISO date
}

export function computePftStatus(
  testDateISO: string,
  now: Date = new Date()
): { status: PftStatus; expiresOn: string } {
  try {
    const testDate = parseISO(testDateISO);
    const expires = addMonths(testDate, 6);
    const expiringSoonThreshold = addMonths(testDate, 5);

    if (now > expires) {
      return { status: "EXPIRED", expiresOn: expires.toISOString() };
    }
    if (now >= expiringSoonThreshold) {
      return { status: "EXPIRING_SOON", expiresOn: expires.toISOString() };
    }
    return { status: "VALID", expiresOn: expires.toISOString() };
  } catch {
    // Fallback: treat as valid for 6 months from now if date parsing fails
    const fallbackExpires = addMonths(now, 6).toISOString();
    return { status: "VALID", expiresOn: fallbackExpires };
  }
}

