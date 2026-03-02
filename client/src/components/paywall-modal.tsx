import { useState } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useUpdateProfile } from "@/hooks/use-profile";
import { useToast } from "@/hooks/use-toast";
import {
  Activity,
  FileBarChart,
  Sparkles,
  Lock,
  List,
  X,
  Check,
} from "lucide-react";

interface PaywallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PaywallModal({ open, onOpenChange }: PaywallModalProps) {
  const { mutate: updateProfile, isPending } = useUpdateProfile();
  const { toast } = useToast();
  const [plan, setPlan] = useState<"yearly" | "monthly">("monthly");

  const handleGetPro = () => {
    updateProfile(
      { isPro: true },
      {
        onSuccess: () => {
          toast({
            title: "Pro Access",
            description: "You now have full access to Waypoints Pro.",
          });
          onOpenChange(false);
        },
      }
    );
  };

  const features = [
    {
      icon: Activity,
      text: "Weekly training plans built around your fitness standards",
    },
    {
      icon: FileBarChart,
      text: "Be first to use performance & career tools",
    },
    {
      icon: Sparkles,
      text: "Instant answers to orders, career, and admin questions",
    },
    {
      icon: Lock,
      text: "Exact improvements for lifts, movement, and events",
    },
    {
      icon: List,
      text: "Clear, actionable breakdowns of long directives",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] sm:max-w-[400px] p-0 gap-0 border-none overflow-hidden bg-slate-950 text-white shadow-2xl rounded-3xl [&>button]:hidden">
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="relative pt-12 pb-8 px-6">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,23,42,0.9),transparent_50%)]" />
          <div className="relative z-10 space-y-6">
            <h2 className="text-2xl font-black text-white text-center leading-tight pr-8">
              Train Smarter. Score Higher. Advance Faster.
            </h2>

            <ul className="space-y-4">
              {features.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-emerald-400" />
                  </div>
                  <span className="text-sm font-medium text-slate-200 leading-snug pt-1.5">
                    {text}
                  </span>
                </li>
              ))}
            </ul>

            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={() => setPlan("yearly")}
                className="w-full flex items-center justify-between p-4 rounded-2xl border-2 bg-slate-900/60 transition-colors text-left"
                style={{
                  borderColor: plan === "yearly" ? "rgb(16 185 129)" : "rgba(255,255,255,0.1)",
                }}
              >
                <span className="flex items-center gap-3">
                  <span
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      plan === "yearly" ? "border-emerald-500 bg-emerald-500" : "border-slate-500"
                    }`}
                  >
                    {plan === "yearly" && <Check className="w-3 h-3 text-white" />}
                  </span>
                  <span className="font-bold text-white">Yearly</span>
                </span>
                <span className="text-sm font-bold text-slate-300">$49.99/yr</span>
              </button>

              <button
                type="button"
                onClick={() => setPlan("monthly")}
                className="w-full flex items-center justify-between p-4 rounded-2xl border-2 bg-slate-900/60 transition-colors text-left relative"
                style={{
                  borderColor: plan === "monthly" ? "rgb(16 185 129)" : "rgba(255,255,255,0.1)",
                }}
              >
                <span className="absolute -top-2 right-4 px-2 py-0.5 rounded-full bg-emerald-500/90 text-[10px] font-black text-white uppercase">
                  Most Popular
                </span>
                <span className="flex items-center gap-3">
                  <span
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      plan === "monthly" ? "border-emerald-500 bg-emerald-500" : "border-slate-500"
                    }`}
                  >
                    {plan === "monthly" && <Check className="w-3 h-3 text-white" />}
                  </span>
                  <span className="font-bold text-white">Monthly</span>
                </span>
                <span className="text-sm font-bold text-slate-300">$4.99/mo</span>
              </button>
            </div>

            <Button
              className="w-full h-12 rounded-2xl bg-white text-slate-900 font-black text-base hover:bg-slate-100 transition-colors"
              onClick={handleGetPro}
              disabled={isPending}
            >
              {isPending ? "Upgrading..." : "Get Pro Access"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
