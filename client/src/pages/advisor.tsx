import { useState, useRef, useEffect } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { useAdvisorAsk, AdvisorProRequiredError } from "@/hooks/use-advisor";
import { useProfile } from "@/hooks/use-profile";
import { useVaultItems } from "@/hooks/use-vault";
import { PaywallModal } from "@/components/paywall-modal";
import { Card } from "@/components/ui/card";
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
import { Send, Bot, User, Sparkles, Paperclip, X } from "lucide-react";

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
    { id: '1', role: 'advisor', text: 'Reporting for duty. How can I assist with your career progression today?' }
  ]);
  const [input, setInput] = useState("");
  const [attachedId, setAttachedId] = useState<string | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const suggestions = [
    "What is my promotion strategy?",
    "How do I improve my readiness?",
    "Show my peer benchmarking"
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
      onError: (err) => {
        if (err instanceof AdvisorProRequiredError) {
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
      <div className="h-[calc(100vh-8rem)] flex flex-col animate-in fade-in duration-500">
        
        <div className="mb-6 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold font-display text-foreground tracking-tight flex items-center gap-3">
              <Bot className="w-8 h-8 text-accent" />
              Career Advisor
            </h1>
            <p className="text-muted-foreground mt-1">
              AI-powered guidance based on your profile vault.
            </p>
          </div>
          {!profile?.isPro && (
            <Button variant="outline" size="sm" onClick={() => setShowPaywall(true)} className="text-xs font-semibold bg-accent/5 text-accent border-accent/20 hover:bg-accent/10">
              <Sparkles className="w-3 h-3 mr-1.5" /> Unlock Pro
            </Button>
          )}
        </div>

        <Card className="flex-1 flex flex-col border-border/60 shadow-sm overflow-hidden bg-card/50">
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="space-y-6 max-w-3xl mx-auto py-4">
              {messages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <Avatar className={`w-8 h-8 ${msg.role === 'user' ? 'bg-primary' : 'bg-accent'}`}>
                    <AvatarFallback className={msg.role === 'user' ? 'text-primary-foreground bg-primary' : 'text-accent-foreground bg-accent'}>
                      {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </AvatarFallback>
                  </Avatar>
                  <div 
                    className={`
                      max-w-[80%] rounded-2xl px-5 py-3 text-sm shadow-sm
                      ${msg.role === 'user' 
                        ? 'bg-foreground text-background rounded-tr-sm' 
                        : 'bg-background border border-border/50 text-foreground rounded-tl-sm'}
                    `}
                  >
                    <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                  </div>
                </div>
              ))}
              
              {messages.length === 1 && (
                <div className="flex flex-wrap gap-2 max-w-3xl mx-auto px-12">
                  {suggestions.map((s) => (
                    <Button 
                      key={s} 
                      variant="outline" 
                      size="sm" 
                      className="rounded-full text-xs bg-background/50"
                      onClick={() => handleSend(s)}
                    >
                      {s}
                    </Button>
                  ))}
                </div>
              )}

              {isPending && (
                <div className="flex gap-4">
                  <Avatar className="w-8 h-8 bg-accent">
                    <AvatarFallback className="bg-accent text-accent-foreground"><Bot className="w-4 h-4" /></AvatarFallback>
                  </Avatar>
                  <div className="bg-background border border-border/50 rounded-2xl rounded-tl-sm px-5 py-4 flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-accent/40 animate-bounce" />
                    <div className="w-2 h-2 rounded-full bg-accent/60 animate-bounce [animation-delay:0.2s]" />
                    <div className="w-2 h-2 rounded-full bg-accent animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
          
          <div className="p-4 bg-background border-t border-border/50">
            <div className="max-w-3xl mx-auto space-y-2">
              {attachedItem && (
                <div className="flex items-center gap-2 bg-accent/10 border border-accent/20 rounded-lg px-3 py-1.5 w-fit animate-in slide-in-from-bottom-2">
                  <Paperclip className="w-3.5 h-3.5 text-accent" />
                  <span className="text-xs font-medium text-accent truncate max-w-[200px]">{attachedItem.title}</span>
                  <Button variant="ghost" size="icon" className="h-5 w-5 hover:bg-accent/20 text-accent" onClick={() => setAttachedId(null)}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              )}
              
              <form onSubmit={(e) => { e.preventDefault(); handleSend(input, attachedId ? parseInt(attachedId) : undefined); }} className="relative flex items-center gap-2">
                <Select value={attachedId || "none"} onValueChange={(val) => setAttachedId(val === "none" ? null : val)}>
                  <SelectTrigger className="w-12 h-12 p-0 flex items-center justify-center rounded-xl bg-secondary/30 border-border">
                    <Paperclip className={`w-5 h-5 ${attachedId ? 'text-accent' : 'text-muted-foreground'}`} />
                  </SelectTrigger>
                  <SelectContent>
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
                    placeholder="Ask about promotion requirements, strategies, etc..." 
                    className="pr-12 h-12 rounded-xl bg-secondary/30 border-border focus-visible:ring-accent"
                    disabled={isPending}
                  />
                  <Button 
                    type="submit" 
                    size="icon" 
                    className="absolute right-1.5 top-1.5 h-9 w-9 rounded-lg bg-accent hover:bg-accent/90 text-accent-foreground"
                    disabled={!input.trim() || isPending}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </Card>

        <PaywallModal open={showPaywall} onOpenChange={setShowPaywall} />
      </div>
    </AppLayout>
  );
}
