import { AppLayout } from "@/components/layout/app-layout";
import { useProfile } from "@/hooks/use-profile";
import { useVaultItems } from "@/hooks/use-vault";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, Target, FileCheck, TrendingUp, AlertTriangle } from "lucide-react";

export default function Readiness() {
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: items, isLoading: itemsLoading } = useVaultItems();

  const vaultCompleteness = items ? Math.min(Math.round((items.length / 5) * 100), 100) : 0;
  const pftScorePercentage = profile ? Math.min(Math.round((profile.pftScore / 300) * 100), 100) : 0;

  return (
    <AppLayout>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        <div>
          <h1 className="text-3xl md:text-4xl font-bold font-display text-foreground tracking-tight flex items-center gap-3">
            <Target className="w-8 h-8 text-accent" />
            Combat Readiness
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Detailed breakdown of your career metrics and requirements.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Score Display */}
          <Card className="lg:col-span-1 bg-foreground text-background overflow-hidden relative border-none">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-accent/20 via-transparent to-transparent opacity-50" />
            <CardHeader className="pb-0 relative z-10">
              <CardTitle className="text-background/80 text-sm uppercase tracking-widest font-mono">Composite Score</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 relative z-10 flex flex-col items-center justify-center py-10">
              {profileLoading ? (
                <Skeleton className="h-32 w-32 rounded-full bg-background/20" />
              ) : (
                <div className="relative flex items-center justify-center">
                  <svg className="w-48 h-48 transform -rotate-90">
                    <circle 
                      cx="96" cy="96" r="88" 
                      className="stroke-background/10" 
                      strokeWidth="12" fill="none" 
                    />
                    <circle 
                      cx="96" cy="96" r="88" 
                      className="stroke-accent transition-all duration-1000 ease-out" 
                      strokeWidth="12" fill="none" 
                      strokeDasharray="552" 
                      strokeDashoffset={552 - (552 * (profile?.readinessScore || 0)) / 100}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center text-center">
                    <span className="text-6xl font-black font-display tracking-tighter text-white">
                      {profile?.readinessScore}
                    </span>
                    <span className="text-background/60 font-mono text-sm mt-1">out of 100</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Breakdown Cards */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
            
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-muted-foreground" />
                  Vault Completeness
                </CardTitle>
                <CardDescription>Required administrative documents.</CardDescription>
              </CardHeader>
              <CardContent>
                {itemsLoading ? (
                  <Skeleton className="h-8 w-full" />
                ) : (
                  <div>
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-2xl font-bold font-display">{vaultCompleteness}%</span>
                      <span className="text-xs text-muted-foreground font-mono">{items?.length} items</span>
                    </div>
                    <Progress value={vaultCompleteness} className="h-2" />
                    {vaultCompleteness < 100 && (
                      <div className="mt-4 flex items-start gap-2 text-xs text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-500/10 p-2 rounded border border-amber-200 dark:border-amber-500/20">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <p>Missing recent evaluation and medical clearance.</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-muted-foreground" />
                  Physical Fitness (PFT)
                </CardTitle>
                <CardDescription>Latest recorded assessment score.</CardDescription>
              </CardHeader>
              <CardContent>
                {profileLoading ? (
                  <Skeleton className="h-8 w-full" />
                ) : (
                  <div>
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-2xl font-bold font-display">{profile?.pftScore}</span>
                      <span className="text-xs text-muted-foreground font-mono">Max 300</span>
                    </div>
                    <Progress value={pftScorePercentage} className="h-2" indicatorClassName={profile!.pftScore >= 280 ? "bg-accent" : ""} />
                    <p className="text-xs text-muted-foreground mt-4 pt-4 border-t border-border/50">
                      Top 15% in your age group. Next test due in 3 months.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

          </div>
        </div>
      </div>
    </AppLayout>
  );
}
