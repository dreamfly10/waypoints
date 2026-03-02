import { useProfile, useUpdateProfile } from "@/hooks/use-profile";
import { useAlerts } from "@/hooks/use-alerts";
import { useCommunityPosts, useCreateCommunityPost } from "@/hooks/use-community";
import { useCreateVaultItem, useVaultItems } from "@/hooks/use-vault";
import { useReadinessResult } from "@/hooks/use-readiness-result";
import { getTier } from "@shared/readiness-engine";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, Info, ChevronRight, Award, Share2, ArrowUpRight, Calendar, Trophy, UploadCloud } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Required documents per tier (README_READINESS_ENGINE.md). Each tier lists vault doc types the user should upload for readiness.
const TIER_REQUIRED_DOCUMENTS: Record<string, { type: string; label: string }[]> = {
  TIER_A_E1_E3: [
    { type: "pft", label: "PFT Scorecard" },
    { type: "medical_clearance", label: "Medical Clearance" },
  ],
  TIER_B_E4_E5: [
    { type: "pft", label: "PFT Scorecard" },
    { type: "medical_clearance", label: "Medical Clearance" },
  ],
  TIER_C_E6_E9: [
    { type: "pft", label: "PFT Scorecard" },
    { type: "medical_clearance", label: "Medical Clearance" },
  ],
};

const ENLISTED_RANKS = ["E1", "E2", "E3", "E4", "E5", "E6", "E7", "E8", "E9"] as const;
function getTierFromRank(rank: string | undefined): string {
  if (!rank || !ENLISTED_RANKS.includes(rank as typeof ENLISTED_RANKS[number])) return "TIER_B_E4_E5";
  return getTier(rank as "E1" | "E2" | "E3" | "E4" | "E5" | "E6" | "E7" | "E8" | "E9");
}

