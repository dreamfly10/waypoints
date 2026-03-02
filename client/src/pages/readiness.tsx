import { useProfile, useUpdateProfile } from "@/hooks/use-profile";
import { useAlerts } from "@/hooks/use-alerts";
import { useVaultItems } from "@/hooks/use-vault";
import { useReadinessResult } from "@/hooks/use-readiness-result";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
  Trophy,
  Calendar,
  DollarSign,
} from "lucide-react";
import React, { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { computeBasePayMonthly, formatMoney, getYearsOfServiceBracketIdFromTisMonths, type EnlistedRank } from "@/lib/pay";
import { getNextRank } from "@shared/readiness-engine/eligibility";

type PromotionRequirement = {
  from: EnlistedRank;
  to: EnlistedRank;
  minTigMonths: number;
  label: string;
};

const USMC_TIG_REQUIREMENTS: PromotionRequirement[] = [
  { from: "E1", to: "E2", minTigMonths: 6, label: "E-1 → E-2" },
  { from: "E2", to: "E3", minTigMonths: 9, label: "E-2 → E-3" },
  { from: "E3", to: "E4", minTigMonths: 12, label: "E-3 → E-4" },
  { from: "E4", to: "E5", minTigMonths: 12, label: "E-4 → E-5" },
  { from: "E5", to: "E6", minTigMonths: 24, label: "E-5 → E-6" },
  { from: "E6", to: "E7", minTigMonths: 36, label: "E-6 → E-7" },
  { from: "E7", to: "E8", minTigMonths: 36, label: "E-7 → E-8" },
  { from: "E8", to: "E9", minTigMonths: 36, label: "E-8 → E-9" },
];

export default function Readiness() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: alerts, isLoading: alertsLoading } = useAlerts();
  const { data: vaultItems } = useVaultItems();
  const { data: readinessResult } = useReadinessResult();
  const { mutate: recordReadinessCheck } = useMutation({
    mutationFn: async () => {
      const res = await fetch(api.readiness.check.path, { method: api.readiness.check.method, credentials: "include" });
      if (!res.ok) throw new Error("Failed to record check");
      return api.readiness.check.responses[200].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.profile.get.path] }),
  });

  React.useEffect(() => {
    if (profile?.readinessStatus === "active") recordReadinessCheck();
  }, [profile?.readinessStatus]);

  const currentScore = profile?.readinessScore ?? 0;
  const isIncomplete = profile?.readinessStatus === "incomplete";
  const pftScore = profile?.pftScore ?? 0;

  const [milestoneOpen, setMilestoneOpen] = useState(false);
  const [milestoneLevel, setMilestoneLevel] = useState<70 | 80 | 90 | null>(null);

  useEffect(() => {
    if (!readinessResult || isIncomplete) return;
    const delta = readinessResult.delta ?? 0;
    const previousScore = currentScore - delta;

    const thresholds: Array<70 | 80 | 90> = [70, 80, 90];
    const storageKey = "wp_readiness_milestones_shown";
    let shown: Record<string, boolean> = {};
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) shown = JSON.parse(raw);
    } catch {
      shown = {};
    }

    let crossed: 70 | 80 | 90 | null = null;
    // Prefer higher milestone if multiple are satisfied.
    for (const t of thresholds) {
      if (currentScore >= t && !shown[String(t)] && (delta === 0 || previousScore < t)) {
        crossed = t;
      }
    }

    if (crossed) {
      setMilestoneLevel(crossed);
      setMilestoneOpen(true);
      shown[String(crossed)] = true;
      if (crossed === 90) shown["80"] = true;
      try {
        localStorage.setItem(storageKey, JSON.stringify(shown));
      } catch {
        // ignore
      }
    }
  }, [currentScore, isIncomplete, readinessResult]);

  const fitnessNudge = useMemo(() => {
    if (!Number.isFinite(pftScore) || pftScore <= 0) {
      return "Add a PFT record to impact up to 30 points of readiness.";
    }

    if (pftScore < 200) {
      return `Increase PFT above 200 to unlock higher readiness tiers (need ${200 - pftScore} points).`;
    }

    const tiers = [
      { max: 200, norm: 20, nextMin: 201, nextNorm: 45 },
      { max: 235, norm: 45, nextMin: 236, nextNorm: 65 },
      { max: 265, norm: 65, nextMin: 266, nextNorm: 80 },
      { max: 285, norm: 80, nextMin: 286, nextNorm: 95 },
      { max: 300, norm: 95, nextMin: null as number | null, nextNorm: null as number | null },
    ];

    const t = tiers.find((x) => pftScore <= x.max) ?? tiers[tiers.length - 1];
    if (t.nextMin == null || t.nextNorm == null) {
      return "You're in the top PFT tier—maintain performance to stay there.";
    }

    const pointsToNext = Math.max(0, t.nextMin - pftScore);
    const readinessGain = Math.round(((t.nextNorm - t.norm) / 100) * 30);
    return `Improve by ${pointsToNext} points to add ~${readinessGain} readiness points.`;
  }, [pftScore]);

  const missingItems = alerts?.filter(a => a.severity === 'high' || a.severity === 'medium') || [];
  const docCompletion = useMemo(() => {
    const totalRequired = 4; // PFT, Promotion, Cert, Orders
    const types = new Set(vaultItems?.map(i => i.type));
    const count = Array.from(types).filter(t => ['pft', 'promotion_letter', 'cert', 'orders'].includes(t)).length;
    return Math.round((count / totalRequired) * 100);
  }, [vaultItems]);

  const tigMonths = profile?.tigMonths ?? 0;
  const currentRank = (profile?.rank as EnlistedRank | undefined) ?? undefined;
  const tigRequirement = currentRank
    ? USMC_TIG_REQUIREMENTS.find((r) => r.from === currentRank)
    : undefined;
  const requiredTig = tigRequirement?.minTigMonths ?? null;
  const hasRequiredTig = requiredTig != null ? tigMonths >= requiredTig : false;
  const boardQualified = hasRequiredTig && !!profile?.pmeComplete;

  const financeProjection = useMemo(() => {
    const rank = (profile?.rank as EnlistedRank | undefined) ?? "E1";
    const next = getNextRank(rank) ?? rank;
    const yos = getYearsOfServiceBracketIdFromTisMonths(profile?.tisMonths);
    const current = computeBasePayMonthly(rank, yos);
    const projected = computeBasePayMonthly(next as EnlistedRank, yos);
    const diff = projected - current;
    return { rank, next: next as EnlistedRank, current, projected, diff };
  }, [profile?.rank, profile?.tisMonths]);

  if (profileLoading || alertsLoading) {
    return (
      <AppLayout>
        <div className="space-y-6 p-4">
          <Skeleton className="h-12 w-3/4 mx-auto" />
          <div className="flex justify-center py-8">
            <Skeleton className="h-48 w-48 rounded-full" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-32 w-full rounded-2xl" />
            <Skeleton className="h-32 w-full rounded-2xl" />
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 animate-in fade-in duration-700 pb-20">
        
        {/* Intelligence Hub Header */}
        <div className="pt-2 text-center space-y-4">
          <div className="inline-block">
            <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">
              Readiness Hub
            </h1>
            <p className="text-slate-500 dark:text-slate-400 font-bold text-xs mt-1 uppercase tracking-widest">
              Career Intelligence & Analytics
            </p>
          </div>

          {/* Animated Composite Score Circle or Incomplete */}
          {isIncomplete ? (
            <div className="relative flex flex-col items-center justify-center py-4">
              <div className="w-48 h-48 rounded-full border-4 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center">
                <span className="text-2xl font-black uppercase text-slate-400 dark:text-slate-500">Incomplete</span>
              </div>
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-4 text-center max-w-[280px]">
                Upload at least 2 documents, or 1 PFT + 1 promotion-related document, to unlock your Readiness Score.
              </p>
            </div>
          ) : (
            <div className="relative flex items-center justify-center py-4">
              <svg className="w-48 h-48 transform -rotate-90">
                <circle
                  cx="96"
                  cy="96"
                  r="88"
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="transparent"
                  className="text-slate-100 dark:text-slate-800"
                />
                <motion.circle
                  cx="96"
                  cy="96"
                  r="88"
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="transparent"
                  strokeDasharray={553}
                  initial={{ strokeDashoffset: 553 }}
                  animate={{ strokeDashoffset: 553 - (553 * currentScore) / 100 }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  strokeLinecap="round"
                  className="text-emerald-500 transition-all"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <motion.span
                  key={currentScore}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-6xl font-black text-slate-900 dark:text-white tracking-tighter"
                >
                  {currentScore}
                </motion.span>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Composite Score</span>
                {readinessResult?.capApplied && (
                  <Badge variant="outline" className="mt-1 text-[9px] font-black uppercase tracking-widest border-amber-500/40 text-amber-600 bg-amber-500/5">
                    Capped
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Tiered engine: cap applied + next best actions */}
        {readinessResult && (readinessResult.capApplied || readinessResult.nextBestActions?.length) && (
          <div className="px-4 space-y-3">
            {readinessResult.capApplied && (
              <p className="text-xs font-bold text-amber-600 dark:text-amber-400">
                {(() => {
                  const reasons = readinessResult.capApplied?.reasons ?? [];
                  const reasonText = reasons
                    .map((r) => r.replace(/_/g, " ").toLowerCase())
                    .join(", ");
                  return `Score capped at ${readinessResult.capApplied?.capValue}%${reasonText ? ` (${reasonText})` : ""}`;
                })()}
              </p>
            )}
            {readinessResult.nextBestActions?.length > 0 && (
              <Card className="card-ios border-none shadow-sm">
                <CardContent className="p-4">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white mb-2">Next best actions</h3>
                  <ul className="space-y-1.5">
                    {readinessResult.nextBestActions.map((action, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                        <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-[10px] font-black">{i + 1}</span>
                        {action}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Score breakdown (bucket points) */}
        {readinessResult?.breakdown && (
          <div className="px-4">
            <Card className="card-ios border-none shadow-sm">
              <CardContent className="p-4">
                <h3 className="text-sm font-black text-slate-900 dark:text-white mb-3">Score breakdown</h3>
                <div className="space-y-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                  <div className="flex items-center justify-between">
                    <span>Documentation</span>
                    <span className="font-black">{readinessResult.breakdown.documentation.pointsEarned} / {readinessResult.breakdown.documentation.pointsMax}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Fitness</span>
                    <span className="font-black">{readinessResult.breakdown.fitness.pointsEarned} / {readinessResult.breakdown.fitness.pointsMax}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Eligibility</span>
                    <span className="font-black">{readinessResult.breakdown.eligibility.pointsEarned} / {readinessResult.breakdown.eligibility.pointsMax}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Admin</span>
                    <span className="font-black">{readinessResult.breakdown.admin.pointsEarned} / {readinessResult.breakdown.admin.pointsMax}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Explanation */}
        {readinessResult?.explanation?.length && (
          <div className="px-4 mt-3">
            <Card className="card-ios border-none shadow-sm">
              <CardContent className="p-4">
                <h3 className="text-sm font-black text-slate-900 dark:text-white mb-2">Explanation</h3>
                <ul className="space-y-1.5">
                  {readinessResult.explanation.map((line, idx) => (
                    <li key={idx} className="text-xs font-bold text-slate-700 dark:text-slate-300 flex gap-2">
                      <span className="mt-[2px] h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0" />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Section Cards */}
        <div className="grid gap-4 px-4">
          
          {/* 1) Documentation Completeness */}
          <Card className="card-ios border-none shadow-sm">
            <CardContent className="p-5 space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <h3 className="font-bold text-slate-900 dark:text-white">Documentation</h3>
                </div>
                <span className="text-lg font-black text-slate-900 dark:text-white">{docCompletion}%</span>
              </div>
              <Progress value={docCompletion} className="h-2 bg-slate-100 dark:bg-slate-800" indicatorClassName="bg-emerald-500 rounded-full" />
              {missingItems.length > 0 && (
                <div className="space-y-2 pt-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Missing Requirements</p>
                  {missingItems.slice(0, 2).map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs font-bold text-rose-500 bg-rose-50 dark:bg-rose-500/10 p-2 rounded-lg">
                      <AlertCircle className="w-3 h-3" />
                      {item.title}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 2) Physical Fitness */}
          <Card className="card-ios border-none shadow-sm">
            <CardContent className="p-5 space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-500" />
                  <h3 className="font-bold text-slate-900 dark:text-white">Physical Fitness</h3>
                </div>
                <span className="text-lg font-black text-slate-900 dark:text-white">{pftScore || 180}</span>
              </div>
              <div className="bg-blue-50 dark:bg-blue-500/10 p-3 rounded-xl">
                <p className="text-[11px] font-bold text-blue-600 dark:text-blue-400 leading-tight">
                  {fitnessNudge}
                </p>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <span>Current Level</span>
                  <span>Target: 300</span>
                </div>
                <Progress value={((pftScore || 180) / 300) * 100} className="h-2 bg-slate-100 dark:bg-slate-800" indicatorClassName="bg-blue-500 rounded-full" />
              </div>
            </CardContent>
          </Card>

          {/* 3) Career Eligibility */}
          <Card className="card-ios border-none shadow-sm">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-slate-900 dark:text-white">Career Eligibility</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                  <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Time in Grade</p>
                  <p className="text-sm font-black text-slate-900 dark:text-white">
                    {tigMonths} months
                    {requiredTig != null && (
                      <span className="text-[11px] font-bold text-slate-500 ml-1">
                        (need {requiredTig})
                      </span>
                    )}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                  <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Board Status</p>
                  <p
                    className={`text-sm font-black ${
                      boardQualified ? "text-emerald-500" : "text-amber-500"
                    }`}
                  >
                    {boardQualified ? "Qualified" : "Not yet eligible"}
                  </p>
                  {tigRequirement && (
                    <p className="mt-1 text-[10px] font-bold text-slate-500">
                      {tigRequirement.label} · TIG {tigMonths}/{tigRequirement.minTigMonths} months
                      {profile?.pmeComplete ? " · PME complete" : " · PME incomplete"}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 4) Financial Projection */}
          <Card
            className="card-ios border-none shadow-sm bg-emerald-500/5 dark:bg-emerald-500/10 cursor-pointer active:scale-[0.99] transition-transform"
            onClick={() => setLocation("/finance")}
            role="button"
            tabIndex={0}
          >
            <CardContent className="p-5 space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-500" />
                  <h3 className="font-bold text-slate-900 dark:text-white">Financial Projection</h3>
                </div>
                <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest border-emerald-500/20 text-emerald-500">
                  {financeProjection.rank.replace("E", "E-")} → {financeProjection.next.replace("E", "E-")} promo
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Projected Monthly Base Pay</p>
                  <p className="text-2xl font-black text-slate-900 dark:text-white">{formatMoney(financeProjection.projected)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Difference</p>
                  <p className="text-lg font-black text-emerald-500">
                    {financeProjection.diff >= 0 ? "+" : ""}
                    {formatMoney(financeProjection.diff)}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400 pt-1">
                <span>Tap to view breakdown</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Milestone celebration dialog for high readiness scores */}
        <Dialog open={milestoneOpen} onOpenChange={setMilestoneOpen}>
          <DialogContent className="rounded-[32px] border-none max-w-[90vw] sm:max-w-[400px] p-0 overflow-hidden bg-slate-900 text-white">
            <div className="relative p-8 text-center">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/40 via-slate-900 to-slate-950 opacity-80" />
              <div className="relative z-10 space-y-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 260, damping: 20 }}
                  className="w-20 h-20 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center"
                >
                  <Trophy className="w-10 h-10 text-emerald-300" />
                </motion.div>
                <DialogHeader className="space-y-1">
                  <DialogTitle className="text-2xl font-black text-white">
                    {milestoneLevel === 90
                      ? "Elite Readiness"
                      : milestoneLevel === 80
                        ? "Excellent Readiness"
                        : "On Track"}
                  </DialogTitle>
                  <DialogDescription className="text-emerald-100 text-sm font-bold">
                    Your readiness just crossed {milestoneLevel}% — keep pressing, Marine.
                  </DialogDescription>
                </DialogHeader>
                <p className="text-xs font-bold text-emerald-100/80 uppercase tracking-widest">
                  Current score: {currentScore}
                </p>

                {milestoneLevel !== null && currentScore >= 80 && (
                  <>
                    <div className="mt-4 space-y-2 text-left bg-slate-900/60 border border-emerald-500/30 rounded-2xl p-4">
                      <p className="text-[11px] font-black uppercase tracking-widest text-emerald-300 mb-1">
                        Instagram-ready shoutout
                      </p>
                      <p className="text-xs font-medium text-emerald-50 leading-relaxed">
                        Screenshot this and share:{" "}
                        <span className="font-semibold">
                          &quot;Just hit {currentScore}% readiness in Waypoints. Training, PME, and finances on lock — who&apos;s joining me?&quot;
                        </span>
                      </p>
                    </div>
                    <button
                      type="button"
                      className="mt-3 w-full h-11 rounded-2xl border border-emerald-400/80 bg-transparent text-[10px] font-black uppercase tracking-widest text-emerald-100 shadow-sm"
                    >
                      Share to Instagram
                    </button>
                  </>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
