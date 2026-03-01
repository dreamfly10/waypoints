import { z } from "zod";
import { pgTable, text, serial, integer, boolean, json } from "drizzle-orm/pg-core";
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
  type: text("type").notNull(), // e.g., 'evaluation', 'training', 'medical'
  date: text("date").notNull(),
  extractedFields: json("extracted_fields").notNull(),
});

export const alerts = pgTable("alerts", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").notNull(),
  type: text("type").notNull(), // 'warning', 'info', 'success'
  message: text("message").notNull(),
  date: text("date").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
});

export const communityPosts = pgTable("community_posts", {
  id: serial("id").primaryKey(),
  author: text("author").notNull(),
  content: text("content").notNull(),
  date: text("date").notNull(),
  likes: integer("likes").default(0).notNull(),
});

export const insertProfileSchema = createInsertSchema(profiles).omit({ id: true });
export const insertVaultItemSchema = createInsertSchema(vaultItems).omit({ id: true });
export const insertAlertSchema = createInsertSchema(alerts).omit({ id: true });
export const insertCommunityPostSchema = createInsertSchema(communityPosts).omit({ id: true });

export type Profile = typeof profiles.$inferSelect;
export type InsertProfile = z.infer<typeof insertProfileSchema>;

export type VaultItem = typeof vaultItems.$inferSelect;
export type InsertVaultItem = z.infer<typeof insertVaultItemSchema>;

export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = z.infer<typeof insertAlertSchema>;

export type CommunityPost = typeof communityPosts.$inferSelect;
export type InsertCommunityPost = z.infer<typeof insertCommunityPostSchema>;
