import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Zap, Lock } from "lucide-react";
import { useUpdateProfile } from "@/hooks/use-profile";
import { useToast } from "@/hooks/use-toast";

interface PaywallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PaywallModal({ open, onOpenChange }: PaywallModalProps) {
  const { mutate: updateProfile, isPending } = useUpdateProfile();
  const { toast } = useToast();

  const handleUpgrade = () => {
    updateProfile(
      { isPro: true },
      {
        onSuccess: () => {
          toast({
            title: "Upgraded to Pro",
            description: "You now have access to advanced career insights.",
          });
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-accent/20 bg-card overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-accent to-primary" />
        <DialogHeader className="pt-4">
          <div className="mx-auto w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center mb-4">
            <Lock className="w-6 h-6 text-accent" />
          </div>
          <DialogTitle className="text-center text-2xl font-bold font-display">
            Unlock Advanced Insights
          </DialogTitle>
          <DialogDescription className="text-center text-base">
            This query requires Waypoints Pro. Upgrade to get detailed promotion strategies and deep career analysis.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50 border border-border/50">
            <ShieldCheck className="w-5 h-5 text-accent shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-sm">Strategic Promotion Planning</h4>
              <p className="text-sm text-muted-foreground">Get actionable steps tailored to your MOS and rank.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50 border border-border/50">
            <Zap className="w-5 h-5 text-accent shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-sm">Board Preparation Prep</h4>
              <p className="text-sm text-muted-foreground">Identify critical gaps in your record before the board meets.</p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-col gap-2">
          <Button 
            className="w-full bg-accent hover:bg-accent/90 text-accent-foreground shadow-lg shadow-accent/20 h-11 text-base" 
            onClick={handleUpgrade}
            disabled={isPending}
          >
            {isPending ? "Upgrading..." : "Upgrade to Pro (Simulated)"}
          </Button>
          <Button 
            variant="ghost" 
            className="w-full" 
            onClick={() => onOpenChange(false)}
          >
            Maybe Later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
