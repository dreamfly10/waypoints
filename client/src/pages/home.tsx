import { useProfile } from "@/hooks/use-profile";
import { useAlerts } from "@/hooks/use-alerts";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, CheckCircle2, Info, ChevronRight, Activity, Award } from "lucide-react";
import { Link } from "wouter";

export default function Home() {
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: alerts, isLoading: alertsLoading } = useAlerts();

  return (
    <AppLayout>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Header Section */}
        <div>
          <h1 className="text-3xl md:text-4xl font-bold font-display text-foreground tracking-tight">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Welcome back. Here is your current career snapshot.
          </p>
        </div>

        {/* Top Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Readiness Score Card */}
          <Card className="hover-elevate border-accent/20 shadow-sm lg:col-span-2 relative overflow-hidden group">
            <div className="absolute right-0 top-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none group-hover:bg-accent/10 transition-colors duration-500" />
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Activity className="w-5 h-5 text-accent" />
                Overall Readiness
              </CardTitle>
              <CardDescription>Composite score based on your vault and physical fitness.</CardDescription>
            </CardHeader>
            <CardContent>
              {profileLoading ? (
                <Skeleton className="h-12 w-full mt-4" />
              ) : (
                <div className="mt-4">
                  <div className="flex justify-between items-end mb-3">
                    <span className="text-4xl font-bold font-display tracking-tighter text-foreground">
                      {profile?.readinessScore}<span className="text-xl text-muted-foreground font-medium">/100</span>
                    </span>
                    <span className="text-sm font-medium text-accent">Optimal Range</span>
                  </div>
                  <Progress value={profile?.readinessScore || 0} className="h-3 bg-secondary" indicatorClassName="bg-accent" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Snapshot Card */}
          <Card className="hover-elevate shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Award className="w-5 h-5 text-muted-foreground" />
                Profile Snapshot
              </CardTitle>
            </CardHeader>
            <CardContent>
              {profileLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ) : (
                <div className="space-y-4 font-mono text-sm">
                  <div className="flex justify-between border-b border-border/50 pb-2">
                    <span className="text-muted-foreground">Branch</span>
                    <span className="font-semibold text-foreground">{profile?.branch}</span>
                  </div>
                  <div className="flex justify-between border-b border-border/50 pb-2">
                    <span className="text-muted-foreground">Rank</span>
                    <span className="font-semibold text-foreground">{profile?.rank}</span>
                  </div>
                  <div className="flex justify-between border-b border-border/50 pb-2">
                    <span className="text-muted-foreground">MOS</span>
                    <span className="font-semibold text-foreground">{profile?.mos}</span>
                  </div>
                  <div className="flex justify-between pb-1">
                    <span className="text-muted-foreground">Latest PFT</span>
                    <span className="font-semibold text-foreground">{profile?.pftScore}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Action Items / Alerts */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold font-display">Action Items</h2>
            <Link href="/readiness" className="text-sm text-accent hover:underline font-medium flex items-center">
              View All <ChevronRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
          
          <div className="grid gap-3">
            {alertsLoading ? (
              Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)
            ) : alerts?.length === 0 ? (
              <div className="p-8 text-center bg-secondary/30 rounded-xl border border-border/50 text-muted-foreground">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-3 opacity-50" />
                <p>No pending action items. You're up to date.</p>
              </div>
            ) : (
              alerts?.map((alert) => (
                <div 
                  key={alert.id}
                  className={`
                    p-4 rounded-xl border flex items-start gap-4 transition-all hover-elevate
                    ${alert.type === 'warning' ? 'bg-destructive/5 border-destructive/20' : 
                      alert.type === 'success' ? 'bg-accent/5 border-accent/20' : 
                      'bg-secondary/50 border-border'}
                  `}
                >
                  <div className="mt-0.5 shrink-0">
                    {alert.type === 'warning' && <AlertCircle className="w-5 h-5 text-destructive" />}
                    {alert.type === 'success' && <CheckCircle2 className="w-5 h-5 text-accent" />}
                    {alert.type === 'info' && <Info className="w-5 h-5 text-blue-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium text-sm ${!alert.isRead ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {alert.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 font-mono">{alert.date}</p>
                  </div>
                  {!alert.isRead && (
                    <div className="w-2 h-2 rounded-full bg-accent shrink-0 mt-1.5" />
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
