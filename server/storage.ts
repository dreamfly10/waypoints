import {
  type Profile,
  type InsertProfile,
  type VaultItem,
  type InsertVaultItem,
  type Alert,
  type InsertAlert,
  type CommunityPost,
  type InsertCommunityPost,
} from "@shared/schema";
import { VAULT_DOCUMENT_TYPES, ENLISTED_RANKS } from "@shared/schema";
import { isVaultActivated } from "@shared/vault";
import { PFT_SCORE_MIN, PFT_SCORE_MAX } from "@shared/vault";
import { computeReadiness, type ReadinessResult } from "@shared/readiness-engine";
import { computePftStatus } from "@shared/readiness-engine/pft";
import { computeEligibility } from "@shared/readiness-engine/eligibility";
import { mapToUserState } from "@shared/readiness-engine/map-to-user-state";
import { addDays, parseISO, differenceInDays } from "date-fns";

export class VaultValidationError extends Error {
  constructor(
    message: string,
    public code:
      | "UNSUPPORTED_TYPE"
      | "DUPLICATE"
      | "EXPIRATION_IN_PAST"
      | "INVALID_PFT_SCORE"
      | "MISSING_REQUIRED_FIELDS"
  ) {
    super(message);
    this.name = "VaultValidationError";
  }
}

export interface IStorage {
  getProfile(profileId?: number): Promise<Profile>;
  updateProfile(updates: Partial<InsertProfile>, profileId?: number): Promise<Profile>;
  getVaultItems(profileId?: number): Promise<VaultItem[]>;
  createVaultItem(item: InsertVaultItem): Promise<VaultItem>;
  getAlerts(profileId?: number, options?: { includeResolved?: boolean }): Promise<Alert[]>;
  createAlert(alert: InsertAlert): Promise<Alert>;
  resolveAlert(alertId: number): Promise<Alert | null>;
  clearAlerts(profileId?: number): Promise<void>;
  getCommunityPosts(): Promise<CommunityPost[]>;
  createCommunityPost(post: InsertCommunityPost): Promise<CommunityPost>;
  /** PRD: duplicate milestone = same profile + same milestoneEventType within same day */
  hasDuplicateMilestone(profileId: number, milestoneEventType: string): Promise<boolean>;
  recalculateReadiness(profileId?: number): Promise<void>;
  /** PRD: record that user checked readiness (for weekly "Check Needed") */
  recordReadinessCheck(profileId?: number): Promise<void>;
  /** Full readiness result (tier, components, nextBestActions) for UI explainability */
  getReadinessResult(profileId?: number): Promise<ReadinessResult | null>;
}

const ALERT_PRIORITY_ORDER = ["medical_clearance", "pft", "cert", "promotion_letter", "orders"] as const;
const MAX_ALERTS_PER_DAY = 10;

export class MemStorage implements IStorage {
  private profile: Profile;
  private vaultItems: Map<number, VaultItem>;
  private alerts: Map<number, Alert>;
  private communityPosts: Map<number, CommunityPost>;
  private milestones: { id: number; type: string; title: string; detail: string; createdAt: Date }[] = [];

  private vaultIdCounter = 1;
  private alertIdCounter = 1;
  private postIdCounter = 1;
  private milestoneIdCounter = 1;
  private lastReadinessResult: ReadinessResult | null = null;

  constructor() {
    this.vaultItems = new Map();
    this.alerts = new Map();
    this.communityPosts = new Map();

    this.profile = {
      id: 1,
      firstName: null,
      lastName: null,
      avatarUrl: null,
      branch: "Marine Corps",
      rank: "E5",
      mos: "0231",
      isPro: false,
      readinessScore: 0,
      readinessStatus: "incomplete",
      pftScore: 0,
      vaultPassword: null,
      vaultLockEnabled: false,
      tisMonths: 60,
      tigMonths: 18,
      dateOfBirth: null,
      medicalClearanceExpiresAt: null,
      pmeComplete: false,
      lastReadinessCheckAt: null,
      advisorTokensUsed: 0,
    };

    this.seedData();
  }

