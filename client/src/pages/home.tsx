import { useProfile } from "@/hooks/use-profile";
import { useAlerts } from "@/hooks/use-alerts";
import { useCommunityPosts, useCreateCommunityPost } from "@/hooks/use-community";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, Info, ChevronRight, Share2, ArrowUpRight, Calendar, Trophy } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function Home() {
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: alerts, isLoading: alertsLoading } = useAlerts();
  const { data: posts, isLoading: postsLoading } = useCommunityPosts();
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
        delta: 3,
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

  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const actionItems = alerts?.filter(a => a.severity === 'high' || a.severity === 'medium').slice(0, 3) || [];
  const deadlines = alerts?.filter(a => a.dueDate || a.relatedVaultType === 'pft').slice(0, 3) || [];
  const recentMilestones = posts?.filter(p => p.type === 'milestone').slice(0, 2) || [];

  return (
    <AppLayout>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-8">
        
        {/* Greeting Header */}
        <div className="flex justify-between items-start pt-2">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              {getTimeGreeting()}, {profile?.rank || "SGT"}.
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
        <Card className="card-ios bg-slate-900 dark:bg-emerald-950/20 text-white overflow-hidden relative border-none shadow-xl shadow-emerald-500/10">
          <div className="absolute right-0 top-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
          <CardContent className="p-8 flex items-center justify-between gap-6">
            <div className="relative flex items-center justify-center shrink-0">
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
                  strokeDashoffset={364 - (364 * (profile?.readinessScore || 0)) / 100}
                  strokeLinecap="round"
                  className="text-emerald-400 transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-black">{profile?.readinessScore || 0}</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-white/50">Score</span>
              </div>
            </div>
            
            <div className="flex-1 space-y-4">
              <div>
                <h3 className="text-xl font-bold leading-tight">Overall Readiness</h3>
                <div className="flex items-center gap-1.5 mt-1">
                  <div className="flex items-center text-emerald-400 text-xs font-black">
                    <ArrowUpRight className="w-3 h-3 mr-0.5" />
                    +3 THIS WEEK
                  </div>
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

        {/* Action Items Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Action Items</h2>
            <Link href="/readiness" className="text-[10px] font-black uppercase tracking-widest text-emerald-500">
              Manage
            </Link>
          </div>
          
          <div className="grid gap-3">
            {alertsLoading ? (
              Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-3xl" />)
            ) : actionItems.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 dark:bg-slate-900/50 rounded-[32px] border border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-3 opacity-20" />
                <p className="font-bold text-xs">All clear on your end.</p>
              </div>
            ) : (
              actionItems.map((alert) => (
                <div key={alert.id} className="p-4 bg-white dark:bg-slate-900 rounded-[24px] border border-slate-100 dark:border-slate-800 flex items-center gap-4 shadow-sm">
                  <div className={`w-2 h-10 rounded-full shrink-0 ${alert.severity === 'high' ? 'bg-rose-500' : 'bg-amber-500'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">{alert.title}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Tactical requirement</p>
                  </div>
                  <Button size="sm" variant="secondary" className="h-8 rounded-lg text-[10px] font-black uppercase px-3 tracking-widest">
                    {alert.actionType === 'upload' ? 'Upload' : alert.actionType === 'renew' ? 'Renew' : 'Resolve'}
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Upcoming Deadlines */}
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

        {/* Recent Milestones */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Recent Milestones</h2>
            <Link href="/community" className="text-[10px] font-black uppercase tracking-widest text-emerald-500">
              Community
            </Link>
          </div>
          
          <div className="space-y-3">
            {postsLoading ? (
              Array(2).fill(0).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-3xl" />)
            ) : recentMilestones.length === 0 ? (
              <p className="text-xs text-slate-400 font-medium px-1 text-center py-4">No recent community milestones.</p>
            ) : recentMilestones.map((post) => (
              <div key={post.id} className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-[24px] border border-slate-100 dark:border-slate-800 flex items-start gap-4">
                <div className="p-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm">
                  <Trophy className="w-5 h-5 text-amber-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-emerald-500">{post.author}</span>
                    <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">{post.date}</span>
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
