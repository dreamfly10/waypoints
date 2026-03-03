import { storage } from "./storage";

/** Reset all data to initial demo state: profile (including isPro), vault, alerts, community. */
export async function resetDemoData() {
  await storage.resetToInitialDemoState();
}
