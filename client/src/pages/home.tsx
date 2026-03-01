import { useProfile } from "@/hooks/use-profile";
import { useAlerts } from "@/hooks/use-alerts";
import { useCreateCommunityPost } from "@/hooks/use-community";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, Info, ChevronRight, Activity, Award, Share2 } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function Home() {
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: alerts, isLoading: alertsLoading } = useAlerts();
  const { mutate: shareMilestone, isPending: isSharing } = useCreateCommunityPost();
  const { toast } = useToast();

  const handleShareMilestone = () => {
    if (!profile) return;
    
    shareMilestone({
      author: "Current User",
      content: `I've reached a readiness score of ${profile.readinessScore}! My career is on track.`,
      type: "milestone",
      milestoneCard: {
        title: "Readiness Milestone",
        score: profile.readinessScore,
        delta: 10, // Mock delta
        date: format(new Date(), 'MMM d, yyyy')
      },
      date: format(new Date(), 'MMM d, yyyy')
    }, {
      onSuccess: () => {
        toast({
          title: "Milestone Shared",
          description: "Your achievement has been posted to the community feed.",
        });
      }
    });
  };

  return (
    <AppLayout>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold font-display text-foreground tracking-tight">
              Dashboard
            </h1>
            <p className="text-muted-foreground mt-2 text-lg">
              Welcome back. Here is your current career snapshot.
            </p>
          </div>
          {profile && profile.readinessScore >= 70 && (
            <Button 
              onClick={handleShareMilestone}
              disabled={isSharing}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share Milestone
            </Button>
          )}
        </div>

        {/* Top Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Readiness Score Card */}
          <Card className="card-ios shadow-emerald-500/5 lg:col-span-2 relative overflow-hidden group">
            <div className="absolute right-0 top-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none group-hover:bg-emerald-500/10 transition-colors duration-500" />
            <CardHeader className="pb-2">
              <CardTitle className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                <Activity className="w-5 h-5 text-emerald-500" />
                Overall Readiness
              </CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400">Composite score based on your vault and physical fitness.</CardDescription>
            </CardHeader>
            <CardContent>
              {profileLoading ? (
                <Skeleton className="h-12 w-full mt-4 rounded-2xl" />
              ) : (
                <div className="mt-4">
                  <div className="flex justify-between items-end mb-3">
                    <span className="text-5xl font-black tracking-tighter text-slate-900 dark:text-white">
                      {profile?.readinessScore}<span className="text-xl text-slate-400 dark:text-slate-500 font-bold">/100</span>
                    </span>
                    <span className="text-xs font-black uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full">Optimal</span>
                  </div>
                  <Progress value={profile?.readinessScore || 0} className="h-3 bg-slate-100 dark:bg-slate-800" indicatorClassName="bg-emerald-500 rounded-full" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Snapshot Card */}
          <Card className="card-ios shadow-slate-200/50 dark:shadow-none">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                <Award className="w-5 h-5 text-slate-400" />
                Profile Snapshot
              </CardTitle>
            </CardHeader>
            <CardContent>
              {profileLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-4 w-full rounded-full" />
                  <Skeleton className="h-4 w-3/4 rounded-full" />
                  <Skeleton className="h-4 w-full rounded-full" />
                </div>
              ) : (
                <div className="space-y-4 font-bold text-sm">
                  <div className="flex justify-between border-b border-slate-50 dark:border-slate-800 pb-2">
                    <span className="text-slate-400 dark:text-slate-500">Branch</span>
                    <span className="text-slate-900 dark:text-white">{profile?.branch}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-50 dark:border-slate-800 pb-2">
                    <span className="text-slate-400 dark:text-slate-500">Rank</span>
                    <span className="text-slate-900 dark:text-white">{profile?.rank}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-50 dark:border-slate-800 pb-2">
                    <span className="text-slate-400 dark:text-slate-500">MOS</span>
                    <span className="text-slate-900 dark:text-white">{profile?.mos}</span>
                  </div>
                  <div className="flex justify-between pb-1">
                    <span className="text-slate-400 dark:text-slate-500">Latest PFT</span>
                    <span className="text-emerald-500 font-black">{profile?.pftScore}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Action Items / Alerts */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Action Items</h2>
            <Link href="/readiness" className="text-xs font-black uppercase tracking-widest text-emerald-500 hover:text-emerald-600 transition-colors">
              See All
            </Link>
          </div>
          
          <div className="grid gap-3">
            {alertsLoading ? (
              Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-3xl" />)
            ) : alerts?.length === 0 ? (
              <div className="p-10 text-center bg-slate-50 dark:bg-slate-900 rounded-[32px] border border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-4 opacity-20" />
                <p className="font-bold text-sm">Tactical update complete. All systems green.</p>
              </div>
            ) : (
              alerts?.map((alert) => (
                <div 
                  key={alert.id}
                  className={`
                    p-5 rounded-[24px] flex items-center gap-4 transition-all hover:scale-[1.02] active:scale-95
                    ${alert.severity === 'high' ? 'bg-rose-50 dark:bg-rose-500/10' : 
                      alert.severity === 'medium' ? 'bg-amber-50 dark:bg-amber-500/10' : 
                      'bg-slate-50 dark:bg-slate-900/50'}
                  `}
                >
                  <div className="shrink-0">
                    {alert.severity === 'high' && <div className="p-2 bg-rose-500 rounded-xl shadow-lg shadow-rose-500/20"><AlertCircle className="w-5 h-5 text-white" /></div>}
                    {alert.severity === 'medium' && <div className="p-2 bg-amber-500 rounded-xl shadow-lg shadow-amber-500/20"><Info className="w-5 h-5 text-white" /></div>}
                    {alert.severity === 'low' && <div className="p-2 bg-slate-400 rounded-xl shadow-lg shadow-slate-400/20"><CheckCircle2 className="w-5 h-5 text-white" /></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-slate-900 dark:text-slate-100">
                      {alert.title}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                      {alert.message}
                    </p>
                  </div>
                  {!alert.isRead && (
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 shadow-sm shadow-emerald-500/50" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </AppLayout>
  );
}
