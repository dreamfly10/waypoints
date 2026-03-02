import React, { useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProfile } from "@/hooks/use-profile";
import {
  computeBahMonthly,
  computeBasePayMonthly,
  computeBasMonthly,
  formatMoney,
  getYearsOfServiceBracketIdFromTisMonths,
  YEARS_OF_SERVICE_BRACKETS,
  type EnlistedRank,
  type YearsOfServiceBracketId,
} from "@/lib/pay";

function toEnlistedRank(rank: string | null | undefined): EnlistedRank {
  const r = (rank ?? "E1").toUpperCase().replace("-", "");
  if (/^E[1-9]$/.test(r)) return r as EnlistedRank;
  return "E1";
}

export default function Finance() {
  const { data: profile } = useProfile();

  const defaultRank = toEnlistedRank(profile?.rank);
  const defaultYos = getYearsOfServiceBracketIdFromTisMonths(profile?.tisMonths);

  const [mode, setMode] = useState<"monthly" | "yearly">("monthly");
  const [rank, setRank] = useState<EnlistedRank>(defaultRank);
  const [yos, setYos] = useState<YearsOfServiceBracketId>(defaultYos);
  const [liveOnBase, setLiveOnBase] = useState(true);
  const [hasDependents, setHasDependents] = useState(false);
  const [includeBas, setIncludeBas] = useState(true);

  const pay = useMemo(() => {
    const basic = computeBasePayMonthly(rank, yos);
    const bah = computeBahMonthly({ rank, liveOnBase, hasDependents });
    const bas = computeBasMonthly(includeBas);
    const total = basic + bah + bas;
    const mult = mode === "yearly" ? 12 : 1;
    return {
      basic: basic * mult,
      bah: bah * mult,
      bas: bas * mult,
      total: total * mult,
    };
  }, [rank, yos, liveOnBase, hasDependents, includeBas, mode]);

  return (
    <AppLayout>
      <div className="space-y-6 animate-in fade-in duration-700 pb-20">
        <div className="pt-2 px-4 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">
              Finance
            </h1>
            <p className="text-slate-500 dark:text-slate-400 font-bold text-xs mt-1 uppercase tracking-widest">
              Pay projection & breakdown
            </p>
          </div>
          <Badge
            variant="outline"
            className="text-[9px] font-black uppercase tracking-widest border-slate-200 dark:border-slate-800"
          >
            Prototype
          </Badge>
        </div>

        <div className="px-4">
          <Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
            <TabsList className="w-full h-11 bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl border-none">
              <TabsTrigger
                value="monthly"
                className="flex-1 rounded-xl text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800"
              >
                Monthly
              </TabsTrigger>
              <TabsTrigger
                value="yearly"
                className="flex-1 rounded-xl text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800"
              >
                Yearly
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="px-4 space-y-4">
          {/* Top: Total + breakdown */}
          <Card className="card-ios border-none shadow-sm">
            <CardContent className="p-5 space-y-5">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Total Pay
                  </p>
                  <p className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">
                    {formatMoney(pay.total)}
                  </p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                    {mode}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs font-black text-slate-900 dark:text-white mb-3">
                  Estimated Pay Breakdown
                </p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded bg-slate-700" />
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                        Basic Pay
                      </span>
                    </div>
                    <span className="text-sm font-black text-slate-900 dark:text-white">
                      {formatMoney(pay.basic)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded bg-slate-400" />
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                        Housing Allowance (BAH)
                      </span>
                    </div>
                    <span className="text-sm font-black text-slate-900 dark:text-white">
                      {formatMoney(pay.bah)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded bg-amber-500" />
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                        Subsistence Allowance (BAS)
                      </span>
                    </div>
                    <span className="text-sm font-black text-slate-900 dark:text-white">
                      {formatMoney(pay.bas)}
                    </span>
                  </div>
                </div>

                <p className="mt-4 text-[11px] font-bold text-slate-400 flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-black text-slate-500">
                    i
                  </span>
                  Shown before taxes and deductions
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Service details */}
          <Card className="card-ios border-none shadow-sm">
            <CardContent className="p-5 space-y-4">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Service Details
              </h3>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <Label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    Grade
                  </Label>
                  <Select value={rank} onValueChange={(v) => setRank(v as any)}>
                    <SelectTrigger className="w-[180px] h-10 rounded-xl bg-slate-50 dark:bg-slate-900 border-none font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-none shadow-xl">
                      {(["E1","E2","E3","E4","E5","E6","E7","E8","E9"] as EnlistedRank[]).map((r) => (
                        <SelectItem key={r} value={r}>
                          {r.replace("E", "E-")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <Label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    Years of Service
                  </Label>
                  <Select value={yos} onValueChange={(v) => setYos(v as any)}>
                    <SelectTrigger className="w-[180px] h-10 rounded-xl bg-slate-50 dark:bg-slate-900 border-none font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-none shadow-xl">
                      {YEARS_OF_SERVICE_BRACKETS.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <Label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    Do you live on a military base?
                  </Label>
                  <Switch checked={liveOnBase} onCheckedChange={setLiveOnBase} />
                </div>

                <div className="flex items-center justify-between">
                  <Label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    Do you have dependents?
                  </Label>
                  <Switch checked={hasDependents} onCheckedChange={setHasDependents} />
                </div>

                <div className="flex items-center justify-between">
                  <Label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    Include BAS?
                  </Label>
                  <Switch checked={includeBas} onCheckedChange={setIncludeBas} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* About */}
          <Card className="card-ios border-none shadow-sm">
            <CardContent className="p-5 space-y-3">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                About Your Pay
              </h3>
              <p className="text-sm font-black text-slate-900 dark:text-white">
                Basic Compensation Package
              </p>
              <ul className="text-sm font-bold text-slate-600 dark:text-slate-300 list-disc pl-5 space-y-1">
                <li>Basic pay</li>
                <li>
                  Housing allowance (or government-provided housing)
                </li>
                <li>
                  Subsistence allowance (or government-provided meals)
                </li>
                <li>Free medical and dental care for service members</li>
                <li>Free or low-cost medical and dental care for dependents</li>
                <li>Paid annual leave</li>
              </ul>
              <div className="pt-2">
                <Button variant="outline" className="w-full rounded-2xl font-black uppercase tracking-widest text-[10px]">
                  Learn more
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

