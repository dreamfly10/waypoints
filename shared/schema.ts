import { z } from "zod";
import { pgTable, text, serial, integer, boolean, json, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

// Enlisted ranks E1–E9 per PRD v1 (Officer out of scope)
export const ENLISTED_RANKS = ["E1", "E2", "E3", "E4", "E5", "E6", "E7", "E8", "E9"] as const;

// PRD document types: PFT Scorecard, Promotion Letter, Fitness Report, Training Certification, Medical Clearance, Awards, Orders
export const VAULT_DOCUMENT_TYPES = [
  "pft",
  "promotion_letter",
  "fitness_report",
  "cert",
  "pme_cert",
  "medical_clearance",
  "awards",
  "orders",
  "other",
] as const;

export const profiles = pgTable("profiles", {
  id: serial("id").primaryKey(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  avatarUrl: text("avatar_url"),
  branch: text("branch").notNull(),
  rank: text("rank").notNull(),
  mos: text("mos").notNull(),
  isPro: boolean("is_pro").default(false).notNull(),
  readinessScore: integer("readiness_score").default(0).notNull(),
  /** When activation threshold not met, readinessStatus = 'incomplete' and score is 0 */
  readinessStatus: text("readiness_status").default("incomplete").notNull(), // 'incomplete' | 'active'
  pftScore: integer("pft_score").default(0).notNull(),
  vaultPassword: text("vault_password"),
  vaultLockEnabled: boolean("vault_lock_enabled").default(false).notNull(),
  // PRD: TIS, TIG, medical, PME
  tisMonths: integer("tis_months"),
  tigMonths: integer("tig_months"),
  dateOfBirth: text("date_of_birth"), // ISO date for age / PFT percentile
  medicalClearanceExpiresAt: text("medical_clearance_expires_at"),
  pmeComplete: boolean("pme_complete").default(false).notNull(),
  lastReadinessCheckAt: text("last_readiness_check_at"), // ISO date for weekly "Check Needed"
  advisorTokensUsed: integer("advisor_tokens_used").default(0).notNull(),
});

export const vaultItems = pgTable("vault_items", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").notNull(),
  title: text("title").notNull(),
  type: text("type").notNull(),
  date: text("date").notNull(),
  expiresAt: text("expires_at"),
  extractedFields: json("extracted_fields").notNull(),
  verificationStatus: text("verification_status").default("pending").notNull(), // 'pending' | 'verified' | 'rejected'
  source: text("source").default("manual_upload").notNull(), // 'manual_upload' | 'system_generated'
  uploadTimestamp: timestamp("upload_timestamp").defaultNow().notNull(),
});

export const alerts = pgTable("alerts", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").notNull(),
  severity: text("severity").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  dueDate: text("due_date"),
  actionType: text("action_type"),
  relatedVaultType: text("related_vault_type"),
  isRead: boolean("is_read").default(false).notNull(),
  resolvedAt: timestamp("resolved_at"),
});

export const communityPosts = pgTable("community_posts", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").default(1).notNull(),
  author: text("author").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  type: text("type").notNull(),
  milestoneCard: json("milestone_card"),
  milestoneEventType: text("milestone_event_type"), // 'readiness_improved' | 'promotion_achieved' | 'certification_completed' | 'pft_personal_best'
  privacy: text("privacy").default("public").notNull(), // 'public' | 'unit_only' | 'private'
  referralCode: text("referral_code"),
  likes: integer("likes").default(0).notNull(),
});

export const insertProfileSchema = createInsertSchema(profiles).omit({ id: true });
export const insertVaultItemSchema = createInsertSchema(vaultItems).omit({ id: true });
export const insertAlertSchema = createInsertSchema(alerts).omit({ id: true });
export const insertCommunityPostSchema = createInsertSchema(communityPosts).omit({ id: true, createdAt: true });

export type Profile = typeof profiles.$inferSelect;
export type InsertProfile = z.infer<typeof insertProfileSchema>;

export type VaultItem = typeof vaultItems.$inferSelect;
export type InsertVaultItem = z.infer<typeof insertVaultItemSchema>;

export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = z.infer<typeof insertAlertSchema>;

export type CommunityPost = typeof communityPosts.$inferSelect;
export type InsertCommunityPost = z.infer<typeof insertCommunityPostSchema>;
