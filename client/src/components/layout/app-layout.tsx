import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { 
  Home, 
  FolderLock, 
  Target, 
  MessageSquareWarning, 
  Users,
  ShieldAlert,
  User,
  X,
  ChevronRight,
  LogOut,
  Palette,
  AppWindow,
  Database,
  Briefcase,
  UserCircle,
  Clock,
  MapPin,
  Trophy
} from "lucide-react";
import { useProfile } from "@/hooks/use-profile";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog";
import profilePic from "@assets/Image_20260228224426_45_75_1772336692292.jpg";

const navItems = [
  { title: "Home", url: "/", icon: Home },
  { title: "Vault", url: "/vault", icon: FolderLock },
  { title: "Readiness", url: "/readiness", icon: Target },
  { title: "Community", url: "/community", icon: Users },
  { title: "Advisor", url: "/advisor", icon: MessageSquareWarning },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { data: profile } = useProfile();
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-black flex justify-center selection:bg-emerald-500/20">
      {/* Mobile Viewport Container */}
      <div className="w-full max-w-[430px] min-h-screen bg-white dark:bg-slate-950 relative flex flex-col shadow-2xl overflow-hidden border-x border-slate-200 dark:border-slate-800">
        
        {/* Header */}
        <header className="h-20 flex items-center justify-between px-6 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md sticky top-0 z-30 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Target className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-900 dark:text-white">Waypoints</span>
          </div>
          <div className="flex items-center gap-3">
            {profile?.isPro && (
              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/20 text-[10px] uppercase font-black px-2 py-0.5 rounded-full">PRO</Badge>
            )}
            
            <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
              <DialogTrigger asChild>
                <button className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden border-2 border-transparent hover:border-emerald-500 transition-all">
                  <Avatar className="w-full h-full">
                    <AvatarImage src={profilePic} alt="Profile" className="object-cover" />
                    <AvatarFallback className="bg-emerald-100 text-emerald-700 font-bold">HF</AvatarFallback>
                  </Avatar>
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-[400px] w-[95vw] rounded-[32px] p-0 border-none bg-slate-50 dark:bg-black overflow-hidden sm:rounded-[32px]">
                <div className="relative">
                  <DialogHeader className="p-6 pb-2">
                    <div className="flex items-center justify-center relative">
                      <DialogTitle className="text-lg font-black text-slate-900 dark:text-white">Profile</DialogTitle>
                      <DialogClose className="absolute right-0 top-0 w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">
                        <X className="w-4 h-4" />
                      </DialogClose>
                    </div>
                  </DialogHeader>

                  <div className="px-6 pb-8 space-y-6 overflow-y-auto max-h-[80vh]">
                    {/* Profile Header Card */}
                    <div className="p-4 bg-white dark:bg-slate-900 rounded-3xl flex items-center justify-between shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <Avatar className="w-14 h-14 border-2 border-white dark:border-slate-800 shadow-md">
                            <AvatarImage src={profilePic} className="object-cover" />
                            <AvatarFallback>HF</AvatarFallback>
                          </Avatar>
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-amber-500 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center">
                            <span className="text-[10px] text-white font-black">+</span>
                          </div>
                        </div>
                        <div>
                          <h3 className="font-black text-slate-900 dark:text-white leading-tight">hao fu</h3>
                          <p className="text-xs font-bold text-slate-500">Marine Corps</p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-300" />
                    </div>

                    {/* Career Section */}
                    <div className="space-y-3">
                      <h4 className="text-lg font-black text-slate-900 dark:text-white px-1">Career</h4>
                      <div className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-sm divide-y divide-slate-50 dark:divide-slate-800">
                        <button className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">
                              <Trophy className="w-4 h-4" />
                            </div>
                            <div className="text-left">
                              <p className="text-sm font-black text-slate-900 dark:text-white">Rank & Grade</p>
                              <p className="text-[10px] font-bold text-slate-500">O-3 Captain</p>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-300" />
                        </button>

                        <button className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">
                              <UserCircle className="w-4 h-4" />
                            </div>
                            <div className="text-left">
                              <p className="text-sm font-black text-slate-900 dark:text-white">MOS</p>
                              <p className="text-[10px] font-bold text-slate-500">0231</p>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-300" />
                        </button>

                        <button className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">
                              <Clock className="w-4 h-4" />
                            </div>
                            <div className="text-left">
                              <p className="text-sm font-black text-slate-900 dark:text-white">Time in Service</p>
                              <p className="text-[10px] font-bold text-slate-500">0 months</p>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-300" />
                        </button>

                        <button className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">
                              <Clock className="w-4 h-4" />
                            </div>
                            <div className="text-left">
                              <p className="text-sm font-black text-slate-900 dark:text-white">Time in Grade</p>
                              <p className="text-[10px] font-bold text-slate-500">0 months</p>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-300" />
                        </button>
                      </div>
                    </div>

                    {/* Customize Section */}
                    <div className="space-y-3">
                      <h4 className="text-lg font-black text-slate-900 dark:text-white px-1">Customize</h4>
                      <div className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-sm divide-y divide-slate-50 dark:divide-slate-800">
                        <button className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">
                              <Palette className="w-4 h-4" />
                            </div>
                            <p className="text-sm font-black text-slate-900 dark:text-white">Theme</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-300" />
                        </button>
                        <button className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">
                              <AppWindow className="w-4 h-4" />
                            </div>
                            <p className="text-sm font-black text-slate-900 dark:text-white">App Icon</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-300" />
                        </button>
                      </div>
                    </div>

                    {/* Danger Zone */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-sm divide-y divide-slate-50 dark:divide-slate-800">
                      <button className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">
                            <Database className="w-4 h-4" />
                          </div>
                          <p className="text-sm font-black text-slate-900 dark:text-white">Account Data</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300" />
                      </button>
                      <button className="w-full p-4 flex items-center justify-between hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors group">
                        <div className="flex items-center gap-3 text-rose-500">
                          <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center">
                            <LogOut className="w-4 h-4" />
                          </div>
                          <p className="text-sm font-black">Log Out</p>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto pb-24 pt-4 px-0 scroll-smooth relative overscroll-none">
          {children}
        </main>

        {/* Bottom Tab Bar */}
        <nav className="sticky bottom-0 left-0 right-0 w-full h-20 glass z-50 px-4 flex items-center justify-around pb-2 shadow-[0_-8px_20px_rgba(0,0,0,0.05)] border-t border-slate-100 dark:border-slate-800">
          {navItems.map((item) => {
            const isActive = location === item.url;
            return (
              <Link key={item.title} href={item.url} className="flex flex-col items-center gap-1.5 transition-all duration-300 group">
                  <div className={`p-1.5 rounded-xl transition-all duration-300 ${isActive ? 'text-emerald-500 scale-110' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-400'}`}>
                    <item.icon className={`w-6 h-6 ${isActive ? 'fill-emerald-500/10 stroke-[2.5px]' : 'stroke-[1.5px]'}`} />
                  </div>
                  <span className={`text-[10px] font-bold tracking-tight uppercase ${isActive ? 'text-emerald-500' : 'text-slate-400 dark:text-slate-500'}`}>
                    {item.title}
                  </span>
                  {isActive && (
                    <div className="absolute -top-1 w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                  )}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
