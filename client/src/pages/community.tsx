import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { useCommunityPosts, useCreateCommunityPost, useLikePost } from "@/hooks/use-community";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  Trophy, 
  Users, 
  MessageSquare, 
  Radio, 
  Search, 
  Filter, 
  ChevronRight,
  Circle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";

export default function Community() {
  const { data: posts, isLoading } = useCommunityPosts();
  const { mutate: likePost } = useLikePost();
  const [activeTab, setActiveTab] = useState("milestones");
  const [filterOpen, setFilterOpen] = useState(false);

  const milestones = posts?.filter(p => p.type === 'milestone') || [];

  const chats = [
    { id: 1, name: "SGT Miller", lastMsg: "Check the new MARADMIN on PFT.", time: "2m", unread: true },
    { id: 2, name: "SSG Thompson", lastMsg: "Did you submit your OER?", time: "1h", unread: false },
    { id: 3, name: "11B Squad Leaders", lastMsg: "Meeting at 1400.", time: "3h", unread: true },
  ];

  const groups = [
    { id: 1, name: "11B Infantry Professionals", members: "2.4k", category: "MOS" },
    { id: 2, name: "NCO Development Circle", members: "1.8k", category: "Rank" },
    { id: 3, name: "Promotion Board Prep (FY26)", members: "850", category: "Prep" },
  ];

  const channels = [
    { id: 1, name: "MARADMIN Updates", subscribers: "15k", description: "Official Marine Corps Administrative Messages" },
    { id: 2, name: "Army Policy Alerts", subscribers: "12k", description: "Latest HQDA policy changes and ALARACTs" },
  ];

  return (
    <AppLayout>
      <div className="flex flex-col h-[calc(100vh-5rem)] animate-in fade-in duration-700">
        
        {/* Top Header & Segmented Control */}
        <div className="px-4 pt-2 pb-4 space-y-4 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Community</h1>
            <div className="flex gap-2">
              <Button size="icon" variant="ghost" className="rounded-full bg-slate-100 dark:bg-slate-800">
                <Search className="w-4 h-4" />
              </Button>
              <Button 
                size="icon" 
                variant="ghost" 
                className={`rounded-full ${filterOpen ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-800'}`}
                onClick={() => setFilterOpen(!filterOpen)}
              >
                <Filter className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full h-11 bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl border-none">
              <TabsTrigger value="chats" className="flex-1 rounded-xl text-[10px] font-black uppercase tracking-tighter">Chats</TabsTrigger>
              <TabsTrigger value="groups" className="flex-1 rounded-xl text-[10px] font-black uppercase tracking-tighter">Groups</TabsTrigger>
              <TabsTrigger value="channels" className="flex-1 rounded-xl text-[10px] font-black uppercase tracking-tighter">Channels</TabsTrigger>
              <TabsTrigger value="milestones" className="flex-1 rounded-xl text-[10px] font-black uppercase tracking-tighter">Milestones</TabsTrigger>
            </TabsList>
          </Tabs>

          <AnimatePresence>
            {filterOpen && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="flex flex-wrap gap-2 pt-2">
                  <Badge variant="outline" className="rounded-full px-3 py-1 text-[10px] font-black border-emerald-500/20 text-emerald-500 bg-emerald-500/5">Branch: Army</Badge>
                  <Badge variant="outline" className="rounded-full px-3 py-1 text-[10px] font-black border-slate-200">Rank: All</Badge>
                  <Badge variant="outline" className="rounded-full px-3 py-1 text-[10px] font-black border-slate-200">Topic: All</Badge>
                  <Badge variant="outline" className="rounded-full px-3 py-1 text-[10px] font-black border-slate-200">My Network</Badge>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto px-4 pb-24 no-scrollbar">
          <AnimatePresence mode="wait">
            {activeTab === "milestones" && (
              <motion.div 
                key="milestones" 
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="space-y-4 pt-2"
              >
                {isLoading ? (
                  Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-[24px]" />)
                ) : milestones.map((post) => (
                  <Card key={post.id} className="card-ios border-none shadow-sm overflow-hidden">
                    <CardContent className="p-0">
                      <div className="p-4 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-white font-black text-xs">
                            {post.author[0]}
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-900 dark:text-white leading-tight">{post.author}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{post.date}</p>
                          </div>
                        </div>
                        <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-none rounded-full text-[9px] font-black uppercase tracking-widest px-2 py-0.5">
                          Milestone
                        </Badge>
                      </div>
                      
                      <div className="p-4 space-y-4">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
                          {post.content}
                        </p>
                        
                        {post.milestoneCard && (
                          <div className="bg-slate-900 dark:bg-emerald-950/40 rounded-2xl p-4 text-white relative overflow-hidden">
                            <div className="absolute right-0 top-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl" />
                            <div className="relative z-10 flex items-center justify-between">
                              <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-1">Combat Readiness</p>
                                <h4 className="text-xl font-black">{post.milestoneCard.title}</h4>
                              </div>
                              <div className="text-right">
                                <span className="text-3xl font-black">{post.milestoneCard.score}</span>
                                <p className="text-[9px] font-bold text-emerald-400/80">+{post.milestoneCard.delta} PTS</p>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center gap-6 pt-2">
                          <button 
                            onClick={() => likePost(post.id)}
                            className="flex items-center gap-1.5 text-slate-400 hover:text-rose-500 transition-colors"
                          >
                            <Heart className={`w-5 h-5 ${post.likes > 0 ? 'fill-rose-500 text-rose-500' : ''}`} />
                            <span className="text-xs font-bold">{post.likes}</span>
                          </button>
                          <button className="flex items-center gap-1.5 text-slate-400 hover:text-blue-500 transition-colors">
                            <MessageCircle className="w-5 h-5" />
                            <span className="text-xs font-bold">{post.comments}</span>
                          </button>
                          <button className="flex items-center gap-1.5 text-slate-400 hover:text-emerald-500 transition-colors ml-auto">
                            <Share2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </motion.div>
            )}

            {activeTab === "chats" && (
              <motion.div 
                key="chats" 
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="space-y-1 pt-2"
              >
                {chats.map(chat => (
                  <div key={chat.id} className="flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-900/50 active:bg-slate-100 dark:active:bg-slate-800 rounded-2xl transition-colors group cursor-pointer">
                    <div className="w-14 h-14 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-500 font-black relative">
                      {chat.name[0]}
                      {chat.unread && <div className="absolute top-0 right-0 w-4 h-4 bg-blue-500 rounded-full border-4 border-white dark:border-slate-950" />}
                    </div>
                    <div className="flex-1 min-w-0 border-b border-slate-50 dark:border-slate-800 pb-4 group-last:border-none">
                      <div className="flex justify-between items-baseline mb-1">
                        <h4 className="font-bold text-slate-900 dark:text-white truncate">{chat.name}</h4>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">{chat.time}</span>
                      </div>
                      <p className={`text-sm truncate ${chat.unread ? 'font-black text-slate-900 dark:text-white' : 'text-slate-500'}`}>
                        {chat.lastMsg}
                      </p>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {activeTab === "groups" && (
              <motion.div 
                key="groups" 
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="space-y-3 pt-2"
              >
                {groups.map(group => (
                  <Card key={group.id} className="card-ios border-none shadow-sm hover:shadow-md transition-all cursor-pointer">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center">
                          <Users className="w-6 h-6 text-emerald-500" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 dark:text-white leading-tight">{group.name}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0 rounded-md">{group.category}</Badge>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{group.members} Members</span>
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-300" />
                    </CardContent>
                  </Card>
                ))}
              </motion.div>
            )}

            {activeTab === "channels" && (
              <motion.div 
                key="channels" 
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="space-y-4 pt-2"
              >
                {channels.map(channel => (
                  <Card key={channel.id} className="card-ios border-none shadow-sm overflow-hidden">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center text-white">
                            <Radio className="w-5 h-5" />
                          </div>
                          <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-tight">{channel.name}</h4>
                        </div>
                        <Button size="sm" className="h-8 rounded-full bg-slate-900 dark:bg-white dark:text-slate-950 text-[10px] font-black uppercase tracking-widest px-4">Join</Button>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{channel.description}</p>
                      <div className="mt-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <Circle className="w-1.5 h-1.5 fill-emerald-500 text-emerald-500" />
                        {channel.subscribers} Subscribers
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </AppLayout>
  );
}
