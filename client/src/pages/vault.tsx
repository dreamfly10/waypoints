import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { useVaultItems, useCreateVaultItem } from "@/hooks/use-vault";
import { useProfile } from "@/hooks/use-profile";
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
import { FileText, UploadCloud, ShieldCheck, CheckCircle2, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import { Progress } from "@/components/ui/progress";

export default function Vault() {
  const { data: items, isLoading } = useVaultItems();
  const { mutate: upload, isPending } = useCreateVaultItem();
  const { data: profile } = useProfile();
  const { toast } = useToast();
  
  const [open, setOpen] = useState(false);
  const [successOpen, setOpenSuccess] = useState(false);
  const [lastUploaded, setLastUploaded] = useState<any>(null);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const categories = [
    { id: "all", label: "All" },
    { id: "promotion_letter", label: "Promotions" },
    { id: "pft", label: "Fitness" },
    { id: "cert", label: "Certs" },
    { id: "orders", label: "Orders" },
  ];

  const filteredItems = items?.filter(item => activeTab === "all" || item.type === activeTab);

  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [thresholdReached, setThresholdReached] = useState<number | null>(null);

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !type) return;

    const extractedFields = {
      confidence: "99.2%",
      verifiedBy: "Waypoints AI Engine",
      keyMetrics: type === "pft" ? ["Score: 285", "Status: Excellence"] : 
                  type === "promotion_letter" ? ["Primary Zone", "Rank: SSG"] :
                  ["Authenticated", "Compliant"],
    };

    upload(
      {
        profileId: 1,
        title,
        type,
        date: format(new Date(), 'yyyy-MM-dd'),
        extractedFields,
      },
      {
        onSuccess: (data) => {
          setLastUploaded({ ...data, extractedFields });
          setOpen(false);
          
          // Check for threshold
          const newScore = profile?.readinessScore ? profile.readinessScore + 5 : 5; // Simplified logic for demo
          if (newScore >= 70 && (!profile?.readinessScore || profile.readinessScore < 70)) {
            setThresholdReached(70);
            setShowMilestoneModal(true);
          } else {
            setOpenSuccess(true);
          }
          
          setTitle("");
          setType("");
        }
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
                      <SelectItem value="cert">Certification</SelectItem>
                      <SelectItem value="orders">Orders / Awards</SelectItem>
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
                     <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-1">{profile?.rank} {profile?.lastName}</p>
                     <h4 className="text-xl font-black">Readiness Level</h4>
                     <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-1">{format(new Date(), 'MMM d, yyyy')}</p>
                   </div>
                   <div className="text-right">
                     <span className="text-4xl font-black text-white">{profile?.readinessScore || 70}</span>
                     <p className="text-[10px] font-bold text-emerald-400">▲ +5 PTS</p>
                   </div>
                 </div>
              </div>
            </div>
            
            <div className="p-6 space-y-3 bg-white dark:bg-slate-950">
              <Button 
                onClick={() => {
                   // Mock share to community
                   toast({ title: "Shared to Community", description: "Your milestone is now live." });
                   setShowMilestoneModal(false);
                }}
                className="w-full h-12 rounded-xl bg-slate-900 dark:bg-emerald-500 text-white font-black uppercase tracking-widest"
              >
                Post to Community
              </Button>
              <Button 
                variant="outline"
                className="w-full h-12 rounded-xl border-slate-200 text-slate-900 dark:text-white font-black uppercase tracking-widest text-[10px]"
              >
                Invite 2 Peers to Unlock Pro Preview
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