export default function Home() {
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { mutate: updateProfile } = useUpdateProfile();
  const { data: alerts, isLoading: alertsLoading } = useAlerts();
  const { data: vaultItems } = useVaultItems();
  const { data: readinessResult } = useReadinessResult();
  const { data: posts, isLoading: postsLoading } = useCommunityPosts();
  const { mutate: shareMilestone, isPending: isSharing } = useCreateCommunityPost();
  const { mutate: upload, isPending: isUploading } = useCreateVaultItem();
  const { toast } = useToast();

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadType, setUploadType] = useState("");
  const [uploadTitle, setUploadTitle] = useState("");
  const [profileSetupOpen, setProfileSetupOpen] = useState(false);
  const [setupFirstName, setSetupFirstName] = useState("");
  const [setupLastName, setSetupLastName] = useState("");
  const [, setLocation] = useLocation();

  const readinessScore = profile?.readinessScore ?? 0;
  const readinessBand =
    readinessScore <= 69 ? "need_attention" : readinessScore <= 89 ? "met" : "excellent";
  const readinessBandLabel =
    readinessBand === "need_attention" ? "Need attention" : readinessBand === "met" ? "Met" : "Excellent";
  const readinessBandClass =
    readinessBand === "need_attention"
      ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/20"
      : readinessBand === "met"
        ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20"
        : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20";

  const prevScoreRef = useRef<number | undefined>(profile?.readinessScore);
  const [isScoreUpdating, setIsScoreUpdating] = useState(false);
  const readinessDelta = (readinessResult as any)?.delta ?? 0;

  useEffect(() => {
    if (profileSetupOpen && profile) {
      setSetupFirstName(profile.firstName ?? "");
      setSetupLastName(profile.lastName ?? "");
    }
  }, [profileSetupOpen, profile?.firstName, profile?.lastName]);

  useEffect(() => {
    if (profile?.readinessScore !== undefined && prevScoreRef.current !== undefined && profile.readinessScore !== prevScoreRef.current) {
      setIsScoreUpdating(true);
      const timer = setTimeout(() => setIsScoreUpdating(false), 500);
      prevScoreRef.current = profile.readinessScore;
      return () => clearTimeout(timer);
    }
    if (profile?.readinessScore !== undefined) {
      prevScoreRef.current = profile.readinessScore;
    }
  }, [profile?.readinessScore]);

  const handleShareMilestone = () => {
    if (!profile) return;
    
    shareMilestone({
      author: "Current User",
      content: `I've reached a readiness score of ${profile.readinessScore}! My career is on track.`,
      type: "milestone",
      milestoneCard: {
        title: "Readiness Milestone",
        score: profile.readinessScore,
        delta: 3,
      },
    }, {
      onSuccess: () => {
        toast({
          title: "Milestone Shared",
          description: "Your achievement has been posted to the community feed.",
        });
      }
    });
  };

  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  // Action items: profile (first/last name), then Unlock Readiness, tier-required documents (missing), then expiring/renew alerts
  const profileIncomplete = !profile?.firstName?.trim() || !profile?.lastName?.trim();
  const actionItems = useMemo(() => {
    const tier = getTierFromRank(profile?.rank);
    const required = TIER_REQUIRED_DOCUMENTS[tier] ?? TIER_REQUIRED_DOCUMENTS.TIER_B_E4_E5;
    const hasType = (type: string) => {
      const items = vaultItems ?? [];
      if (type === "pme_cert") {
        const pmeDocs = items.filter((i) => i.type === "pme_cert");
        if (!pmeDocs.length) return false;
        const latest = pmeDocs
          .slice()
          .sort((a, b) => {
            try {
              return new Date(a.date).getTime() - new Date(b.date).getTime();
            } catch {
              return 0;
            }
          })
          .at(-1) as any;
        const passed = (latest?.extractedFields as any)?.passed;
        return passed === true;
      }
      return items.some((i) => i.type === type);
    };
    const tierMissing = required
      .filter((doc) => !hasType(doc.type))
      .map((doc) => ({
        id: `tier-${doc.type}`,
        title: doc.label,
        message: "Required for your rank tier",
        severity: "high" as const,
        actionType: "upload" as const,
        relatedVaultType: doc.type,
      }));
    const fromAlerts = alerts ?? [];
    const tierTypesShown = new Set(tierMissing.map((t) => t.relatedVaultType));
    const unlockOrRenew = fromAlerts.filter(
      (a) => a.actionType === "renew" || a.relatedVaultType == null
    );
    const otherAlerts = fromAlerts.filter(
      (a) => a.actionType !== "renew" && a.relatedVaultType != null && !tierTypesShown.has(a.relatedVaultType)
    );
    const profileItem = profileIncomplete
      ? [{
          id: "profile-info",
          title: "Complete profile",
          message: "Complete your profile for a surprise!",
          severity: "medium" as const,
          actionType: "complete" as const,
          relatedVaultType: null as string | null,
        }]
      : [];
    type Item = (typeof tierMissing)[0] | (typeof fromAlerts)[0] | (typeof profileItem)[0];
    return [...profileItem, ...unlockOrRenew, ...tierMissing, ...otherAlerts] as Item[];
  }, [profile?.rank, profile?.firstName, profile?.lastName, profileIncomplete, vaultItems, alerts]);

  const deadlines = alerts?.filter((a) => a.dueDate || a.relatedVaultType === "pft").slice(0, 3) ?? [];
  const recentMilestones = posts?.filter((p) => p.type === "milestone").slice(0, 2) ?? [];

  if (profileLoading || alertsLoading || postsLoading) {
    return (
      <AppLayout>
        <div className="space-y-6 p-4">
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-48 w-full rounded-3xl" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-1/4" />
            <Skeleton className="h-20 w-full rounded-2xl" />
            <Skeleton className="h-20 w-full rounded-2xl" />
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-8">
        
        {/* Greeting Header */}
        <div className="flex justify-between items-start pt-2 px-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              {getTimeGreeting()}, {[profile?.firstName, profile?.lastName].filter(Boolean).join(" ").trim() || "marine"}.
            </h1>
            <p className="text-slate-500 dark:text-slate-400 font-bold text-sm mt-0.5 uppercase tracking-wider">
              Here's your career status.
            </p>
          </div>
          {profile && profile.readinessScore >= 70 && (
            <Button 
              size="icon"
              onClick={handleShareMilestone}
              disabled={isSharing}
              className="rounded-full bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/20"
            >
              <Share2 className="w-4 h-4 text-white" />
            </Button>
          )}
        </div>

        {/* Readiness Circular Card */}
        <div className="px-4">
          <Card className="card-ios !bg-slate-900 dark:!bg-emerald-950/20 !text-white overflow-hidden relative border-none shadow-xl shadow-emerald-500/10">
            <div className="absolute right-0 top-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
            <CardContent className="p-8 flex items-center justify-between gap-6">
              <div className={`relative flex items-center justify-center shrink-0 ${isScoreUpdating ? 'score-pulse' : ''}`}>
                <svg className="w-32 h-32 transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="58"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    className="text-white/10"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="58"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={364}
                    strokeDashoffset={364 - (364 * readinessScore) / 100}
                    strokeLinecap="round"
                    className="text-emerald-400 transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-black text-white">{readinessScore}</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/50">Score</span>
                </div>
              </div>
              
              <div className="flex-1 space-y-4">
                <div>
                  <h3 className="text-xl font-bold leading-tight">Overall Readiness</h3>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${readinessBandClass}`}>
                      {readinessBandLabel}
                    </span>
                    {readinessDelta !== 0 && (
                      <div className="flex items-center text-emerald-400 text-xs font-black">
                        <ArrowUpRight className="w-3 h-3 mr-0.5" />
                        {readinessDelta > 0 ? `+${readinessDelta}` : readinessDelta} THIS WEEK
                      </div>
                    )}
                  </div>
                </div>
                <Link href="/readiness">
                  <Button variant="outline" className="w-full h-10 rounded-xl bg-white/10 border-white/10 hover:bg-white/20 text-white text-[10px] font-black uppercase tracking-widest transition-all">
                    View Details
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Items Section */}
        <div className="space-y-4 px-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Action Items</h2>
            <Link href="/readiness" className="text-[10px] font-black uppercase tracking-widest text-emerald-500">
              Manage
            </Link>
          </div>
          
          <div className="grid gap-3">
            {actionItems.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 dark:bg-slate-900/50 rounded-[32px] border border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-3 opacity-20" />
                <p className="font-bold text-xs">All clear on your end.</p>
              </div>
            ) : (
              actionItems.map((item) => (
                <div key={String(item.id)} className="p-4 bg-white dark:bg-slate-900 rounded-[24px] border border-slate-100 dark:border-slate-800 flex items-center gap-4 shadow-sm">
                  <div className={`w-2 h-10 rounded-full shrink-0 ${item.severity === "high" ? "bg-rose-500" : item.severity === "medium" ? "bg-amber-500" : "bg-slate-400"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">{item.title}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {"message" in item ? item.message : "Tactical requirement"}
                    </p>
                  </div>
                  {item.actionType === "complete" ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-8 rounded-lg text-[10px] font-black uppercase px-3 tracking-widest"
                      onClick={() => {
                        setProfileSetupOpen(true);
                      }}
                    >
                      Complete
                    </Button>
                  ) : item.relatedVaultType === "pme_cert" ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-8 rounded-lg text-[10px] font-black uppercase px-3 tracking-widest"
                      onClick={() => {
                        setLocation("/vault?pme=1");
                      }}
                    >
                      Edit PME
                    </Button>
                  ) : item.relatedVaultType === "pft" ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-8 rounded-lg text-[10px] font-black uppercase px-3 tracking-widest"
                      onClick={() => {
                        setLocation("/vault?pft=1");
                      }}
                    >
                      Edit PFT
                    </Button>
                  ) : item.actionType === "upload" || item.actionType === "renew" ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-8 rounded-lg text-[10px] font-black uppercase px-3 tracking-widest"
                      onClick={() => {
                        setUploadType((item.relatedVaultType as string) ?? "");
                        setUploadTitle("");
                        setUploadOpen(true);
                      }}
                    >
                      Upload
                    </Button>
                  ) : (
                    <Button size="sm" variant="secondary" className="h-8 rounded-lg text-[10px] font-black uppercase px-3 tracking-widest">
                      Resolve
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Upload document dialog (same flow as Career Vault) */}
        <Dialog
          open={uploadOpen}
          onOpenChange={(open) => {
            setUploadOpen(open);
            if (!open) {
              setUploadTitle("");
              setUploadType("");
            }
          }}
        >
          <DialogContent className="rounded-[32px] border-none max-w-[90vw] sm:max-w-[400px] p-8">
            <DialogHeader className="space-y-3">
              <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-2">
                <UploadCloud className="w-6 h-6 text-emerald-500" />
              </div>
              <DialogTitle className="text-2xl font-black text-center">Upload document</DialogTitle>
              <DialogDescription className="text-center font-medium">
                Add a document to your Career Vault. It will appear under the category you choose and can improve your readiness score.
              </DialogDescription>
            </DialogHeader>
            <form
              className="space-y-6 pt-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (!uploadTitle.trim() || !uploadType) return;
                const extractedFields: Record<string, unknown> = {
                  confidence: "99.2%",
                  verifiedBy: "Waypoints AI Engine",
                  keyMetrics:
                    uploadType === "pft"
                      ? ["Score: 285", "Status: Excellence"]
                      : uploadType === "promotion_letter"
                        ? ["Primary Zone", "Rank: SSG"]
                        : ["Authenticated", "Compliant"],
                };
                if (uploadType === "pft") extractedFields.score = 285;
                upload(
                  {
                    profileId: 1,
                    title: uploadTitle.trim(),
                    type: uploadType as "pft" | "promotion_letter" | "cert" | "medical_clearance" | "orders" | "awards" | "fitness_report" | "other",
                    date: format(new Date(), "yyyy-MM-dd"),
                    extractedFields,
                  },
                  {
                    onSuccess: () => {
                      setUploadOpen(false);
                      setUploadTitle("");
                      setUploadType("");
                      toast({ title: "Document uploaded", description: "Your readiness score will update if this affects your profile." });
                    },
                    onError: (err: Error & { message?: string }) => {
                      toast({ title: err?.message ?? "Upload failed", variant: "destructive" });
                    },
                  }
                );
              }}
            >
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-slate-400">Title</Label>
                  <Input
                    placeholder="e.g. 2024 Physical Fitness Scorecard"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    className="h-12 rounded-xl bg-slate-50 dark:bg-slate-900 border-none font-bold"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-slate-400">Category</Label>
                  <Select value={uploadType} onValueChange={setUploadType} required>
                    <SelectTrigger className="h-12 rounded-xl bg-slate-50 dark:bg-slate-900 border-none font-bold">
                      <SelectValue placeholder="Choose type" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-none shadow-xl">
                      <SelectItem value="promotion_letter">Promotion Letter</SelectItem>
                      <SelectItem value="pft">Physical Fitness (PFT)</SelectItem>
                      <SelectItem value="fitness_report">Fitness Report</SelectItem>
                      <SelectItem value="cert">Training Certification</SelectItem>
                      <SelectItem value="medical_clearance">Medical Clearance</SelectItem>
                      <SelectItem value="awards">Awards</SelectItem>
                      <SelectItem value="orders">Orders</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="submit"
                  disabled={isUploading}
                  className="w-full h-12 rounded-xl bg-slate-900 dark:bg-emerald-500 text-white font-black uppercase tracking-widest shadow-lg"
                >
                  {isUploading ? "Processing..." : "Secure Upload"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Complete Profile dialog (inline, no redirect to Profile page) */}
        <Dialog open={profileSetupOpen} onOpenChange={setProfileSetupOpen}>
          <DialogContent className="rounded-[32px] border-none max-w-[90vw] sm:max-w-[400px] p-8">
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-xl font-black text-center">Complete profile</DialogTitle>
              <DialogDescription className="text-center font-medium">
                Add your name so Waypoints can personalize your readiness insights.
              </DialogDescription>
            </DialogHeader>
            <form
              className="space-y-4 pt-2"
              onSubmit={(e) => {
                e.preventDefault();
                const first = setupFirstName.trim();
                const last = setupLastName.trim();
                if (!first || !last) {
                  toast({ title: "Name required", description: "Enter both first and last name.", variant: "destructive" });
                  return;
                }
                updateProfile(
                  { firstName: first, lastName: last },
                  {
                    onSuccess: () => {
                      toast({ title: "Profile updated", description: "Your readiness score will refresh shortly." });
                      setProfileSetupOpen(false);
                    },
                    onError: (err: Error & { message?: string }) => {
                      toast({ title: "Update failed", description: err?.message ?? "Could not update profile.", variant: "destructive" });
                    },
                  }
                );
              }}
            >
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-slate-400">
                    First name
                  </Label>
                  <Input
                    value={setupFirstName}
                    onChange={(e) => setSetupFirstName(e.target.value)}
                    className="h-11 rounded-xl bg-slate-50 dark:bg-slate-900 border-none font-bold"
                    placeholder="First name"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-slate-400">
                    Last name
                  </Label>
                  <Input
                    value={setupLastName}
                    onChange={(e) => setSetupLastName(e.target.value)}
                    className="h-11 rounded-xl bg-slate-50 dark:bg-slate-900 border-none font-bold"
                    placeholder="Last name"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" className="w-full h-11 rounded-xl bg-slate-900 dark:bg-emerald-500 text-white font-black uppercase tracking-widest shadow-lg">
                  Save
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Upcoming Deadlines */}
        <div className="px-4">
          <Card className="card-ios border-none shadow-sm bg-amber-500/5 dark:bg-amber-500/10">
            <CardContent className="p-6">
              <h2 className="text-lg font-bold flex items-center gap-2 mb-4 text-slate-900 dark:text-white">
                <Calendar className="w-5 h-5 text-amber-500" />
                Upcoming Deadlines
              </h2>
              <div className="space-y-3">
                {deadlines.length > 0 ? deadlines.map(d => (
                  <div key={d.id} className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400 font-bold">{d.title}</span>
                    <span className="text-amber-600 dark:text-amber-400 font-black font-mono text-xs">
                      {d.dueDate ? format(new Date(d.dueDate), 'MMM d') : d.relatedVaultType === 'pft' ? 'Missing' : 'Pending'}
                    </span>
                  </div>
                )) : (
                  <p className="text-xs text-slate-400 font-medium">No immediate deadlines.</p>
                )}
                <div className="flex items-center justify-between text-sm opacity-60">
                  <span className="text-slate-600 dark:text-slate-400 font-bold">Board Eligibility</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-black font-mono text-xs">OCT 2026</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Milestones */}
        <div className="space-y-4 px-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Recent Milestones</h2>
            <Link href="/community" className="text-[10px] font-black uppercase tracking-widest text-emerald-500">
              Community
            </Link>
          </div>
          
          <div className="space-y-3">
            {recentMilestones.length === 0 ? (
              <p className="text-xs text-slate-400 font-medium px-1 text-center py-4">No recent community milestones.</p>
            ) : recentMilestones.map((post) => (
              <div key={post.id} className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-[24px] border border-slate-100 dark:border-slate-800 flex items-start gap-4">
                <div className="p-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm">
                  <Trophy className="w-5 h-5 text-amber-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-emerald-500">{post.author}</span>
                    <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">{post.createdAt ? format(new Date(post.createdAt), "MMM d, yyyy") : ""}</span>
                  </div>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-1 line-clamp-2 leading-snug">
                    {post.content}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </AppLayout>
  );
}
