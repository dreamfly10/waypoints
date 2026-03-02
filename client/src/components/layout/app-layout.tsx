import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Home,
  FolderLock,
  Target,
  MessageSquareWarning,
  Users,
  ShieldAlert,
  User,
  X,
  ChevronRight,
  Palette,
  AppWindow,
  Database,
  Briefcase,
  UserCircle,
  Clock,
  MapPin,
  Trophy,
  Settings,
  Bell,
  Calendar,
  ListTodo,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProfile, useUpdateProfile } from "@/hooks/use-profile";
import { useAlerts } from "@/hooks/use-alerts";
import { useCommunityPosts } from "@/hooks/use-community";
import { useReadinessResult } from "@/hooks/use-readiness-result";
import { ENLISTED_RANKS } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription,
  DialogHeader, 
  DialogTitle,
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { api } from "@shared/routes";
import { apiFetch } from "@/lib/api";
import { PaywallModal } from "@/components/paywall-modal";

type NotificationSeverity = "info" | "success" | "warning" | "critical";
type NotificationSource = "vault" | "readiness" | "community" | "advisor" | "system";
type NotificationCategory = "action" | "deadline" | "milestone" | "insight" | "system" | "community";

type NotificationCTA = { label: string; href: string };

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  severity: NotificationSeverity;
  category: NotificationCategory;
  source: NotificationSource;
  cta?: NotificationCTA;
  read: boolean;
  dismissible: boolean;
  dedupeKey: string;
  expiresAt?: string | null;
  createdAt: string; // ISO for sorting
  // If this came from an Alert, keep the id for server dismissal.
  alertId?: number;
};

const NOTIF_STORAGE_KEY = "wp_notification_state_v1";

function loadNotifState(): { read: Record<string, true>; dismissed: Record<string, true> } {
  try {
    const raw = localStorage.getItem(NOTIF_STORAGE_KEY);
    if (!raw) return { read: {}, dismissed: {} };
    const parsed = JSON.parse(raw) as any;
    return {
      read: (parsed?.read && typeof parsed.read === "object") ? parsed.read : {},
      dismissed: (parsed?.dismissed && typeof parsed.dismissed === "object") ? parsed.dismissed : {},
    };
  } catch {
    return { read: {}, dismissed: {} };
  }
}

