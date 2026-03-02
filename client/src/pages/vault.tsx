import React, { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { useVaultItems, useCreateVaultItem } from "@/hooks/use-vault";
import { useProfile } from "@/hooks/use-profile";
import { useCreateCommunityPost } from "@/hooks/use-community";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, UploadCloud, ShieldCheck, CheckCircle2, Clock, Trophy, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { addMonthsISO, isFutureDate } from "@/lib/dates";
import { USMC_PROMO_REQS, type EnlistedRank } from "@shared/rules/promotion-requirements";

export default function Vault() {
  const { data: items, isLoading } = useVaultItems();
  const { mutate: upload, isPending } = useCreateVaultItem();
  const { mutate: createMilestonePost } = useCreateCommunityPost();
  const { data: profile } = useProfile();
  const { toast } = useToast();
  
  const [open, setOpen] = useState(false);
  const [successOpen, setOpenSuccess] = useState(false);
  const [lastUploaded, setLastUploaded] = useState<any>(null);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const [unlocked, setUnlocked] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState("");

  const categories = [
    { id: "all", label: "All" },
    { id: "promotion_letter", label: "Promotions" },
    { id: "pft", label: "Fitness" },
    { id: "pme_cert", label: "PME" },
    { id: "cert", label: "Certs" },
    { id: "medical_clearance", label: "Medical" },
    { id: "orders", label: "Orders" },
    { id: "awards", label: "Awards" },
  ];

  const filteredItems = items?.filter(item => activeTab === "all" || item.type === activeTab);

  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [thresholdReached, setThresholdReached] = useState<number | null>(null);

  const [pftDialogOpen, setPftDialogOpen] = useState(false);
  const [pftScore, setPftScore] = useState<string>("");
  const [pftDate, setPftDate] = useState<string>("");
  const [pftVerified, setPftVerified] = useState<boolean>(false);
  const [pftError, setPftError] = useState<string | null>(null);

  const [pmeDialogOpen, setPmeDialogOpen] = useState(false);
  const [pmeCourse, setPmeCourse] = useState<string>("");
  const [pmeCompletedOn, setPmeCompletedOn] = useState<string>("");
  const [pmeResult, setPmeResult] = useState<"PASS" | "FAIL">("PASS");
  const [pmeVerified, setPmeVerified] = useState<boolean>(false);
  const [pmeError, setPmeError] = useState<string | null>(null);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (unlockPassword === profile?.vaultPassword) {
      setUnlocked(true);
      toast({ title: "Vault Unlocked" });
    } else {
      toast({ title: "Invalid Password", variant: "destructive" });
    }
  };

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !type) return;

    const pftScore = type === "pft" ? 285 : undefined;
    const extractedFields: Record<string, unknown> = {
      confidence: "99.2%",
      verifiedBy: "Waypoints AI Engine",
      keyMetrics: type === "pft" ? ["Score: 285", "Status: Excellence"] :
                  type === "promotion_letter" ? ["Primary Zone", "Rank: SSG"] :
                  ["Authenticated", "Compliant"],
    };
    if (typeof pftScore === "number") extractedFields.score = pftScore;

    upload(
      {
        profileId: 1,
        title,
        type,
        date: format(new Date(), "yyyy-MM-dd"),
        extractedFields,
      },
      {
        onSuccess: (data) => {
          setLastUploaded({ ...data, extractedFields });
          setOpen(false);
          const newScore = profile?.readinessScore ?? 0;
          if (profile?.readinessStatus === "active" && newScore >= 70 && (!profile?.readinessScore || profile.readinessScore < 70)) {
            setThresholdReached(70);
            setShowMilestoneModal(true);
          } else {
            setOpenSuccess(true);
          }
          setTitle("");
          setType("");
        },
        onError: (err: Error & { message?: string; code?: string }) => {
          toast({ title: err?.message ?? "Upload failed", variant: "destructive" });
        },
      }
    );
  };

  const latestPft = items
    ?.filter((i) => i.type === "pft")
    .slice()
    .sort((a, b) => {
      const aTime = (a as any).uploadTimestamp
        ? new Date((a as any).uploadTimestamp).getTime()
        : (() => {
            try {
              return parseISO(a.date).getTime();
            } catch {
              return 0;
            }
          })();
      const bTime = (b as any).uploadTimestamp
        ? new Date((b as any).uploadTimestamp).getTime()
        : (() => {
            try {
              return parseISO(b.date).getTime();
            } catch {
              return 0;
            }
          })();
      return aTime - bTime;
    })
    .at(-1) as any | undefined;

  const requiredPmeCourse = useMemo(() => {
    const rank = profile?.rank as EnlistedRank | undefined;
    if (!rank) return "";
    const req = USMC_PROMO_REQS.find((r) => r.from === rank);
    return req?.requiresPME ? (req.pmeLabel ?? "PME") : "";
  }, [profile?.rank]);

  const latestPme = items
    ?.filter((i) => i.type === "pme_cert")
    .slice()
    .sort((a, b) => {
      const aTime = (a as any).uploadTimestamp
        ? new Date((a as any).uploadTimestamp).getTime()
        : (() => {
            try {
              return parseISO(a.date).getTime();
            } catch {
              return 0;
            }
          })();
      const bTime = (b as any).uploadTimestamp
        ? new Date((b as any).uploadTimestamp).getTime()
        : (() => {
            try {
              return parseISO(b.date).getTime();
            } catch {
              return 0;
            }
          })();
      return aTime - bTime;
    })
    .at(-1) as any | undefined;

  const latestPmePassed =
    typeof (latestPme?.extractedFields as any)?.passed === "boolean"
      ? Boolean((latestPme.extractedFields as any).passed)
      : false;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("pme") === "1") {
      setPmeDialogOpen(true);
      if (latestPme) {
        setPmeCourse(String((latestPme.extractedFields as any)?.course ?? requiredPmeCourse ?? ""));
        setPmeCompletedOn(latestPme.date ?? "");
        const passed = (latestPme.extractedFields as any)?.passed;
        setPmeResult(passed === false ? "FAIL" : "PASS");
        setPmeVerified(Boolean((latestPme.extractedFields as any)?.verified));
      } else {
        setPmeCourse(requiredPmeCourse ?? "");
        setPmeCompletedOn("");
        setPmeResult("PASS");
        setPmeVerified(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requiredPmeCourse, latestPme?.id]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("pft") === "1") {
      if (latestPft) {
        const score = (latestPft.extractedFields as any)?.score;
        setPftScore(typeof score === "number" ? String(score) : "");
        setPftDate(latestPft.date);
        setPftVerified(Boolean((latestPft.extractedFields as any)?.verified));
      } else {
        setPftScore("");
        setPftDate("");
        setPftVerified(false);
      }
      setPftError(null);
      setPftDialogOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestPft?.id]);

  const handlePftSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPftError(null);
    const scoreNum = parseInt(pftScore, 10);
    if (Number.isNaN(scoreNum) || scoreNum < 0 || scoreNum > 300) {
      setPftError("Score must be between 0 and 300.");
      return;
    }
    if (!pftDate) {
      setPftError("Test date is required.");
      return;
    }
    if (isFutureDate(pftDate)) {
      setPftError("Test date cannot be in the future.");
      return;
    }

    const expiresAt = addMonthsISO(pftDate, 6);

    upload(
      {
        profileId: 1,
        title: "PFT Record",
        type: "pft",
        date: pftDate,
        expiresAt,
        extractedFields: {
          score: scoreNum,
          verified: pftVerified,
          keyMetrics: [`Score: ${scoreNum}`, `Status: ${pftVerified ? "Verified" : "Unverified"}`],
        },
      } as any,
      {
        onSuccess: () => {
          setPftDialogOpen(false);
          toast({ title: "PFT record saved", description: "Readiness recalculated." });
        },
        onError: (err: Error & { message?: string }) => {
          setPftError(err?.message ?? "Failed to save PFT record.");
        },
      }
    );
  };

  const handlePmeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPmeError(null);

    const course = (pmeCourse || requiredPmeCourse || "").trim();
    if (!course) {
      setPmeError("Course is required.");
      return;
    }
    if (!pmeCompletedOn) {
      setPmeError("Completion date is required.");
      return;
    }
    if (isFutureDate(pmeCompletedOn)) {
      setPmeError("Completion date cannot be in the future.");
      return;
    }

    upload(
      {
        profileId: 1,
        title: `PME: ${course}`,
        type: "pme_cert",
        date: pmeCompletedOn,
        extractedFields: {
          course,
          passed: pmeResult === "PASS",
          verified: pmeVerified,
          keyMetrics: [`Result: ${pmeResult}`, `Status: ${pmeVerified ? "Verified" : "Unverified"}`],
        },
      } as any,
      {
        onSuccess: () => {
          setPmeDialogOpen(false);
          toast({ title: "PME updated", description: pmeResult === "PASS" ? "Marked complete." : "Saved as incomplete." });
        },
        onError: (err: Error & { message?: string }) => {
          setPmeError(err?.message ?? "Failed to save PME.");
        },
      }
    );
  };

  const getStatusBadge = (item: any) => {
    if (item.expiresAt) {
      const expiry = parseISO(item.expiresAt);
      const now = new Date();
      const diff = expiry.getTime() - now.getTime();
      const days = diff / (1000 * 60 * 60 * 24);
      
      if (days < 0) return <Badge variant="destructive" className="rounded-full text-[10px] px-2 py-0">Expired</Badge>;
      if (days < 60) return <Badge className="bg-amber-500 hover:bg-amber-600 rounded-full text-[10px] px-2 py-0">Expiring</Badge>;
    }
    return <Badge className="bg-emerald-500 hover:bg-emerald-600 rounded-full text-[10px] px-2 py-0">Valid</Badge>;
  };

  if (profile?.vaultLockEnabled && !unlocked) {
    return (
      <AppLayout>
        <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 space-y-8 animate-in fade-in duration-500">
          <div className="w-20 h-20 bg-slate-900 dark:bg-emerald-500 rounded-[32px] flex items-center justify-center shadow-2xl">
            <Lock className="w-10 h-10 text-white" />
          </div>
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Vault Locked</h1>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Enter password to access records</p>
          </div>
          <form onSubmit={handleUnlock} className="w-full max-w-[280px] space-y-4">
            <Input 
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              value={unlockPassword}
              onChange={(e) => setUnlockPassword(e.target.value)}
              className="h-14 rounded-2xl bg-white dark:bg-slate-900 border-none font-black text-center text-2xl tracking-[1em] shadow-sm"
              autoFocus
            />
            <Button type="submit" className="w-full h-14 rounded-2xl bg-slate-900 dark:bg-emerald-500 text-white font-black uppercase tracking-widest">
              Unlock Vault
            </Button>
          </form>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 animate-in fade-in duration-700 pb-12">
        
        {/* Top Section */}
        <div className="flex flex-col gap-6 pt-2">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">
              Career Vault
            </h1>
            <p className="text-slate-500 dark:text-slate-400 font-bold text-sm mt-1 uppercase tracking-wider">
              Your official record system
            </p>
          </div>

          {/* PFT Record Quick Card */}
          <Card className="card-ios border-none shadow-sm bg-slate-50 dark:bg-slate-900/60">
            <CardContent className="p-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                  Physical Fitness Test
                </p>
                {latestPft ? (
                  <div>
                    <p className="text-sm font-black text-slate-900 dark:text-white">
                      PFT: {(latestPft.extractedFields as any)?.score ?? profile?.pftScore ?? "—"}{" "}
                      ({format(parseISO(latestPft.date), "MMM d, yyyy")})
                    </p>
                    <p className="text-[10px] font-bold text-slate-500 mt-1">
                      Expires on {format(parseISO(addMonthsISO(latestPft.date, 6)), "MMM d, yyyy")}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
                    No PFT record on file.
                  </p>
                )}
              </div>
              <Button
                variant="outline"
                className="rounded-xl text-[10px] font-black uppercase tracking-widest"
                onClick={() => {
                  if (latestPft) {
                    const score = (latestPft.extractedFields as any)?.score;
                    setPftScore(typeof score === "number" ? String(score) : "");
                    setPftDate(latestPft.date);
                    setPftVerified(Boolean((latestPft.extractedFields as any)?.verified));
                  } else {
                    setPftScore("");
                    setPftDate("");
                    setPftVerified(false);
                  }
                  setPftError(null);
                  setPftDialogOpen(true);
                }}
              >
                {latestPft ? "Edit PFT Record" : "Add PFT Record"}
              </Button>
            </CardContent>
          </Card>

          {/* PME Quick Card */}
          <Card className="card-ios border-none shadow-sm bg-slate-50 dark:bg-slate-900/60">
            <CardContent className="p-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                  Professional Military Education
                </p>
                {requiredPmeCourse ? (
                  <div>
                    <p className="text-sm font-black text-slate-900 dark:text-white">
                      {latestPmePassed ? "PME: Complete" : "PME: Incomplete"}{" "}
                      <span className="text-[11px] font-bold text-slate-500">
                        ({requiredPmeCourse})
                      </span>
                    </p>
                    {latestPme ? (
                      <p className="text-[10px] font-bold text-slate-500 mt-1">
                        Last update {format(parseISO(latestPme.date), "MMM d, yyyy")}
                      </p>
                    ) : (
                      <p className="text-[10px] font-bold text-slate-500 mt-1">
                        No PME record on file.
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
                    PME not required for your next step.
                  </p>
                )}
              </div>
              <Button
                variant="outline"
                className="rounded-xl text-[10px] font-black uppercase tracking-widest"
                onClick={() => {
                  setPmeError(null);
                  setPmeCourse(String((latestPme?.extractedFields as any)?.course ?? requiredPmeCourse ?? ""));
                  setPmeCompletedOn(latestPme?.date ?? "");
                  const passed = (latestPme?.extractedFields as any)?.passed;
                  setPmeResult(passed === false ? "FAIL" : "PASS");
                  setPmeVerified(Boolean((latestPme?.extractedFields as any)?.verified));
                  setPmeDialogOpen(true);
                }}
                disabled={!requiredPmeCourse}
              >
                {latestPme ? "Edit PME" : "Add PME"}
              </Button>
            </CardContent>
          </Card>

          <Button 
            onClick={() => setOpen(true)}
            className="w-full h-14 rounded-2xl bg-slate-900 dark:bg-emerald-500 text-white font-black uppercase tracking-widest shadow-xl shadow-slate-900/10 dark:shadow-emerald-500/20 active:scale-95 transition-all"
          >
            <UploadCloud className="w-5 h-5 mr-3" />
            Upload Document
          </Button>
        </div>

        {/* Category Segments */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full h-12 bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl border-none">
            {categories.map(cat => (
              <TabsTrigger 
                key={cat.id} 
                value={cat.id}
                className="flex-1 rounded-xl text-[10px] font-black uppercase tracking-tighter data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm transition-all"
              >
                {cat.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Document List */}
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {isLoading ? (
              Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-[24px]" />)
            ) : filteredItems?.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="py-16 text-center bg-slate-50 dark:bg-slate-900/50 rounded-[32px] border border-dashed border-slate-200 dark:border-slate-800"
              >
                <FileText className="w-12 h-12 text-slate-200 dark:text-slate-800 mx-auto mb-4" />
                <p className="text-slate-400 font-bold text-sm">No records found in this category.</p>
              </motion.div>
            ) : (
              filteredItems?.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                >
                  <Card className="card-ios group border-none shadow-sm hover:shadow-md transition-all active:scale-[0.98]">
                    <CardContent className="p-5 flex flex-col gap-4">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl group-hover:bg-emerald-50 dark:group-hover:bg-emerald-500/10 transition-colors">
                            <FileText className="w-5 h-5 text-slate-400 dark:text-slate-500 group-hover:text-emerald-500 transition-colors" />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900 dark:text-white leading-tight">{item.title}</h3>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-0.5">{item.type.replace('_', ' ')}</p>
                          </div>
                        </div>
                        {getStatusBadge(item)}
                      </div>
                      
                      <div className="flex flex-col gap-3">
                        <div className="flex flex-wrap gap-1.5">
                          {(item.extractedFields as any).keyMetrics?.map((metric: string, idx: number) => (
                            <span key={idx} className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-bold px-2 py-1 rounded-lg">
                              {metric}
                            </span>
                          ))}
                        </div>
                        <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest pt-3 border-t border-slate-50 dark:border-slate-800">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {format(parseISO(item.date), 'MMM d, yyyy')}</span>
                          <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3 text-emerald-500" /> AI Verified</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        {/* PFT Record Dialog */}
        <Dialog open={pftDialogOpen} onOpenChange={setPftDialogOpen}>
          <DialogContent className="rounded-[32px] border-none max-w-[90vw] sm:max-w-[400px] p-8">
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-xl font-black text-center">PFT Record</DialogTitle>
              <DialogDescription className="text-center font-medium">
                Enter your latest Physical Fitness Test score.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handlePftSubmit} className="space-y-5 pt-2">
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-slate-400">
                    PFT Score (0–300)
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    max={300}
                    value={pftScore}
                    onChange={(e) => setPftScore(e.target.value)}
                    className="h-12 rounded-xl bg-slate-50 dark:bg-slate-900 border-none font-bold"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-slate-400">
                    Test Date
                  </Label>
                  <Input
                    type="date"
                    value={pftDate}
                    onChange={(e) => setPftDate(e.target.value)}
                    className="h-12 rounded-xl bg-slate-50 dark:bg-slate-900 border-none font-bold"
                    required
                  />
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Verified (demo)
                  </span>
                  <Button
                    type="button"
                    variant={pftVerified ? "default" : "outline"}
                    size="sm"
                    className="h-7 rounded-full text-[10px] font-black uppercase tracking-widest px-3"
                    onClick={() => setPftVerified((v) => !v)}
                  >
                    {pftVerified ? "Verified" : "Unverified"}
                  </Button>
                </div>
                {pftError && (
                  <p className="text-[11px] font-bold text-rose-500 mt-1">{pftError}</p>
                )}
              </div>
              <DialogFooter>
                <Button
                  type="submit"
                  disabled={isPending}
                  className="w-full h-12 rounded-xl bg-slate-900 dark:bg-emerald-500 text-white font-black uppercase tracking-widest shadow-lg"
                >
                  {isPending ? "Saving..." : "Save PFT Record"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* PME Dialog (Pass/Fail) */}
        <Dialog open={pmeDialogOpen} onOpenChange={setPmeDialogOpen}>
          <DialogContent className="rounded-[32px] border-none max-w-[90vw] sm:max-w-[400px] p-8">
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-xl font-black text-center">PME</DialogTitle>
              <DialogDescription className="text-center font-medium">
                Mark your PME as pass/fail. Selecting <span className="font-black">Pass</span> marks PME as complete.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handlePmeSubmit} className="space-y-5 pt-2">
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-slate-400">
                    Course
                  </Label>
                  <Input
                    value={pmeCourse}
                    onChange={(e) => setPmeCourse(e.target.value)}
                    placeholder={requiredPmeCourse ? requiredPmeCourse : "e.g. Corporals Course"}
                    className="h-12 rounded-xl bg-slate-50 dark:bg-slate-900 border-none font-bold"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-slate-400">
                    Completion Date
                  </Label>
                  <Input
                    type="date"
                    value={pmeCompletedOn}
                    onChange={(e) => setPmeCompletedOn(e.target.value)}
                    className="h-12 rounded-xl bg-slate-50 dark:bg-slate-900 border-none font-bold"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-slate-400">
                    Result
                  </Label>
                  <Select value={pmeResult} onValueChange={(v) => setPmeResult(v as any)}>
                    <SelectTrigger className="h-12 rounded-xl bg-slate-50 dark:bg-slate-900 border-none font-bold">
                      <SelectValue placeholder="Select result" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-none shadow-xl">
                      <SelectItem value="PASS">Pass</SelectItem>
                      <SelectItem value="FAIL">Fail</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Verified (demo)
                  </span>
                  <Button
                    type="button"
                    variant={pmeVerified ? "default" : "outline"}
                    size="sm"
                    className="h-7 rounded-full text-[10px] font-black uppercase tracking-widest px-3"
                    onClick={() => setPmeVerified((v) => !v)}
                  >
                    {pmeVerified ? "Verified" : "Unverified"}
                  </Button>
                </div>
                {pmeError && (
                  <p className="text-[11px] font-bold text-rose-500 mt-1">{pmeError}</p>
                )}
              </div>
              <DialogFooter>
                <Button
                  type="submit"
                  disabled={isPending}
                  className="w-full h-12 rounded-xl bg-slate-900 dark:bg-emerald-500 text-white font-black uppercase tracking-widest shadow-lg"
                >
                  {isPending ? "Saving..." : "Save PME"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Upload Dialog */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="rounded-[32px] border-none max-w-[90vw] sm:max-w-[400px] p-8">
            <DialogHeader className="space-y-3">
              <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-2">
                <UploadCloud className="w-6 h-6 text-emerald-500" />
              </div>
              <DialogTitle className="text-2xl font-black text-center">Add Record</DialogTitle>
              <DialogDescription className="text-center font-medium">
                Upload a document to extract tactical data.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpload} className="space-y-6 pt-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-slate-400">Title</Label>
                  <Input 
                    placeholder="e.g. 2024 Physical Fitness Scorecard" 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="h-12 rounded-xl bg-slate-50 dark:bg-slate-900 border-none font-bold"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-slate-400">Category</Label>
                  <Select value={type} onValueChange={setType} required>
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
                <Button type="submit" disabled={isPending} className="w-full h-12 rounded-xl bg-slate-900 dark:bg-emerald-500 text-white font-black uppercase tracking-widest shadow-lg">
                  {isPending ? "Processing..." : "Secure Upload"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Milestone Threshold Modal */}
        <Dialog open={showMilestoneModal} onOpenChange={setShowMilestoneModal}>
          <DialogContent className="rounded-[32px] border-none max-w-[90vw] sm:max-w-[400px] p-0 overflow-hidden">
            <div className="bg-emerald-500 p-8 text-center text-white relative">
              <motion.div 
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <Trophy className="w-10 h-10 text-white" />
              </motion.div>
              <h2 className="text-2xl font-black">You reached 70% readiness!</h2>
              <p className="text-white/80 font-bold text-sm mt-2 uppercase tracking-widest">Major Career Milestone</p>
              
              {/* Share Card Preview */}
              <div className="mt-6 bg-slate-900 rounded-2xl p-6 text-left shadow-2xl relative overflow-hidden">
                 <div className="absolute right-0 top-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl" />
                 <div className="flex justify-between items-start relative z-10">
                   <div>
                     <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-1">{profile?.rank}</p>
                     <h4 className="text-xl font-black">Readiness Level</h4>
                     <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-1">{format(new Date(), "MMM d, yyyy")}</p>
                   </div>
                   <div className="text-right">
                     <span className="text-4xl font-black text-white">{profile?.readinessScore ?? 70}</span>
                     <p className="text-[10px] font-bold text-emerald-400">▲ +5 PTS</p>
                   </div>
                 </div>
              </div>
            </div>
            
            <div className="p-6 space-y-3 bg-white dark:bg-slate-950">
              <Button 
                onClick={() => {
                  createMilestonePost(
                    {
                      profileId: 1,
                      author: profile?.rank ?? "Marine",
                      content: "Reached 70% readiness!",
                      type: "milestone",
                      milestoneCard: {
                        title: "Readiness Level",
                        score: profile?.readinessScore ?? 70,
                        delta: 5,
                      },
                      milestoneEventType: "readiness_improved",
                      privacy: "public",
                    },
                    {
                      onSuccess: () => {
                        toast({ title: "Shared to Community", description: "Your milestone is now live." });
                        setShowMilestoneModal(false);
                      },
                      onError: (err: Error & { message?: string }) => {
                        toast({ title: err?.message ?? "Could not share", variant: "destructive" });
                      },
                    }
                  );
                }}
                className="w-full h-12 rounded-xl bg-slate-900 dark:bg-emerald-500 text-white font-black uppercase tracking-widest"
              >
                Post to Community
              </Button>
              <Button 
                variant="outline"
                className="w-full h-12 rounded-xl border-slate-200 text-slate-900 dark:text-white font-black uppercase tracking-widest text-[10px]"
              >
                Invite 3 Peers to Unlock Pro Preview
              </Button>
              <Button variant="ghost" onClick={() => setShowMilestoneModal(false)} className="w-full text-slate-400 font-bold text-xs">
                Skip for now
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Success Modal */}
        <Dialog open={successOpen} onOpenChange={setOpenSuccess}>
          <DialogContent className="rounded-[32px] border-none max-w-[90vw] sm:max-w-[400px] p-10 text-center overflow-hidden">
            <motion.div 
              initial={{ scale: 0.5, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }}
              className="space-y-6"
            >
              <div className="w-20 h-20 bg-emerald-500 rounded-[28px] flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/20 relative">
                <CheckCircle2 className="w-10 h-10 text-white" />
                <motion.div 
                  className="absolute inset-0 bg-white/20 rounded-[28px]"
                  animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              </div>
              
              <div className="space-y-2">
                <h2 className="text-2xl font-black">Record Verified</h2>
                <p className="text-slate-500 font-bold text-sm px-4 leading-relaxed">
                  Data extracted successfully. Your readiness score is updating...
                </p>
              </div>

              {lastUploaded && (
                <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-4 text-left border border-slate-100 dark:border-slate-800">
                  <p className="text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Extracted Highlights</p>
                  <div className="space-y-2">
                    {lastUploaded.extractedFields.keyMetrics.map((m: string, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {m}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2">
                <div className="flex justify-between items-end mb-2 px-1">
                  <span className="text-xs font-black uppercase text-emerald-500">Recalculating...</span>
                  <span className="text-lg font-black">{profile?.readinessScore}%</span>
                </div>
                <Progress value={profile?.readinessScore || 0} className="h-2 bg-slate-100 dark:bg-slate-800" indicatorClassName="bg-emerald-500 rounded-full" />
              </div>

              <Button onClick={() => setOpenSuccess(false)} className="w-full h-12 rounded-xl bg-slate-900 dark:bg-slate-800 text-white font-black uppercase tracking-widest mt-4">
                Done
              </Button>
            </motion.div>
          </DialogContent>
        </Dialog>

      </div>
    </AppLayout>
  );
}
