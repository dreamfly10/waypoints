import type { Express } from "express";
import type { Server } from "http";
import { storage, VaultValidationError } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { resetDemoData } from "./demo";

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
      if (err instanceof VaultValidationError) {
        return res.status(400).json({ message: err.message, code: err.code });
      }
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  // Demo reset helper
  app.post("/api/demo/reset", async (_req, res) => {
    await resetDemoData();
    res.json({ ok: true });
  });

  // Alerts
  app.get(api.alerts.list.path, async (req, res) => {
    const includeResolved = req.query.includeResolved === 'true';
    let alerts = await storage.getAlerts(undefined, { includeResolved });
    if (alerts.length === 0) {
      await storage.recalculateReadiness(1);
      alerts = await storage.getAlerts(undefined, { includeResolved });
    }
    res.json(alerts);
  });

  app.post(api.alerts.resolve.path, async (req, res) => {
    try {
      const { alertId } = api.alerts.resolve.input.parse(req.body);
      const alert = await storage.resolveAlert(alertId);
      if (!alert) return res.status(404).json({ message: 'Alert not found' });
      res.json(alert);
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

  // Readiness check (PRD: weekly "Check Needed" tracking)
  app.post(api.readiness.check.path, async (_req, res) => {
    await storage.recordReadinessCheck();
    res.json({ ok: true });
  });

  // Readiness result (tiered engine: score, components, nextBestActions)
  app.get(api.readiness.get.path, async (_req, res) => {
    const result = await storage.getReadinessResult();
    res.json(result);
  });

  // Community
  app.get(api.community.list.path, async (req, res) => {
    const posts = await storage.getCommunityPosts();
    res.json(posts);
  });

  app.post(api.community.create.path, async (req, res) => {
    try {
      const input = api.community.create.input.parse(req.body);
      const profileId = input.profileId ?? 1;

      if (input.type === "milestone") {
        const profile = await storage.getProfile(profileId);
        if (profile.readinessStatus !== "active") {
          return res.status(400).json({
            message: "Complete your Readiness (unlock your score with required documents) to share milestones.",
          });
        }
        const eventType = (input as any).milestoneEventType ?? "readiness_improved";
        const duplicate = await storage.hasDuplicateMilestone(profileId, eventType);
        if (duplicate) {
          return res.status(400).json({
            message: "You have already shared this milestone today.",
          });
        }
        const referralCode = `ref-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
        const post = await storage.createCommunityPost({
          ...input,
          profileId,
          milestoneEventType: eventType,
          referralCode,
          privacy: (input as any).privacy ?? "public",
        });
        return res.status(201).json(post);
      }

      const post = await storage.createCommunityPost({ ...input, profileId });
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

  // Advisor (PRD: context injection, guardrails, empty vault limited)
  app.post(api.advisor.ask.path, async (req, res) => {
    try {
      const { query, attachedVaultItemId } = api.advisor.ask.input.parse(req.body);
      const profile = await storage.getProfile();
      const vaultItems = await storage.getVaultItems();
      const alerts = await storage.getAlerts();

      const lowerQuery = query.toLowerCase();
      const isAdvancedRequest =
        lowerQuery.includes("promotion") ||
        lowerQuery.includes("advanced") ||
        lowerQuery.includes("strategy") ||
        lowerQuery.includes("detailed");
      const isBenchmarkingRequest =
        lowerQuery.includes("percentile") || lowerQuery.includes("benchmarking");

      // PRD: Empty vault or incomplete readiness → limited generic response only
      const vaultEmpty = !vaultItems.length;
      const readinessIncomplete = profile.readinessStatus === 'incomplete';
      if (vaultEmpty || readinessIncomplete) {
        const msg =
          vaultEmpty && readinessIncomplete
            ? "Add documents to your Career Vault to unlock personalized advice. Upload at least 2 documents (or 1 PFT + 1 promotion-related) to get started."
            : "Complete your Vault to unlock your Readiness Score and get personalized advice.";
        return res.json({
          response: msg + " This is not medical or official regulatory advice—always confirm with your chain of command.",
          suggestions: ["What documents do I need?", "How do I improve my readiness?"],
        });
      }

      // Usage-based gating: 50 free advisor checks per profile (non-Pro)
      const FREE_TOKENS = 50;
      const used = (profile as any).advisorTokensUsed ?? 0;
      const remaining = Math.max(0, FREE_TOKENS - used);

      if (remaining <= 0 && !profile.isPro) {
        return res.status(403).json({
          message: "You've used your 50 free Advisor checks. Upgrade to Pro to keep getting tailored guidance.",
          requiresPro: true,
          tokensRemaining: 0,
        });
      }

      if ((isAdvancedRequest || isBenchmarkingRequest) && !profile.isPro) {
        return res.status(403).json({
          message: isBenchmarkingRequest
            ? "Peer benchmarking is a Pro feature. Unlock to see how you rank against peers."
            : "Detailed career strategy requires Waypoints Pro.",
          requiresPro: true,
          tokensRemaining: remaining,
        });
      }

      const missingItems = alerts
        .filter((a) => a.actionType === "upload" && !a.resolvedAt)
        .map((a) => a.relatedVaultType)
        .filter(Boolean);
      const tigStatus =
        profile.tigMonths != null
          ? `${profile.tigMonths} months TIG`
          : "TIG not set";
      const pftPercentile =
        profile.pftScore >= 285 ? "top 15%" : profile.pftScore >= 250 ? "above average" : "building";

      let response = "";
      const attachedItem = attachedVaultItemId
        ? vaultItems.find((i) => i.id === attachedVaultItemId)
        : null;

      const guardrail =
        " This is not official regulatory or medical advice; outcomes depend on board and command decisions.";

      if (lowerQuery.includes("percentile") || lowerQuery.includes("benchmarking")) {
        response = `Based on your PFT score of ${profile.pftScore}, you are currently in the ${pftPercentile} range for ${profile.rank}s in the ${profile.branch}. Your MOS (${profile.mos}) average is 245. TIG: ${tigStatus}.${guardrail}`;
      } else if (attachedItem) {
        response = `I've analyzed your attached ${attachedItem.type} document: "${attachedItem.title}". `;
        if (attachedItem.type === "pft") {
          response += `Your score of ${profile.pftScore} is solid. To hit the next tier, focus on your run time. `;
        } else {
          response += `This helps confirm your record. `;
        }
        response += `Missing: ${missingItems.join(", ") || "none"}.${guardrail}`;
      } else if (isAdvancedRequest) {
        response = `As a ${profile.rank} (${profile.mos}), your readiness is ${profile.readinessScore}%. PFT: ${profile.pftScore}; ${tigStatus}. Address these to strengthen your packet: ${missingItems.join(", ") || "none"}.${guardrail}`;
      } else if (lowerQuery.includes("readiness") || lowerQuery.includes("score")) {
        response = `Your readiness score is ${profile.readinessScore}%. It uses your Vault completeness, PFT (${profile.pftScore}), and TIG. Missing: ${missingItems.join(", ") || "none"}.${guardrail}`;
      } else {
        response = `I'm your Waypoints Advisor. Your PFT is ${profile.pftScore}, readiness ${profile.readinessScore}%, ${tigStatus}. Ask about promotion strategy, readiness, or peer benchmarking.${guardrail}`;
      }

      const suggestions = [
        "What is my promotion strategy?",
        "How do I improve my readiness?",
        "Show my peer benchmarking",
      ];

      // Increment usage count for non-Pro profiles on successful responses
      if (!profile.isPro) {
        await storage.updateProfile({ advisorTokensUsed: used + 1 }, profile.id);
      }

      res.json({ response, suggestions, tokensRemaining: Math.max(0, remaining - 1) });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      throw err;
    }
  });

  return httpServer;
}