function saveNotifState(state: { read: Record<string, true>; dismissed: Record<string, true> }) {
  try {
    localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

const navItems = [
  { title: "Home", url: "/", icon: Home },
  { title: "Vault", url: "/vault", icon: FolderLock },
  { title: "Readiness", url: "/readiness", icon: Target },
  { title: "Community", url: "/community", icon: Users },
  { title: "Advisor", url: "/advisor", icon: MessageSquareWarning },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const { data: profile } = useProfile();
  const { data: alerts } = useAlerts();
  const { data: posts } = useCommunityPosts();
  const { data: readiness } = useReadinessResult();
  const { mutate: updateProfile } = useUpdateProfile();
  const alertList = alerts ?? [];
  const [notifState, setNotifState] = useState(() => loadNotifState());
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [rankGradeOpen, setRankGradeOpen] = useState(false);
  const [valuePasswordOpen, setValuePasswordOpen] = useState(false);
  const [tisOpen, setTisOpen] = useState(false);
  const [tigOpen, setTigOpen] = useState(false);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editAvatarUrl, setEditAvatarUrl] = useState<string | null>(null);
  const [editTisMonths, setEditTisMonths] = useState<string>("");
  const [editTigMonths, setEditTigMonths] = useState<string>("");
  const [passwordStep, setPasswordStep] = useState<'create' | 'confirm'>('create');
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const { toast } = useToast();

  const prevReadinessScoreRef = useRef<number | undefined>(undefined);
  const [milestoneDialogOpen, setMilestoneDialogOpen] = useState(false);
  const [milestoneDialogLevel, setMilestoneDialogLevel] = useState<80 | 90 | null>(null);
  const [paywallOpen, setPaywallOpen] = useState(false);

  useEffect(() => {
    const currentScore = profile?.readinessScore ?? 0;
    const prevScore = prevReadinessScoreRef.current;
    if (profile?.readinessStatus === "incomplete" || profile?.readinessScore == null) return;
    const storageKey = "wp_readiness_milestones_shown";
    let shown: Record<string, boolean> = {};
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) shown = JSON.parse(raw);
    } catch {
      shown = {};
    }
    let crossed: 80 | 90 | null = null;
    // Show on first load (no prevScore) as long as the threshold hasn't been shown yet.
    if (currentScore >= 90 && !shown["90"] && (prevScore === undefined || prevScore < 90)) crossed = 90;
    else if (currentScore >= 80 && !shown["80"] && (prevScore === undefined || prevScore < 80)) crossed = 80;
    if (crossed) {
      setMilestoneDialogLevel(crossed);
      setMilestoneDialogOpen(true);
      shown[String(crossed)] = true;
      // If you hit 90+, consider 80 shown too to avoid a second popup later.
      if (crossed === 90) shown["80"] = true;
      try {
        localStorage.setItem(storageKey, JSON.stringify(shown));
      } catch {
        // ignore
      }
    }
    if (profile?.readinessScore !== undefined) {
      prevReadinessScoreRef.current = profile.readinessScore;
    }
  }, [profile?.readinessScore, profile?.readinessStatus]);

  const notifications: NotificationItem[] = useMemo(() => {
    const state = notifState;
    const dismissed = state.dismissed ?? {};
    const read = state.read ?? {};

    const now = new Date();
    const items: NotificationItem[] = [];

    // Alerts → action items / deadlines
    for (const a of alertList) {
      const severity: NotificationSeverity =
        a.severity === "high"
          ? "critical"
          : a.severity === "medium"
            ? "warning"
            : "info";

      const category: NotificationCategory = a.dueDate ? "deadline" : "action";
      const source: NotificationSource = a.relatedVaultType ? "vault" : "readiness";
      const dedupeKey = `alert:${a.id}`;
      if (dismissed[dedupeKey]) continue;

      const cta: NotificationCTA | undefined =
        a.actionType === "upload" || a.actionType === "renew"
          ? { label: "Open Vault", href: "/vault" }
          : a.actionType === "complete_pme"
            ? { label: "Complete PME", href: "/vault?pme=1" }
          : a.actionType === "view"
            ? { label: "View readiness", href: "/readiness" }
            : undefined;

      items.push({
        id: `alert-${a.id}`,
        title: a.title,
        body: a.message,
        severity,
        category,
        source,
        cta,
        read: Boolean(read[dedupeKey]),
        dismissible: true,
        dedupeKey,
        expiresAt: a.dueDate ?? null,
        createdAt: (a as any).createdAt ?? now.toISOString(),
        alertId: a.id,
      });
    }

    // Milestones (community posts) → success notifications
    const milestonePosts =
        posts?.filter((p) => p.type === "milestone") ?? [];
    for (const p of milestonePosts.slice(0, 5)) {
      const dedupeKey = `milestone:${p.id}`;
      if (dismissed[dedupeKey]) continue;
      const createdAt = (p.createdAt ? new Date(p.createdAt) : now).toISOString();
      items.push({
        id: `milestone-${p.id}`,
        title: "Milestone unlocked",
        body: typeof p.content === "string" ? p.content : "A new milestone was created.",
        severity: "success",
        category: "milestone",
        source: "community",
        cta: { label: "View milestones", href: "/community" },
        read: Boolean(read[dedupeKey]),
        dismissible: true,
        dedupeKey,
        expiresAt: null,
        createdAt,
      });
    }

    // Advisor / Insights nudges
    if (readiness?.capApplied) {
      const dedupeKey = `insight:capped:${readiness.capApplied.capValue}:${(readiness.capApplied.reasons ?? []).join(",")}`;
      if (!dismissed[dedupeKey]) {
        items.push({
          id: dedupeKey,
          title: "Readiness is capped",
          body: `Capped at ${readiness.capApplied.capValue} because: ${(readiness.capApplied.reasons ?? []).join(", ")}`,
          severity: "warning",
          category: "insight",
          source: "readiness",
          cta: { label: "View details", href: "/readiness" },
          read: Boolean(read[dedupeKey]),
          dismissible: true,
          dedupeKey,
          expiresAt: null,
          createdAt: now.toISOString(),
        });
      }
    } else if (readiness?.nextBestActions?.length) {
      const action = readiness.nextBestActions[0];
      const dedupeKey = `insight:next:${action}`;
      if (!dismissed[dedupeKey]) {
        items.push({
          id: dedupeKey,
          title: "Next best action",
          body: action,
          severity: "info",
          category: "insight",
          source: "advisor",
          cta: { label: "Open readiness", href: "/readiness" },
          read: Boolean(read[dedupeKey]),
          dismissible: true,
          dedupeKey,
          expiresAt: null,
          createdAt: now.toISOString(),
        });
      }
    }

    // Dedupe by dedupeKey and sort newest first
    const byKey = new Map<string, NotificationItem>();
    for (const it of items) {
      if (!byKey.has(it.dedupeKey)) byKey.set(it.dedupeKey, it);
    }
    return Array.from(byKey.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [alertList, posts, profile?.readinessStatus, readiness?.capApplied, readiness?.nextBestActions, notifState]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  useEffect(() => {
    const handler = () => {
      setProfileOpen(true);
      setTimeout(() => setEditProfileOpen(true), 100);
    };
    window.addEventListener("openProfile", handler);
    return () => window.removeEventListener("openProfile", handler);
  }, []);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d+$/.test(newPassword) || !/^\d+$/.test(confirmPassword)) {
      toast({ title: "Invalid Password", description: "Please enter numbers only.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Mismatch", description: "Passwords do not match.", variant: "destructive" });
      return;
    }
    updateProfile({ vaultPassword: newPassword, vaultLockEnabled: true });
    toast({ title: "Security Enabled", description: "Vault password has been set." });
    setValuePasswordOpen(false);
    setNewPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-black flex justify-center selection:bg-emerald-500/20">
      {/* Mobile Viewport Container */}
      <div className="w-full max-w-[430px] h-screen min-h-0 flex flex-col shadow-2xl overflow-hidden border-x border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 relative">
        
        {/* Header */}
        <header className="h-20 flex items-center justify-between px-6 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md sticky top-0 z-30 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Target className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-900 dark:text-white">Waypoints</span>
          </div>
          <div className="flex items-center gap-3">
            {profile?.isPro && (
              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/20 text-[10px] uppercase font-black px-2 py-0.5 rounded-full">PRO</Badge>
            )}
            {!profile?.isPro && (
              <button
                type="button"
                onClick={() => setPaywallOpen(true)}
                className="text-[10px] font-black uppercase tracking-widest text-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 px-2 py-1 rounded-full border border-emerald-500/40 hover:bg-emerald-500/10 transition-colors"
              >
                Get Pro
              </button>
            )}
            <Popover
              open={notificationOpen}
              onOpenChange={(open) => {
                setNotificationOpen(open);
                if (open) {
                  // Mark all currently visible notifications as read (local only).
                  setNotifState((prev) => {
                    const next = { ...prev, read: { ...prev.read }, dismissed: { ...prev.dismissed } };
                    for (const n of notifications) next.read[n.dedupeKey] = true;
                    saveNotifState(next);
                    return next;
                  });
                }
              }}
            >
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center border-2 border-transparent hover:border-emerald-500 transition-all text-slate-600 dark:text-slate-400"
                  aria-label="Notifications"
                >
                  <div className="relative">
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-950" />
                    )}
                  </div>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[320px] p-0 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl" align="end" sideOffset={8}>
                <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <h3 className="font-black text-sm text-slate-900 dark:text-white">Notifications</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                      {unreadCount > 0 ? `${unreadCount} unread` : "Mission control"}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-[10px] font-black uppercase tracking-widest"
                    onClick={() => {
                      setNotifState((prev) => {
                        const next = { ...prev, read: { ...prev.read }, dismissed: { ...prev.dismissed } };
                        for (const n of notifications) next.read[n.dedupeKey] = true;
                        saveNotifState(next);
                        return next;
                      });
                      toast({ title: "Marked as read" });
                    }}
                  >
                    Mark all read
                  </Button>
                </div>
                <div className="max-h-[60vh] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs font-bold text-slate-400">
                      All caught up.
                    </div>
                  ) : (
                    <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                      {notifications.slice(0, 10).map((n) => {
                        const dot =
                          n.severity === "critical"
                            ? "bg-rose-500"
                            : n.severity === "warning"
                              ? "bg-amber-500"
                              : n.severity === "success"
                                ? "bg-emerald-500"
                                : "bg-slate-400";

                        return (
                          <li key={n.id} className="p-3 flex gap-3">
                            <span className={`mt-1.5 w-2 h-2 rounded-full ${dot} shrink-0`} />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className={`text-xs font-black ${n.read ? "text-slate-700 dark:text-slate-300" : "text-slate-900 dark:text-white"}`}>
                                    {n.title}
                                  </p>
                                  <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                                    {n.body}
                                  </p>
                                </div>
                                {n.expiresAt && (
                                  <span className="shrink-0 text-[10px] font-black text-amber-600 dark:text-amber-400 font-mono">
                                    {format(new Date(n.expiresAt), "MMM d")}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-2">
                                {n.cta && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 px-2 rounded-lg text-[10px] font-black uppercase tracking-widest"
                                    onClick={() => {
                                      setLocation(n.cta!.href);
                                      setNotificationOpen(false);
                                    }}
                                  >
                                    {n.cta.label}
                                  </Button>
                                )}
                                {n.dismissible && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-700"
                                    onClick={async () => {
                                      // If this is an alert-backed notification, resolve it server-side too.
                                      if (typeof n.alertId === "number") {
                                        await apiFetch(api.alerts.resolve.path, {
                                          method: api.alerts.resolve.method,
                                          headers: { "Content-Type": "application/json" },
                                          body: JSON.stringify({ alertId: n.alertId }),
                                        }).catch(() => undefined);
                                      }
                                      setNotifState((prev) => {
                                        const next = { ...prev, read: { ...prev.read }, dismissed: { ...prev.dismissed } };
                                        next.dismissed[n.dedupeKey] = true;
                                        saveNotifState(next);
                                        return next;
                                      });
                                    }}
                                  >
                                    Dismiss
                                  </Button>
                                )}
                                {!n.read && (
                                  <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-none rounded-full text-[9px] font-black uppercase tracking-widest px-2 py-0.5">
                                    New
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </PopoverContent>
            </Popover>
            <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
              <DialogTrigger asChild>
                <button
                  type="button"
                  className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center border-2 border-transparent hover:border-emerald-500 transition-all text-slate-600 dark:text-slate-400"
                  aria-label="Settings"
                >
                  <Settings className="w-5 h-5" />
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-[400px] w-[95vw] rounded-[32px] p-0 border-none bg-slate-50 dark:bg-black overflow-hidden sm:rounded-[32px]">
                <div className="relative">
                  <DialogHeader className="p-6 pb-2">
                    <div className="flex items-center justify-center relative">
                      <DialogTitle className="text-lg font-black text-slate-900 dark:text-white">Profile</DialogTitle>
                      <DialogClose className="absolute right-0 top-0 w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">
                        <X className="w-4 h-4" />
                      </DialogClose>
                    </div>
                  </DialogHeader>

                  <div className="px-6 pb-8 space-y-6 overflow-y-auto max-h-[80vh]">
                    {/* Profile Header Card — click to edit name & photo */}
                    <Dialog open={editProfileOpen} onOpenChange={(open) => {
                      setEditProfileOpen(open);
                      if (open && profile) {
                        setEditFirstName(profile.firstName ?? "");
                        setEditLastName(profile.lastName ?? "");
                        setEditAvatarUrl(profile.avatarUrl ?? null);
                      }
                    }}>
                      <DialogTrigger asChild>
                        <button className="w-full p-4 bg-white dark:bg-slate-900 rounded-3xl flex items-center justify-between shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left">
                          <div className="flex items-center gap-4">
                            <div className="relative">
                              <Avatar className="w-14 h-14 border-2 border-white dark:border-slate-800 shadow-md">
                                <AvatarImage src={profile?.avatarUrl ?? undefined} alt="" className="object-cover" />
                                <AvatarFallback className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold">
                                  {[profile?.firstName?.[0], profile?.lastName?.[0]].filter(Boolean).join("") || "?"}
                                </AvatarFallback>
                              </Avatar>
                              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-amber-500 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center">
                                <span className="text-[10px] text-white font-black">+</span>
                              </div>
                            </div>
                            <div>
                              <h3 className="font-black text-slate-900 dark:text-white leading-tight">
                                {[profile?.firstName, profile?.lastName].filter(Boolean).join(" ").trim() || "Add your name"}
                              </h3>
                              <p className="text-xs font-bold text-slate-500">{profile?.branch ?? "Marine Corps"}</p>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-slate-300" />
                        </button>
                      </DialogTrigger>
                      <DialogContent className="max-w-[360px] w-[95vw] rounded-3xl p-0 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
                        <DialogHeader className="p-4 pb-2">
                          <DialogTitle className="text-base font-black text-slate-900 dark:text-white">Edit profile</DialogTitle>
                        </DialogHeader>
                        <form
                          className="px-4 pb-6 space-y-4"
                          onSubmit={(e) => {
                            e.preventDefault();
                            updateProfile({
                              firstName: editFirstName.trim() || undefined,
                              lastName: editLastName.trim() || undefined,
                              avatarUrl: editAvatarUrl || undefined,
                            });
                            setEditProfileOpen(false);
                            toast({ title: "Profile updated" });
                          }}
                        >
                          <div className="flex flex-col items-center gap-4">
                            <label className="relative cursor-pointer">
                              <Avatar className="w-20 h-20 border-2 border-slate-200 dark:border-slate-700">
                                <AvatarImage src={editAvatarUrl ?? undefined} alt="" className="object-cover" />
                                <AvatarFallback className="bg-slate-200 dark:bg-slate-700 text-slate-500 text-xl font-bold">
                                  {[editFirstName?.[0], editLastName?.[0]].filter(Boolean).join("") || "?"}
                                </AvatarFallback>
                              </Avatar>
                              <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-amber-500 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center">
                                <span className="text-xs text-white font-black">+</span>
                              </div>
                              <input
                                type="file"
                                accept="image/*"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onload = () => setEditAvatarUrl(reader.result as string);
                                    reader.readAsDataURL(file);
                                  }
                                }}
                              />
                            </label>
                            <div className="w-full space-y-3">
                              <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">First name</label>
                                <Input
                                  value={editFirstName}
                                  onChange={(e) => setEditFirstName(e.target.value)}
                                  placeholder="First name"
                                  className="rounded-xl h-11 font-bold"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">Last name</label>
                                <Input
                                  value={editLastName}
                                  onChange={(e) => setEditLastName(e.target.value)}
                                  placeholder="Last name"
                                  className="rounded-xl h-11 font-bold"
                                />
                              </div>
                            </div>
                          </div>
                          <Button type="submit" className="w-full h-11 rounded-xl font-black uppercase tracking-widest">
                            Save
                          </Button>
                        </form>
                      </DialogContent>
                    </Dialog>

                    {/* Career Section */}
                    <div className="space-y-3">
                      <h4 className="text-lg font-black text-slate-900 dark:text-white px-1">Career</h4>
                      <div className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-sm divide-y divide-slate-50 dark:divide-slate-800">
                        <Dialog open={rankGradeOpen} onOpenChange={setRankGradeOpen}>
                          <DialogTrigger asChild>
                            <button className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">
                                  <Trophy className="w-4 h-4" />
                                </div>
                                <div className="text-left">
                                  <p className="text-sm font-black text-slate-900 dark:text-white">Rank & Grade</p>
                                  <p className="text-[10px] font-bold text-slate-500">{profile?.rank ?? "Select rank"}</p>
                                </div>
                              </div>
                              <ChevronRight className="w-4 h-4 text-slate-300" />
                            </button>
                          </DialogTrigger>
                          <DialogContent className="max-w-[320px] w-[90vw] rounded-3xl p-0 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                            <DialogHeader className="p-4 pb-2">
                              <DialogTitle className="text-base font-black text-slate-900 dark:text-white">Rank & Grade</DialogTitle>
                            </DialogHeader>
                            <div className="px-4 pb-4 space-y-1 max-h-[60vh] overflow-y-auto">
                              {ENLISTED_RANKS.map((rank) => (
                                <button
                                  key={rank}
                                  onClick={() => {
                                    updateProfile({ rank });
                                    setRankGradeOpen(false);
                                  }}
                                  className={`w-full py-3 px-4 rounded-xl text-left font-bold text-sm transition-colors ${profile?.rank === rank ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400" : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"}`}
                                >
                                  {rank}
                                </button>
                              ))}
                            </div>
                          </DialogContent>
                        </Dialog>

                        <button className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">
                              <UserCircle className="w-4 h-4" />
                            </div>
                            <div className="text-left">
                              <p className="text-sm font-black text-slate-900 dark:text-white">MOS</p>
                              <p className="text-[10px] font-bold text-slate-500">0231</p>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-300" />
                        </button>

                        <Dialog open={tisOpen} onOpenChange={(open) => {
                          setTisOpen(open);
                          if (open) setEditTisMonths((profile?.tisMonths ?? 0).toString());
                        }}>
                          <DialogTrigger asChild>
                            <button className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">
                                  <Clock className="w-4 h-4" />
                                </div>
                                <div className="text-left">
                                  <p className="text-sm font-black text-slate-900 dark:text-white">Time in Service</p>
                                  <p className="text-[10px] font-bold text-slate-500">
                                    {(profile?.tisMonths ?? 0)} months
                                  </p>
                                </div>
                              </div>
                              <ChevronRight className="w-4 h-4 text-slate-300" />
                            </button>
                          </DialogTrigger>
                          <DialogContent className="max-w-[320px] w-[90vw] rounded-3xl p-0 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                            <DialogHeader className="p-4 pb-2">
                              <DialogTitle className="text-base font-black text-slate-900 dark:text-white">Time in Service</DialogTitle>
                            </DialogHeader>
                            <form
                              className="px-4 pb-4 space-y-4"
                              onSubmit={(e) => {
                                e.preventDefault();
                                const val = parseInt(editTisMonths, 10);
                                if (Number.isNaN(val) || val < 0) return;

                                const currentTig = profile?.tigMonths ?? 0;
                                if (val < currentTig) {
                                  updateProfile({ tisMonths: val, tigMonths: val });
                                  toast({
                                    title: "Adjusted Time in Grade",
                                    description: "Time in Grade was reduced to match Time in Service.",
                                  });
                                } else {
                                  updateProfile({ tisMonths: val });
                                }
                                setTisOpen(false);
                              }}
                            >
                              <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">
                                  Months in service
                                </label>
                                <Input
                                  type="number"
                                  min={0}
                                  value={editTisMonths}
                                  onChange={(e) => setEditTisMonths(e.target.value)}
                                  className="rounded-xl h-11 font-bold"
                                />
                              </div>
                              <Button type="submit" className="w-full h-11 rounded-xl font-black uppercase tracking-widest">
                                Save
                              </Button>
                            </form>
                          </DialogContent>
                        </Dialog>

                        <Dialog open={tigOpen} onOpenChange={(open) => {
                          setTigOpen(open);
                          if (open) setEditTigMonths((profile?.tigMonths ?? 0).toString());
                        }}>
                          <DialogTrigger asChild>
                            <button className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">
                                  <Clock className="w-4 h-4" />
                                </div>
                                <div className="text-left">
                                  <p className="text-sm font-black text-slate-900 dark:text-white">Time in Grade</p>
                                  <p className="text-[10px] font-bold text-slate-500">
                                    {(profile?.tigMonths ?? 0)} months
                                  </p>
                                </div>
                              </div>
                              <ChevronRight className="w-4 h-4 text-slate-300" />
                            </button>
                          </DialogTrigger>
                          <DialogContent className="max-w-[320px] w-[90vw] rounded-3xl p-0 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                            <DialogHeader className="p-4 pb-2">
                              <DialogTitle className="text-base font-black text-slate-900 dark:text-white">Time in Grade</DialogTitle>
                            </DialogHeader>
                            <form
                              className="px-4 pb-4 space-y-4"
                              onSubmit={(e) => {
                                e.preventDefault();
                                const val = parseInt(editTigMonths, 10);
                                if (Number.isNaN(val) || val < 0) return;

                                const tis = profile?.tisMonths ?? 0;
                                if (val > tis) {
                                  toast({
                                    title: "Invalid Time in Grade",
                                    description: "Time in Grade cannot be greater than Time in Service.",
                                    variant: "destructive",
                                  });
                                  return;
                                }

                                updateProfile({ tigMonths: val });
                                setTigOpen(false);
                              }}
                            >
                              <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">
                                  Months in current grade
                                </label>
                                <Input
                                  type="number"
                                  min={0}
                                  value={editTigMonths}
                                  onChange={(e) => setEditTigMonths(e.target.value)}
                                  className="rounded-xl h-11 font-bold"
                                />
                              </div>
                              <Button type="submit" className="w-full h-11 rounded-xl font-black uppercase tracking-widest">
                                Save
                              </Button>
                            </form>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>

                    {/* Customize Section */}
                    <div className="space-y-3">
                      <h4 className="text-lg font-black text-slate-900 dark:text-white px-1">Customize</h4>
                      <div className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-sm divide-y divide-slate-50 dark:divide-slate-800">
                        <Dialog open={valuePasswordOpen} onOpenChange={setValuePasswordOpen}>
                          <DialogTrigger asChild>
                            <button className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">
                                  <ShieldAlert className="w-4 h-4" />
                                </div>
                                <p className="text-sm font-black text-slate-900 dark:text-white">Value Password</p>
                              </div>
                              <ChevronRight className="w-4 h-4 text-slate-300" />
                            </button>
                          </DialogTrigger>
                          <DialogContent className="max-w-[350px] w-[90vw] rounded-[24px] border-none bg-white dark:bg-slate-900 p-6 shadow-2xl">
                            <div className="space-y-6">
                              <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">Enable Feature</h3>
                                  <p className="text-[10px] text-slate-400 font-bold">Secure your career vault</p>
                                </div>
                                <Switch 
                                  checked={profile?.vaultLockEnabled || (!profile?.vaultPassword && newPassword.length > 0)} 
                                  onCheckedChange={(val) => {
                                    if (val && !profile?.vaultPassword) {
                                      // If no password exists, user needs to fill the form below.
                                      // We can't actually "turn on" the switch in the DB yet, 
                                      // but we can show the form.
                                    } else {
                                      updateProfile({ vaultLockEnabled: val });
                                    }
                                  }}
                                />
                              </div>

                              {(profile?.vaultLockEnabled || !profile?.vaultPassword) && (
                                <form onSubmit={handlePasswordSubmit} className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                  <div className="space-y-4">
                                    <div className="space-y-2">
                                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        Enter your password
                                      </label>
                                      <Input 
                                        type="password"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="h-12 rounded-xl bg-slate-50 dark:bg-slate-800 border-none font-black text-center text-lg tracking-[1em]"
                                        disabled={!profile?.vaultLockEnabled && !!profile?.vaultPassword}
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        Confirm your password
                                      </label>
                                      <Input 
                                        type="password"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="h-12 rounded-xl bg-slate-50 dark:bg-slate-800 border-none font-black text-center text-lg tracking-[1em]"
                                        disabled={!profile?.vaultLockEnabled && !!profile?.vaultPassword}
                                      />
                                    </div>
                                  </div>
                                  <Button 
                                    type="submit" 
                                    className="w-full h-12 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase tracking-widest"
                                    disabled={!profile?.vaultLockEnabled && !!profile?.vaultPassword}
                                  >
                                    Secure Vault
                                  </Button>
                                </form>
                              )}
                              
                              {!profile?.vaultLockEnabled && profile?.vaultPassword && (
                                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center">
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    Feature Disabled
                                  </p>
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>

                        <button className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">
                              <Palette className="w-4 h-4" />
                            </div>
                            <p className="text-sm font-black text-slate-900 dark:text-white">Theme</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-300" />
                        </button>
                        <button className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">
                              <AppWindow className="w-4 h-4" />
                            </div>
                            <p className="text-sm font-black text-slate-900 dark:text-white">App Icon</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-300" />
                        </button>
                      </div>
                    </div>

                    {/* Danger Zone (stubbed for prototype, no auth) */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-sm divide-y divide-slate-50 dark:divide-slate-800">
                      <button className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">
                            <Database className="w-4 h-4" />
                          </div>
                          <p className="text-sm font-black text-slate-900 dark:text-white">Account Data</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300" />
                      </button>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 min-h-0 overflow-y-auto pb-24 pt-4 px-0 scroll-smooth relative overscroll-none">
          {children}
        </main>

        {/* Bottom Tab Bar */}
        <nav className="sticky bottom-0 left-0 right-0 w-full h-20 glass z-50 px-4 flex items-center justify-around pb-2 shadow-[0_-8px_20px_rgba(0,0,0,0.05)] border-t border-slate-100 dark:border-slate-800">
          {navItems.map((item) => {
            const isActive = location === item.url;
            return (
              <Link key={item.title} href={item.url} className="flex flex-col items-center gap-1.5 transition-all duration-300 group">
                  <div className={`p-1.5 rounded-xl transition-all duration-300 ${isActive ? 'text-emerald-500 scale-110' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-400'}`}>
                    <item.icon className={`w-6 h-6 ${isActive ? 'fill-emerald-500/10 stroke-[2.5px]' : 'stroke-[1.5px]'}`} />
                  </div>
                  <span className={`text-[10px] font-bold tracking-tight uppercase ${isActive ? 'text-emerald-500' : 'text-slate-400 dark:text-slate-500'}`}>
                    {item.title}
                  </span>
                  {isActive && (
                    <div className="absolute -top-1 w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                  )}
              </Link>
            );
          })}
        </nav>

        {/* Global readiness milestone popup (80+ / 90+) — Instagram shareable */}
        <Dialog open={milestoneDialogOpen} onOpenChange={setMilestoneDialogOpen}>
          <DialogContent className="rounded-[32px] border-none max-w-[90vw] sm:max-w-[400px] p-0 overflow-hidden bg-slate-900 text-white">
            <div className="relative p-8 text-center">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/40 via-slate-900 to-slate-950 opacity-80" />
              <div className="relative z-10 space-y-4">
                <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <Trophy className="w-10 h-10 text-emerald-300" />
                </div>
                <DialogHeader className="space-y-1">
                  <DialogTitle className="text-2xl font-black text-white">
                    {milestoneDialogLevel === 90
                      ? "Elite Readiness"
                      : "Excellent Readiness"}
                  </DialogTitle>
                  <DialogDescription className="text-emerald-100 text-sm font-bold">
                    Your readiness just crossed {milestoneDialogLevel}% — keep pressing, Marine.
                  </DialogDescription>
                </DialogHeader>
                <p className="text-xs font-bold text-emerald-100/80 uppercase tracking-widest">
                  Current score: {profile?.readinessScore ?? 0}
                </p>
                {milestoneDialogLevel !== null && (profile?.readinessScore ?? 0) >= 80 && (
                  <>
                    <div className="mt-4 space-y-2 text-left bg-slate-900/60 border border-emerald-500/30 rounded-2xl p-4">
                      <p className="text-[11px] font-black uppercase tracking-widest text-emerald-300 mb-1">
                        Instagram-ready shoutout
                      </p>
                      <p className="text-xs font-medium text-emerald-50 leading-relaxed">
                        Screenshot this and share:{" "}
                        <span className="font-semibold">
                          &quot;Just hit {profile?.readinessScore ?? 0}% readiness in Waypoints. Training, PME, and finances on lock — who&apos;s joining me?&quot;
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

        <PaywallModal open={paywallOpen} onOpenChange={setPaywallOpen} />
      </div>
    </div>
  );
}
