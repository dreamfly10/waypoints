import { storage } from "./storage";
import { addDays } from "date-fns";

// Simple helper to clear demo data: vault items, alerts, community milestones, and readiness cache.
export async function resetDemoData() {
  // Clear in-memory collections by re-seeding the storage instance.
  // For this prototype, we simulate a "fresh start" by recreating the storage singleton's internal state.
  // The easiest way is to clear alerts and vault items and reset profile readiness fields.

  // Clear alerts
  await storage.clearAlerts();

  // NOTE: For now, we rely on restarting the dev server to fully clear vault / community posts,
  // but this hook is ready to expand if deeper reset is needed.

  // Reset readiness-related profile fields
  const profile = await storage.getProfile();
  await storage.updateProfile({
    readinessScore: 0,
    readinessStatus: "incomplete",
    pftScore: 0,
    tisMonths: 60,
    tigMonths: 18,
    medicalClearanceExpiresAt: null,
    pmeComplete: false,
    lastReadinessCheckAt: null,
  } as any);
}