  private async seedData() {
    const certItem: VaultItem = {
      id: this.vaultIdCounter,
      profileId: 1,
      title: "Initial Cert",
      type: "cert",
      date: "2024-01-01",
      expiresAt: addDays(new Date(), 400).toISOString(), // > 60 days so no "Initial Cert Expiring" alert
      extractedFields: {},
      verificationStatus: "verified",
      source: "manual_upload",
      uploadTimestamp: new Date(),
    };
    this.vaultItems.set(this.vaultIdCounter, certItem);
    this.vaultIdCounter++;

    await this.createCommunityPost({
      profileId: 1,
      author: "CPT Miller",
      content: "Promotion list is out!",
      type: "milestone",
      milestoneCard: { title: "Promotion", icon: "Trophy" },
      likes: 12,
    });

    await this.recalculateReadiness(1);
  }

  async getProfile(profileId?: number): Promise<Profile> {
    if (profileId && profileId !== this.profile.id) {
      return this.profile;
    }
    return this.profile;
  }

  async updateProfile(updates: Partial<InsertProfile>, profileId?: number): Promise<Profile> {
    if (profileId != null && profileId !== this.profile.id) return this.profile;
    if (updates.rank && !ENLISTED_RANKS.includes(updates.rank as any)) {
      updates.rank = this.profile.rank;
    }
    this.profile = { ...this.profile, ...updates };

    // Invariant: TIG cannot exceed TIS (months). Clamp defensively server-side.
    const tis = Math.max(0, this.profile.tisMonths ?? 0);
    const tig = Math.max(0, this.profile.tigMonths ?? 0);
    this.profile.tisMonths = tis;
    this.profile.tigMonths = Math.min(tig, tis);

    await this.recalculateReadiness(this.profile.id);
    return this.profile;
  }

  async getVaultItems(profileId?: number): Promise<VaultItem[]> {
    const items = Array.from(this.vaultItems.values());
    const filtered = profileId ? items.filter((i) => i.profileId === profileId) : items;
    return filtered.reverse();
  }

  async createVaultItem(insertItem: InsertVaultItem): Promise<VaultItem> {
    const profileId = insertItem.profileId;
    const items = await this.getVaultItems(profileId);

    const validTypes = [...VAULT_DOCUMENT_TYPES];
    if (!validTypes.includes(insertItem.type as any)) {
      throw new VaultValidationError(
        `Unsupported document type. Allowed: ${validTypes.join(", ")}`,
        "UNSUPPORTED_TYPE"
      );
    }

    if (insertItem.expiresAt) {
      try {
        const exp = parseISO(insertItem.expiresAt);
        if (differenceInDays(exp, new Date()) < 0) {
          throw new VaultValidationError(
            "Expiration date cannot be in the past.",
            "EXPIRATION_IN_PAST"
          );
        }
      } catch (e) {
        if (e instanceof VaultValidationError) throw e;
        throw new VaultValidationError(
          "Invalid expiration date format.",
          "EXPIRATION_IN_PAST"
        );
      }
    }

    if (insertItem.type === "pft" && insertItem.extractedFields && typeof insertItem.extractedFields === "object") {
      const score = (insertItem.extractedFields as { score?: number }).score;
      if (typeof score === "number") {
        if (score < PFT_SCORE_MIN || score > PFT_SCORE_MAX) {
          throw new VaultValidationError(
            `PFT score must be between ${PFT_SCORE_MIN} and ${PFT_SCORE_MAX}.`,
            "INVALID_PFT_SCORE"
          );
        }
        this.profile.pftScore = score;
      }
    }

    if (insertItem.type === "pme_cert" && insertItem.extractedFields && typeof insertItem.extractedFields === "object") {
      const passed = (insertItem.extractedFields as { passed?: boolean }).passed;
      if (typeof passed === "boolean") {
        this.profile.pmeComplete = passed;
      }
    }

    const verificationStatus =
      insertItem.type === "pft" &&
      typeof (insertItem.extractedFields as any)?.score === "number"
        ? "verified"
        : "pending";
    const id = this.vaultIdCounter++;
    const item: VaultItem = {
      ...insertItem,
      id,
      expiresAt: insertItem.expiresAt ?? null,
      verificationStatus,
      source: (insertItem as any).source ?? "manual_upload",
      uploadTimestamp: (insertItem as any).uploadTimestamp ?? new Date(),
    };
    this.vaultItems.set(id, item);
    await this.recalculateReadiness(profileId);
    return item;
  }

