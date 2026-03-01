import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { 
  Home, 
  FolderLock, 
  Target, 
  MessageSquareWarning, 
  Users,
  ShieldAlert
} from "lucide-react";
import { useProfile } from "@/hooks/use-profile";
import { Badge } from "@/components/ui/badge";

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
            <button className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
              <ShieldAlert className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto pb-24 pt-4 px-6 scroll-smooth relative overscroll-none">
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
