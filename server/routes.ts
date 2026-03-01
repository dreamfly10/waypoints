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
      const { query, attachedVaultItemId } = api.advisor.ask.input.parse(req.body);
      const profile = await storage.getProfile();
      const vaultItems = await storage.getVaultItems();
      const alerts = await storage.getAlerts();
      
      const lowerQuery = query.toLowerCase();
      const isAdvancedRequest = lowerQuery.includes("promotion") || 
                                lowerQuery.includes("advanced") || 
                                lowerQuery.includes("strategy") ||
                                lowerQuery.includes("detailed");
                                
      const isBenchmarkingRequest = lowerQuery.includes("percentile") || 
                                    lowerQuery.includes("benchmarking");

      if ((isAdvancedRequest || isBenchmarkingRequest) && !profile.isPro) {
        return res.status(403).json({ 
          message: isBenchmarkingRequest 
            ? "Peer benchmarking is a Pro feature. Unlock to see how you rank against peers." 
            : "Detailed career strategy requires Waypoints Pro.", 
          requiresPro: true 
        });
      }

      let response = "";
      const missingItems = alerts
        .filter(a => a.actionType === 'upload')
        .map(a => a.relatedVaultType)
        .filter(Boolean);

      const attachedItem = attachedVaultItemId 
        ? vaultItems.find(i => i.id === attachedVaultItemId)
        : null;

      if (lowerQuery.includes("percentile") || lowerQuery.includes("benchmarking")) {
        // Only reached if isPro is true
        response = `Based on your PFT score of ${profile.pftScore}, you are currently in the top 15% of ${profile.rank}s in the ${profile.branch}. Your MOS (${profile.mos}) average is 245. You are exceeding peer standards by ${profile.pftScore - 245} points.`;
      } else if (attachedItem) {
        response = `I've analyzed your attached ${attachedItem.type} document: "${attachedItem.title}". `;
        if (attachedItem.type === 'pft') {
          response += `Your score of ${profile.pftScore} is solid. To hit the next tier, focus on your run time. `;
        } else {
          response += `This helps confirm your record. `;
        }
        response += `Keep in mind you are still missing: ${missingItems.join(', ') || 'nothing'}.`;
      } else if (isAdvancedRequest) {
        response = `As a ${profile.rank} (${profile.mos}), your next promotion window opens in 6 months. Your PFT score (${profile.pftScore}) is competitive, but your readiness is at ${profile.readinessScore}%. You must address these missing items: ${missingItems.join(', ') || 'none'}.`;
      } else if (lowerQuery.includes("readiness") || lowerQuery.includes("score")) {
        response = `Your readiness score is ${profile.readinessScore}%. This is calculated from your Vault completeness and your PFT score of ${profile.pftScore}. Missing items: ${missingItems.join(', ') || 'none'}.`;
      } else {
        response = `I'm your Waypoints Advisor. You can ask about your promotion chances, readiness score, or peer benchmarking. Currently, your PFT is ${profile.pftScore} and readiness is ${profile.readinessScore}%.`;
      }

      const suggestions = [
        "What is my promotion strategy?",
        "How do I improve my readiness?",
        "Show my peer benchmarking"
      ];

      res.json({ response, suggestions });
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