  async getAlerts(profileId?: number, options?: { includeResolved?: boolean }): Promise<Alert[]> {
    let list = Array.from(this.alerts.values());
    if (profileId != null) list = list.filter((a) => a.profileId === profileId);
    if (!options?.includeResolved) list = list.filter((a) => !a.resolvedAt);
    return list.reverse();
  }

  async createAlert(insertAlert: InsertAlert): Promise<Alert> {
    const id = this.alertIdCounter++;
    const alert: Alert = {
      ...insertAlert,
      id,
      dueDate: insertAlert.dueDate ?? null,
      actionType: insertAlert.actionType ?? null,
      relatedVaultType: insertAlert.relatedVaultType ?? null,
      isRead: insertAlert.isRead ?? false,
      resolvedAt: (insertAlert as any).resolvedAt ?? null,
    };
    this.alerts.set(id, alert);
    return alert;
  }

  async resolveAlert(alertId: number): Promise<Alert | null> {
    const alert = this.alerts.get(alertId);
    if (!alert) return null;
    const updated = { ...alert, resolvedAt: new Date() };
    this.alerts.set(alertId, updated);
    await this.recalculateReadiness(alert.profileId);
    return updated;
  }

  async clearAlerts(profileId?: number): Promise<void> {
    if (profileId == null) {
      this.alerts.clear();
      return;
    }
    Array.from(this.alerts.entries()).forEach(([id, a]) => {
      if (a.profileId === profileId) this.alerts.delete(id);
    });
  }

  async getCommunityPosts(): Promise<CommunityPost[]> {
    return Array.from(this.communityPosts.values()).reverse();
  }

  async hasDuplicateMilestone(profileId: number, milestoneEventType: string): Promise<boolean> {
    const posts = Array.from(this.communityPosts.values());
    const today = new Date().toISOString().slice(0, 10);
    return posts.some(
      (p) =>
        p.profileId === profileId &&
        p.type === "milestone" &&
        p.milestoneEventType === milestoneEventType &&
        p.createdAt instanceof Date &&
        p.createdAt.toISOString().slice(0, 10) === today
    );
  }

  async createCommunityPost(insertPost: InsertCommunityPost): Promise<CommunityPost> {
    const id = this.postIdCounter++;
    const post: CommunityPost = {
      ...insertPost,
      id,
      profileId: insertPost.profileId ?? 1,
      privacy: insertPost.privacy ?? "public",
      milestoneCard: insertPost.milestoneCard ?? null,
      milestoneEventType: insertPost.milestoneEventType ?? null,
      referralCode: insertPost.referralCode ?? null,
      likes: insertPost.likes ?? 0,
      createdAt: new Date(),
    };
    this.communityPosts.set(id, post);
    return post;
  }

  private async createMilestoneIfNew(profileId: number, type: string, title: string, detail: string, milestoneEventType: string) {
    const now = new Date();
    // Dedup via existing milestone duplicate check (per day)
    const duplicate = await this.hasDuplicateMilestone(profileId, milestoneEventType);
    if (duplicate) return;

    const milestone = {
      id: this.milestoneIdCounter++,
      type,
      title,
      detail,
      createdAt: now,
    };
    this.milestones.push(milestone);

    await this.createCommunityPost({
      profileId,
      author: this.profile.rank ?? "Marine",
      content: detail,
      type: "milestone",
      milestoneCard: { title, score: this.profile.readinessScore, delta: undefined },
      milestoneEventType,
      privacy: "public",
    });
  }

  async recordReadinessCheck(profileId?: number): Promise<void> {
    if (profileId != null && profileId !== this.profile.id) return;
    this.profile = {
      ...this.profile,
      lastReadinessCheckAt: new Date().toISOString(),
    };
  }

