import { z } from "zod";
import { pgTable, text, serial, integer, boolean, json, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const profiles = pgTable("profiles", {
  id: serial("id").primaryKey(),
  branch: text("branch").notNull(),
  rank: text("rank").notNull(),
  mos: text("mos").notNull(),
  isPro: boolean("is_pro").default(false).notNull(),
  readinessScore: integer("readiness_score").default(0).notNull(),
  pftScore: integer("pft_score").default(0).notNull(),
});

export const vaultItems = pgTable("vault_items", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").notNull(),
  title: text("title").notNull(),
  type: text("type").notNull(), // 'pft', 'cert', 'promotion_letter', 'orders', 'other'
  date: text("date").notNull(),
  expiresAt: text("expires_at"),
  extractedFields: json("extracted_fields").notNull(),
});

export const alerts = pgTable("alerts", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").notNull(),
  severity: text("severity").notNull(), // 'high', 'medium', 'low'
  title: text("title").notNull(),
  message: text("message").notNull(),
  dueDate: text("due_date"),
  actionType: text("action_type"), // 'upload', 'review', 'renew'
  relatedVaultType: text("related_vault_type"),
  isRead: boolean("is_read").default(false).notNull(),
});

export const communityPosts = pgTable("community_posts", {
  id: serial("id").primaryKey(),
  author: text("author").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  type: text("type").notNull(), // 'milestone', 'update', 'question'
  milestoneCard: json("milestone_card"), // { title: string, icon: string }
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
