import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Profile
  app.get(api.profile.get.path, async (req, res) => {
    const profile = await storage.getProfile();
    res.json(profile);
  });

  app.put(api.profile.update.path, async (req, res) => {
    try {
      const input = api.profile.update.input.parse(req.body);
      const profile = await storage.updateProfile(input);
      res.json(profile);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  // Vault
  app.get(api.vault.list.path, async (req, res) => {
    const items = await storage.getVaultItems();
    res.json(items);
  });

  app.post(api.vault.create.path, async (req, res) => {
    try {
      const input = api.vault.create.input.parse(req.body);
      const item = await storage.createVaultItem(input);
      res.status(201).json(item);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  // Alerts
  app.get(api.alerts.list.path, async (req, res) => {
    const alerts = await storage.getAlerts();
    res.json(alerts);
  });

  // Community
  app.get(api.community.list.path, async (req, res) => {
    const posts = await storage.getCommunityPosts();
    res.json(posts);
  });

  app.post(api.community.create.path, async (req, res) => {
    try {
      const input = api.community.create.input.parse(req.body);
      const post = await storage.createCommunityPost(input);
      res.status(201).json(post);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  // Advisor
  app.post(api.advisor.ask.path, async (req, res) => {
    try {
      const { query } = api.advisor.ask.input.parse(req.body);
      const profile = await storage.getProfile();
      
      const lowerQuery = query.toLowerCase();
      const isAdvancedRequest = lowerQuery.includes("promotion") || 
                                lowerQuery.includes("advanced") || 
                                lowerQuery.includes("strategy") ||
                                lowerQuery.includes("detailed");
                                
      if (isAdvancedRequest && !profile.isPro) {
        return res.status(403).json({ 
          message: "This advanced career strategy requires Waypoints Pro.", 
          requiresPro: true 
        });
      }

      // Mock responses based on profile data
      let response = "I can help with that. ";
      
      if (isAdvancedRequest) {
        response = `As a ${profile.rank} in the ${profile.branch} (MOS ${profile.mos}), your next promotion requires focusing on key leadership billets. Given your PFT score of ${profile.pftScore}, maintaining top physical readiness is crucial. Try completing advanced NCO courses this year. Your readiness score is currently ${profile.readinessScore}%.`;
      } else if (lowerQuery.includes("readiness") || lowerQuery.includes("score")) {
        response = `Your current readiness score is ${profile.readinessScore}%. Your PFT score of ${profile.pftScore} contributes to this. ${profile.readinessScore >= 95 && !profile.isPro ? "You've reached the free tier cap. Go Pro to reach 100%!" : ""}`;
      } else {
        response = `Based on your profile as a ${profile.rank}, I recommend focusing on your immediate readiness requirements. Let me know if you want detailed promotion strategies!`;
      }

      res.json({ response });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  return httpServer;
}