  async recalculateReadiness(profileId?: number): Promise<void> {
    const pid = profileId ?? this.profile.id;
    const items = Array.from(this.vaultItems.values()).filter((i) => i.profileId === pid);
    const userState = mapToUserState(this.profile, items);

    if (!isVaultActivated(items)) {
      this.profile.readinessScore = 0;
      this.profile.readinessStatus = "incomplete";
      this.lastReadinessResult = null;
      // Fall through to create alerts so Action Items show full list from first load
    } else {
    this.profile.readinessStatus = "active";
    const previous = this.lastReadinessResult;
    const result = computeReadiness(userState, undefined, previous ?? undefined);

    // Milestones based on readiness & PFT changes
    if (previous) {
      const prevTotal = previous.rawTotal;
      const currTotal = result.rawTotal;
      const delta = currTotal - prevTotal;

      // A) Threshold crossings
      if (prevTotal < 65 && currTotal >= 65) {
        await this.createMilestoneIfNew(
          pid,
          "readiness_threshold_65",
          "On Track",
          `Readiness crossed 65% (${prevTotal} → ${currTotal}).`,
          "readiness_threshold_65"
        );
      }
      if (prevTotal < 85 && currTotal >= 85) {
        await this.createMilestoneIfNew(
          pid,
          "readiness_threshold_85",
          "Excellent Readiness",
          `Readiness crossed 85% (${prevTotal} → ${currTotal}).`,
          "readiness_threshold_85"
        );
      }

      // B) Big jump
      if (delta >= 10) {
        await this.createMilestoneIfNew(
          pid,
          "readiness_big_jump",
          "Big Readiness Jump",
          `Big jump in readiness (+${delta} points).`,
          "readiness_big_jump"
        );
      }

      // C) PFT improvement (if we can compare via debug.pftScoreUsed)
      const prevPft =
        (previous.debug as any)?.pftScoreUsed as number | undefined;
      const currPft =
        (result.debug as any)?.pftScoreUsed as number | undefined;
      if (
        typeof prevPft === "number" &&
        typeof currPft === "number" &&
        currPft - prevPft >= 20
      ) {
        const pftDelta = currPft - prevPft;
        await this.createMilestoneIfNew(
          pid,
          "pft_improved",
          "PFT Personal Best",
          `PFT improved by +${pftDelta} points (${prevPft} → ${currPft}).`,
          "pft_improved"
        );
      }
    }

    this.lastReadinessResult = result;
    this.profile.readinessScore = Math.min(result.score, 100);
    }

    await this.clearAlerts(pid);
    const now = new Date();
    const alertsToCreate: InsertAlert[] = [];

    // PFT-specific alerts (missing / expiring soon / expired)
    const pftDoc = items.find((i) => i.type === "pft");
    if (!pftDoc) {
      alertsToCreate.push({
        profileId: pid,
        severity: "high",
        title: "PFT Missing",
        message: "No PFT record found in Vault. Upload your latest scorecard.",
        dueDate: null,
        actionType: "upload",
        relatedVaultType: "pft",
        isRead: false,
      });
    } else {
      const { status, expiresOn } = computePftStatus(pftDoc.date);
      if (status === "EXPIRING_SOON") {
        alertsToCreate.push({
          profileId: pid,
          severity: "high",
          title: "PFT Expires Soon",
          message: "Your PFT record will expire soon. Consider scheduling a new test.",
          dueDate: expiresOn,
          actionType: "renew",
          relatedVaultType: "pft",
          isRead: false,
        });
      } else if (status === "EXPIRED") {
        alertsToCreate.push({
          profileId: pid,
          severity: "high",
          title: "PFT Expired",
          message: "Your PFT record has expired. Upload your latest scorecard.",
          dueDate: expiresOn,
          actionType: "renew",
          relatedVaultType: "pft",
          isRead: false,
        });
      }
    }

    // PFT low-score gate: keep action item until score >= 200
    if (
      userState.pft &&
      (userState.pft.status === "VALID" || userState.pft.status === "EXPIRING_SOON") &&
      typeof userState.pft.score === "number" &&
      userState.pft.score < 200
    ) {
      alertsToCreate.push({
        profileId: pid,
        severity: "high",
        title: "PFT below competitive standard",
        message: "Increase your PFT above 200 to unlock higher readiness tiers.",
        dueDate: null,
        actionType: "renew",
        relatedVaultType: "pft",
        isRead: false,
      });
    }

    // PME required (action item). Completed via Vault pass/fail record.
    const elig = computeEligibility({
      rank: userState.rankPayGrade as any,
      tigMonths: userState.tigMonths,
      pmeStatus: userState.pme.status,
    });
    if (elig.requiresPME && !elig.pmeComplete) {
      alertsToCreate.push({
        profileId: pid,
        severity: "medium",
        title: `PME required${elig.pmeLabel ? `: ${elig.pmeLabel}` : ""}`,
        message: elig.pmeLabel
          ? `Complete PME (${elig.pmeLabel}) to become board eligible.`
          : "Complete required PME to become board eligible.",
        dueDate: null,
        actionType: "complete_pme",
        relatedVaultType: "pme_cert",
        isRead: false,
      });
    }

    // Renew alert only when no other item of same type has a later expiry (so "expiring" goes away after uploading a newer doc)
    const itemsByType = new Map<string, VaultItem[]>();
    for (const item of items) {
      if (!itemsByType.has(item.type)) itemsByType.set(item.type, []);
      itemsByType.get(item.type)!.push(item);
    }
    for (const [type, typeItems] of Array.from(itemsByType.entries())) {
      if (type === "pft") continue; // handled above
      const withExpiry = typeItems
        .filter((i: VaultItem) => i.expiresAt)
        .map((i: VaultItem) => ({ item: i, days: differenceInDays(parseISO(i.expiresAt!), now) }))
        .filter(({ days }: { days: number }) => days > 0 && days <= 60);
      if (withExpiry.length === 0) continue;
      const hasNewerOfType = typeItems.some((i: VaultItem) => {
        if (!i.expiresAt) return true;
        try {
          return differenceInDays(parseISO(i.expiresAt!), now) > 60;
        } catch {
          return true;
        }
      });
      if (hasNewerOfType) continue;
      const soonest = withExpiry.sort((a: { days: number }, b: { days: number }) => a.days - b.days)[0];
      alertsToCreate.push({
        profileId: pid,
        severity: type === "medical_clearance" ? "high" : "medium",
        title: `${soonest.item.title} Expiring`,
        message: `Your ${type} expires in ${soonest.days} days.`,
        dueDate: soonest.item.expiresAt,
        actionType: "renew",
        relatedVaultType: type,
        isRead: false,
      });
    }

    if (!items.some((i) => i.type === "promotion_letter" || i.type === "fitness_report")) {
      alertsToCreate.push({
        profileId: pid,
        severity: "low",
        title: "Promotion Letter Missing",
        message: "Consider uploading your latest promotion letter for better readiness tracking.",
        dueDate: null,
        actionType: "upload",
        relatedVaultType: "promotion_letter",
        isRead: false,
      });
    }

    if (!items.some((i) => i.type === "cert")) {
      alertsToCreate.push({
        profileId: pid,
        severity: "medium",
        title: "Training Certification",
        message: "Upload a training or certification document to improve readiness.",
        dueDate: null,
        actionType: "upload",
        relatedVaultType: "cert",
        isRead: false,
      });
    }

    if (!items.some((i) => i.type === "medical_clearance")) {
      alertsToCreate.push({
        profileId: pid,
        severity: "high",
        title: "Medical Clearance",
        message: "Upload your medical clearance for readiness.",
        dueDate: null,
        actionType: "upload",
        relatedVaultType: "medical_clearance",
        isRead: false,
      });
    }

    if (!items.some((i) => i.type === "orders")) {
      alertsToCreate.push({
        profileId: pid,
        severity: "low",
        title: "Orders",
        message: "Upload orders to complete your documentation.",
        dueDate: null,
        actionType: "upload",
        relatedVaultType: "orders",
        isRead: false,
      });
    }

    const byPriority = [...alertsToCreate].sort((a, b) => {
      const ai = ALERT_PRIORITY_ORDER.indexOf((a.relatedVaultType as any) ?? "z");
      const bi = ALERT_PRIORITY_ORDER.indexOf((b.relatedVaultType as any) ?? "z");
      return ai - bi;
    });
    const toCreate = byPriority.slice(0, MAX_ALERTS_PER_DAY);
    for (const a of toCreate) {
      await this.createAlert(a);
    }
  }

  async getReadinessResult(profileId?: number): Promise<ReadinessResult | null> {
    if (profileId != null && profileId !== this.profile.id) return null;
    if (this.profile.readinessStatus !== "active") return null;
    if (this.lastReadinessResult) return this.lastReadinessResult;
    const items = Array.from(this.vaultItems.values()).filter((i) => i.profileId === this.profile.id);
    const userState = mapToUserState(this.profile, items);
    const result = computeReadiness(userState, undefined, this.lastReadinessResult ?? undefined);
    this.lastReadinessResult = result;
    return result;
  }
}

export const storage = new MemStorage();
