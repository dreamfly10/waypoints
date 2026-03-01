import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { useVaultItems, useCreateVaultItem } from "@/hooks/use-vault";
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
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, UploadCloud, FileSearch, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function Vault() {
  const { data: items, isLoading } = useVaultItems();
  const { mutate: upload, isPending } = useCreateVaultItem();
  const { toast } = useToast();
  
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("");

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !type) return;

    // Simulate extracting fields from a document
    const extractedFields = {
      confidence: "98%",
      verifiedBy: "Waypoints AI",
      keyMetrics: type === "evaluation" ? ["Top 10% peer group", "Promotable"] : ["Pass", "No limitations"],
    };

    upload(
      {
        profileId: 1, // Simulated single profile
        title,
        type,
        date: format(new Date(), 'yyyy-MM-dd'),
        extractedFields,
      },
      {
        onSuccess: () => {
          toast({ title: "Document Processed", description: "Successfully added to your vault." });
          setOpen(false);
          setTitle("");
          setType("");
        }
      }
    );
  };

  const getTypeColor = (docType: string) => {
    switch (docType) {
      case 'evaluation': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'medical': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'training': return 'bg-accent/10 text-accent border-accent/20';
      default: return 'bg-secondary text-secondary-foreground border-border';
    }
  };

  return (
    <AppLayout>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold font-display text-foreground tracking-tight flex items-center gap-3">
              <FileSearch className="w-8 h-8 text-muted-foreground" />
              Document Vault
            </h1>
            <p className="text-muted-foreground mt-2 text-lg">
              Securely store and parse your official records.
            </p>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-foreground text-background hover:bg-foreground/90 shadow-md transition-all active:scale-95">
                <UploadCloud className="w-4 h-4 mr-2" />
                Simulate Upload
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Upload Document</DialogTitle>
                <DialogDescription>
                  Upload a PDF to extract career data automatically.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleUpload} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Document Title</Label>
                  <Input 
                    id="title" 
                    placeholder="e.g. 2023 Annual Evaluation" 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Document Type</Label>
                  <Select value={type} onValueChange={setType} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="evaluation">Evaluation (OER/NCOER)</SelectItem>
                      <SelectItem value="training">Training Record</SelectItem>
                      <SelectItem value="medical">Medical Readiness</SelectItem>
                      <SelectItem value="orders">Orders/Awards</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="p-4 bg-secondary/50 rounded-lg border border-border mt-4 flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Documents are securely processed. Data is extracted to calculate your readiness score and update your profile automatically.
                  </p>
                </div>

                <DialogFooter className="pt-4">
                  <Button type="submit" disabled={isPending || !title || !type} className="w-full">
                    {isPending ? "Processing..." : "Extract Data"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? (
            Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)
          ) : items?.length === 0 ? (
            <div className="col-span-full py-16 text-center border-2 border-dashed border-border rounded-xl">
              <FileText className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground">Vault is Empty</h3>
              <p className="text-muted-foreground mt-1 max-w-sm mx-auto">
                Upload your evaluations, training certs, and awards to build your profile.
              </p>
            </div>
          ) : (
            items?.map((item) => (
              <Card key={item.id} className="hover-elevate border-border/60 hover:border-border transition-colors group">
                <CardContent className="p-5 flex flex-col h-full justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div className="p-2 bg-secondary rounded-md group-hover:bg-accent/10 transition-colors">
                        <FileText className="w-5 h-5 text-muted-foreground group-hover:text-accent transition-colors" />
                      </div>
                      <Badge variant="outline" className={`capitalize text-[10px] tracking-wider ${getTypeColor(item.type)}`}>
                        {item.type}
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-foreground line-clamp-2 leading-tight">{item.title}</h3>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-border/50">
                    <p className="text-xs text-muted-foreground font-mono">Added: {item.date}</p>
                    {item.extractedFields && (
                      <div className="mt-2 text-xs text-muted-foreground/80 line-clamp-1">
                        {(item.extractedFields as any).keyMetrics?.join(" • ")}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

      </div>
    </AppLayout>
  );
}
