import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { useCommunityPosts, useCreateCommunityPost } from "@/hooks/use-community";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Heart, MessageCircle, Share2, Users, Award } from "lucide-react";
import { format } from "date-fns";

export default function Community() {
  const { data: posts, isLoading } = useCommunityPosts();
  const { mutate: createPost, isPending } = useCreateCommunityPost();
  const [content, setContent] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    createPost(
      {
        author: "Current User", // Mocked
        content: content.trim(),
        date: format(new Date(), 'MMM d, yyyy'),
      },
      {
        onSuccess: () => setContent(""),
      }
    );
  };

  return (
    <AppLayout>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-3xl mx-auto">
        
        <div className="border-b border-border/50 pb-6">
          <h1 className="text-3xl md:text-4xl font-bold font-display text-foreground tracking-tight flex items-center gap-3">
            <Users className="w-8 h-8 text-muted-foreground" />
            Milestone Network
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Share achievements and connect with peers across branches.
          </p>
        </div>

        <Card className="border-border shadow-sm bg-secondary/10">
          <CardContent className="p-4 sm:p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex gap-4">
                <Avatar className="w-10 h-10 border border-border">
                  <AvatarFallback className="bg-primary text-primary-foreground font-mono font-bold">ME</AvatarFallback>
                </Avatar>
                <Textarea 
                  placeholder="Share a recent promotion, award, or career milestone..."
                  className="resize-none min-h-[100px] border-border/50 focus-visible:ring-accent bg-background"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
              </div>
              <div className="flex justify-end">
                <Button 
                  type="submit" 
                  disabled={!content.trim() || isPending}
                  className="bg-foreground text-background hover:bg-foreground/90 font-medium px-6"
                >
                  {isPending ? "Posting..." : "Post Milestone"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {isLoading ? (
            Array(3).fill(0).map((_, i) => (
              <Card key={i} className="border-border/50">
                <CardHeader className="flex flex-row items-center gap-4 pb-2">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-16 w-full" />
                </CardContent>
              </Card>
            ))
          ) : (
            posts?.map((post) => (
              <Card key={post.id} className="border-border/60 shadow-sm hover:border-border transition-colors">
                <CardContent className="p-5 sm:p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback className="bg-secondary text-secondary-foreground font-mono">
                          {post.author.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-sm text-foreground">{post.author}</p>
                        <p className="text-xs text-muted-foreground font-mono">{post.date}</p>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-foreground/90 leading-relaxed text-sm sm:text-base whitespace-pre-wrap">
                    {post.content}
                  </p>

                  {post.milestoneCard && (
                    <Card className="mt-4 bg-accent/5 border-accent/20 overflow-hidden">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-accent/20 rounded-lg">
                            <Award className="w-6 h-6 text-accent" />
                          </div>
                          <div>
                            <p className="font-bold text-accent">{(post.milestoneCard as any).title}</p>
                            <p className="text-xs text-muted-foreground">{(post.milestoneCard as any).date}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-black text-accent">{(post.milestoneCard as any).score}</p>
                          <p className="text-[10px] font-bold text-accent/60 tracking-wider uppercase">Readiness Score</p>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <div className="flex items-center gap-6 mt-6 pt-4 border-t border-border/40">
                    <button 
                      onClick={() => {}} // Local only mock
                      className="flex items-center gap-1.5 text-muted-foreground hover:text-accent transition-colors group text-sm font-medium"
                    >
                      <Heart className="w-4 h-4 group-hover:fill-accent/20" /> 
                      {post.likes > 0 ? post.likes : 'Like'}
                    </button>
                    <button className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">
                      <MessageCircle className="w-4 h-4" /> Comment
                    </button>
                    <button className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors ml-auto text-sm font-medium">
                      <Share2 className="w-4 h-4" /> Share
                    </button>
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
