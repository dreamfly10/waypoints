import { useProfile, useUpdateProfile } from "@/hooks/use-profile";
import { useAlerts } from "@/hooks/use-alerts";
import { useVaultItems } from "@/hooks/use-vault";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  AlertCircle, 
  CheckCircle2, 
  ChevronRight, 
  TrendingUp, 
  Trophy, 
  Calendar, 
  DollarSign,
  Zap,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import React, { useState, useMemo } from "react";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";

export default function Readiness() {
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: alerts, isLoading: alertsLoading } = useAlerts();
  const { data: vaultItems } = useVaultItems();
  
  const [isSimulating, setIsSimulating] = useState(false);
  const [simPft, setSimPft] = useState(profile?.pftScore || 180);
  const [simCerts, setSimCerts] = useState(false);
  const [showSimulator, setShowSimulator] = useState(false);

  // Simulation Logic
  const simulatedScore = useMemo(() => {
    if (!profile) return 0;
    let base = 40;
    
    // Vault bonuses (simplified from server logic)
    const hasPft = vaultItems?.some(i => i.type === 'pft') || simPft > 180;
    const hasPromotionLetter = vaultItems?.some(i => i.type === 'promotion_letter');
    const hasCerts = vaultItems?.some(i => i.type === 'cert') || simCerts;
    const hasOrders = vaultItems?.some(i => i.type === 'orders');

    if (hasPft) base += 10;
    if (hasPromotionLetter) base += 15;
    if (hasCerts) base += 10;
    if (hasOrders) base += 5;

    // PFT Bucket
    const pft = simPft;
    if (pft >= 290) base += 20;
    else if (pft >= 270) base += 15;
    else if (pft >= 240) base += 10;
    else if (pft >= 210) base += 5;

    return Math.min(profile.isPro ? 100 : 95, base);
  }, [profile, vaultItems, simPft, simCerts]);

  const currentScore = profile?.readinessScore || 0;
  const displayScore = isSimulating ? simulatedScore : currentScore;

  const missingItems = alerts?.filter(a => a.severity === 'high' || a.severity === 'medium') || [];
  const docCompletion = useMemo(() => {
    const totalRequired = 4; // PFT, Promotion, Cert, Orders
    const types = new Set(vaultItems?.map(i => i.type));
    const count = Array.from(types).filter(t => ['pft', 'promotion_letter', 'cert', 'orders'].includes(t)).length;
    return Math.round((count / totalRequired) * 100);
  }, [vaultItems]);

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

          {/* Animated Composite Score Circle */}
          <div className={`relative flex items-center justify-center py-4 ${displayScore !== currentScore ? 'score-pulse' : ''}`}>
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
                animate={{ strokeDashoffset: 553 - (553 * displayScore) / 100 }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                strokeLinecap="round"
                className="text-emerald-500 transition-all"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.span 
                key={displayScore}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-6xl font-black text-slate-900 dark:text-white tracking-tighter"
              >
                {displayScore}
              </motion.span>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Composite Score</span>
            </div>
            {isSimulating && (
              <div className="absolute top-0 right-1/4">
                <Badge className="bg-amber-500 text-white animate-pulse border-none font-black text-[10px] px-2 py-1 uppercase">Simulating</Badge>
              </div>
            )}
          </div>
        </div>

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
                <span className="text-lg font-black text-slate-900 dark:text-white">{profile?.pftScore || 180}</span>
              </div>
              <div className="bg-blue-50 dark:bg-blue-500/10 p-3 rounded-xl">
                <p className="text-[11px] font-bold text-blue-600 dark:text-blue-400 leading-tight">
                  Improve by <span className="font-black">20 points</span> to increase readiness by <span className="font-black">5%</span>.
                </p>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <span>Current Level</span>
                  <span>Target: 300</span>
                </div>
                <Progress value={((profile?.pftScore || 180) / 300) * 100} className="h-2 bg-slate-100 dark:bg-slate-800" indicatorClassName="bg-blue-500 rounded-full" />
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
                  <p className="text-sm font-black text-slate-900 dark:text-white">18 Months</p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                  <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Board Status</p>
                  <p className="text-sm font-black text-emerald-500">Qualified</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 4) Financial Projection */}
          <Card className="card-ios border-none shadow-sm bg-emerald-500/5 dark:bg-emerald-500/10">
            <CardContent className="p-5 space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-500" />
                  <h3 className="font-bold text-slate-900 dark:text-white">Financial Projection</h3>
                </div>
                <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest border-emerald-500/20 text-emerald-500">E-5 Promo</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Projected Monthly Base Pay</p>
                  <p className="text-2xl font-black text-slate-900 dark:text-white">$3,150.00</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Difference</p>
                  <p className="text-lg font-black text-emerald-500">+$420.00</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* What If Simulator Expandable */}
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-[398px] z-30">
          <Card className={`card-ios shadow-2xl transition-all duration-500 ${showSimulator ? 'bg-slate-900 text-white' : 'bg-white dark:bg-slate-900 border-none'}`}>
            <CardContent className="p-0 overflow-hidden">
              <button 
                onClick={() => setShowSimulator(!showSimulator)}
                className="w-full p-4 flex items-center justify-between font-black uppercase tracking-widest text-[11px]"
              >
                <div className="flex items-center gap-2">
                  <Zap className={`w-4 h-4 ${showSimulator ? 'text-emerald-400' : 'text-emerald-500'}`} />
                  What If Simulator
                </div>
                {showSimulator ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
              
              <AnimatePresence>
                {showSimulator && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="p-6 pt-0 space-y-6"
                  >
                    <div className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Simulate PFT Score: {simPft}</Label>
                          <span className="text-xs font-black text-emerald-400">+{simPft - (profile?.pftScore || 180)}</span>
                        </div>
                        <Slider 
                          value={[simPft]} 
                          onValueChange={(val) => {
                            setSimPft(val[0]);
                            setIsSimulating(true);
                          }}
                          max={300}
                          min={150}
                          step={1}
                          className="py-4"
                        />
                      </div>

                      <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                        <div className="space-y-0.5">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-white">Certification Complete</Label>
                          <p className="text-[10px] text-slate-400">Adds +10 to composite score</p>
                        </div>
                        <Switch 
                          checked={simCerts} 
                          onCheckedChange={(val) => {
                            setSimCerts(val);
                            setIsSimulating(true);
                          }} 
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setIsSimulating(false);
                          setSimPft(profile?.pftScore || 180);
                          setSimCerts(false);
                        }}
                        className="flex-1 rounded-xl h-11 border-white/10 hover:bg-white/5 text-[10px] font-black uppercase tracking-widest bg-transparent"
                      >
                        Reset
                      </Button>
                      <Button 
                        onClick={() => setShowSimulator(false)}
                        className="flex-1 rounded-xl h-11 bg-emerald-500 hover:bg-emerald-600 text-slate-900 font-black uppercase tracking-widest"
                      >
                        Apply View
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </div>

      </div>
    </AppLayout>
  );
}
