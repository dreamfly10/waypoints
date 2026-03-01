import { useState, useRef, useEffect } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { useAdvisorAsk, AdvisorProRequiredError } from "@/hooks/use-advisor";
import { useProfile } from "@/hooks/use-profile";
import { PaywallModal } from "@/components/paywall-modal";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Bot, User, Sparkles } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "advisor";
  text: string;
}

export default function Advisor() {
  const { data: profile } = useProfile();
  const { mutate: askAdvisor, isPending } = useAdvisorAsk();
  
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'advisor', text: 'Reporting for duty. How can I assist with your career progression today?' }
  ]);
  const [input, setInput] = useState("");
  const [showPaywall, setShowPaywall] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isPending) return;

    const userText = input.trim();
    setInput("");
    
    // Add user message optimistically
    const newMsg: Message = { id: Date.now().toString(), role: 'user', text: userText };
    setMessages(prev => [...prev, newMsg]);

    askAdvisor(userText, {
      onSuccess: (data) => {
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'advisor', text: data.response }]);
      },
      onError: (err) => {
        if (err instanceof AdvisorProRequiredError) {
          // Remove the optimistic message if you want, or keep it and show error
          setShowPaywall(true);
        } else {
          setMessages(prev => [...prev, { id: Date.now().toString(), role: 'advisor', text: 'Error connecting to tactical network. Try again.' }]);
        }
      }
    });
  };

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
            <form onSubmit={handleSend} className="max-w-3xl mx-auto relative flex items-center">
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
                className="absolute right-1.5 h-9 w-9 rounded-lg bg-accent hover:bg-accent/90 text-accent-foreground"
                disabled={!input.trim() || isPending}
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </Card>

        <PaywallModal open={showPaywall} onOpenChange={setShowPaywall} />
      </div>
    </AppLayout>
  );
}
