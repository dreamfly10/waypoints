import { useState, useRef, useEffect } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { useAdvisorAsk, AdvisorProRequiredError } from "@/hooks/use-advisor";
import { useProfile } from "@/hooks/use-profile";
import { useVaultItems } from "@/hooks/use-vault";
import { PaywallModal } from "@/components/paywall-modal";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Send, Bot, User, Sparkles, Paperclip, X, Target, Award, Activity } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
  id: string;
  role: "user" | "advisor";
  text: string;
}

export default function Advisor() {
  const { data: profile } = useProfile();
  const { data: vaultItems } = useVaultItems();
  const { mutate: askAdvisor, isPending } = useAdvisorAsk();
  
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'advisor', text: 'Reporting for duty. I have access to your PFT scores and vault records. How can I assist with your career progression today?' }
  ]);
  const [input, setInput] = useState("");
  const [attachedId, setAttachedId] = useState<string | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const suggestions = [
    { label: "What am I missing?", query: "What am I missing for my next promotion?" },
    { label: "How do I improve readiness?", query: "How do I improve my readiness score?" },
    { label: "Show peer benchmarking", query: "Show my peer benchmarking percentile" }
  ];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = (text: string, attachedVaultItemId?: number) => {
    if (!text.trim() || isPending) return;

    const userText = text.trim();
    setInput("");
    setAttachedId(null);
    
    const newMsg: Message = { id: Date.now().toString(), role: 'user', text: userText };
    setMessages(prev => [...prev, newMsg]);

    askAdvisor({ query: userText, attachedVaultItemId }, {
      onSuccess: (data) => {
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'advisor', text: data.response }]);
      },
      onError: (err: any) => {
        // Handle both class-based and object-based error responses
        if (err instanceof AdvisorProRequiredError || err?.requiresPro || (err?.message && err.message.includes('Pro'))) {
          setShowPaywall(true);
        } else {
          setMessages(prev => [...prev, { id: Date.now().toString(), role: 'advisor', text: 'Error connecting to tactical network. Try again.' }]);
        }
      }
    });
  };

  const attachedItem = attachedId ? vaultItems?.find(i => i.id.toString() === attachedId) : null;

  return (
    <AppLayout>
      <div className="h-[calc(100vh-5rem)] flex flex-col animate-in fade-in duration-700">
        
        {/* Context Banner */}
        <Card className="mx-4 mt-2 mb-4 bg-slate-900 dark:bg-emerald-950/20 text-white border-none shadow-lg overflow-hidden relative rounded-2xl">
          <div className="absolute right-0 top-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl -mr-8 -mt-8" />
          <CardContent className="p-4 flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                <Bot className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-sm font-black uppercase tracking-widest leading-tight">
                  {profile?.rank} {profile?.lastName || "SGT"}
                </h2>
                <p className="text-[10px] font-bold text-emerald-400/80 uppercase tracking-widest">MOS: {profile?.mos || "11B"}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-0.5">Readiness</p>
              <div className="flex items-center gap-1.5 justify-end">
                <Activity className="w-3 h-3 text-emerald-400" />
                <span className="text-lg font-black">{profile?.readinessScore}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Chat Interface */}
        <div className="flex-1 flex flex-col min-h-0 bg-slate-50 dark:bg-slate-900/50 rounded-t-[32px] shadow-inner">
          <ScrollArea className="flex-1" ref={scrollRef}>
            <div className="space-y-6 p-6 pb-32">
              {messages.map((msg) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={msg.id} 
                  className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <Avatar className={`w-8 h-8 rounded-xl shrink-0 ${msg.role === 'user' ? 'bg-slate-900 dark:bg-emerald-600' : 'bg-white dark:bg-slate-800 shadow-sm'}`}>
                    <AvatarFallback className="bg-transparent">
                      {msg.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-emerald-500" />}
                    </AvatarFallback>
                  </Avatar>
                  <div 
                    className={`
                      max-w-[85%] rounded-[20px] px-4 py-3 text-sm font-medium leading-relaxed
                      ${msg.role === 'user' 
                        ? 'bg-slate-900 dark:bg-emerald-600 text-white rounded-tr-none shadow-md' 
                        : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-tl-none shadow-sm border border-slate-100 dark:border-slate-700/50'}
                    `}
                  >
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  </div>
                </motion.div>
              ))}
              
              {isPending && (
                <div className="flex gap-3">
                  <Avatar className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 shadow-sm">
                    <AvatarFallback className="bg-transparent"><Bot className="w-4 h-4 text-emerald-500" /></AvatarFallback>
                  </Avatar>
                  <div className="bg-white dark:bg-slate-800 rounded-[20px] rounded-tl-none px-4 py-3 flex items-center gap-1 shadow-sm border border-slate-100 dark:border-slate-700/50">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/40 animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/60 animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
          
          {/* Bottom Input Area */}
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-full max-w-[430px] px-4">
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[28px] p-3 shadow-2xl border border-slate-100 dark:border-slate-800/50 space-y-3">
              
              {/* Suggestions */}
              {messages.length === 1 && !isPending && (
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {suggestions.map((s) => (
                    <Button 
                      key={s.label} 
                      variant="outline" 
                      className="rounded-full h-8 px-4 text-[10px] font-black uppercase tracking-widest bg-slate-50 dark:bg-slate-800 border-none hover:bg-emerald-500 hover:text-white transition-all shrink-0"
                      onClick={() => handleSend(s.query)}
                    >
                      {s.label}
                    </Button>
                  ))}
                </div>
              )}

              {attachedItem && (
                <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-xl px-3 py-2 w-fit animate-in slide-in-from-bottom-2">
                  <Paperclip className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest truncate max-w-[150px]">{attachedItem.title}</span>
                  <Button variant="ghost" size="icon" className="h-5 w-5 hover:bg-emerald-500/20 text-emerald-500" onClick={() => setAttachedId(null)}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              )}
              
              <form onSubmit={(e) => { e.preventDefault(); handleSend(input, attachedId ? parseInt(attachedId) : undefined); }} className="flex items-center gap-2">
                <Select value={attachedId || "none"} onValueChange={(val) => setAttachedId(val === "none" ? null : val)}>
                  <SelectTrigger className="w-11 h-11 p-0 flex items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-800 border-none shadow-sm shrink-0">
                    <Paperclip className={`w-5 h-5 ${attachedId ? 'text-emerald-500' : 'text-slate-400'}`} />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-none shadow-2xl">
                    <SelectItem value="none">No attachment</SelectItem>
                    {vaultItems?.map(item => (
                      <SelectItem key={item.id} value={item.id.toString()}>{item.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="relative flex-1">
                  <Input 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask Waypoints Advisor..." 
                    className="h-11 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none focus-visible:ring-emerald-500 text-sm font-medium"
                    disabled={isPending}
                  />
                  <Button 
                    type="submit" 
                    size="icon" 
                    className="absolute right-1 top-1 h-9 w-9 rounded-xl bg-slate-900 dark:bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg transition-all active:scale-95"
                    disabled={(!input.trim() && !attachedId) || isPending}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <PaywallModal open={showPaywall} onOpenChange={setShowPaywall} />
      </div>
    </AppLayout>
  );
}
