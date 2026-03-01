import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { 
  Home, 
  FolderLock, 
  Target, 
  MessageSquareWarning, 
  Users,
  ShieldAlert,
  ChevronRight
} from "lucide-react";
import { 
  Sidebar, 
  SidebarContent, 
  SidebarGroup, 
  SidebarGroupContent, 
  SidebarGroupLabel, 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger
} from "@/components/ui/sidebar";
import { useProfile } from "@/hooks/use-profile";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

const navItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Vault", url: "/vault", icon: FolderLock },
  { title: "Readiness", url: "/readiness", icon: Target },
  { title: "Advisor", url: "/advisor", icon: MessageSquareWarning },
  { title: "Community", url: "/community", icon: Users },
];

function AppSidebar() {
  const [location] = useLocation();
  const { data: profile, isLoading } = useProfile();

  return (
    <Sidebar className="border-r border-border bg-sidebar">
      <SidebarContent>
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-accent rounded-md flex items-center justify-center shadow-inner">
            <Target className="w-5 h-5 text-accent-foreground" />
          </div>
          <span className="font-display font-bold text-xl tracking-tight">Waypoints</span>
        </div>

        <div className="px-4 pb-6">
          <div className="bg-secondary/50 rounded-xl p-4 border border-border/50 backdrop-blur-sm">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-3 w-32" />
              </div>
            ) : profile ? (
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">{profile.rank} {profile.branch}</span>
                  {profile.isPro && (
                    <Badge variant="secondary" className="bg-accent/20 text-accent hover:bg-accent/20 text-[10px] uppercase font-bold border-accent/30 h-5 px-1.5">PRO</Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground font-mono">MOS: {profile.mos}</span>
              </div>
            ) : null}
          </div>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider font-semibold text-muted-foreground/70">Career OS</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = location === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive}
                      className={`
                        my-0.5 rounded-lg transition-colors
                        ${isActive 
                          ? 'bg-accent text-accent-foreground hover:bg-accent hover:text-accent-foreground shadow-sm' 
                          : 'hover:bg-secondary text-foreground/80'}
                      `}
                    >
                      <Link href={item.url} className="flex items-center gap-3 px-3 py-2.5">
                        <item.icon className="w-4 h-4" />
                        <span className="font-medium text-sm">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  const style = {
    "--sidebar-width": "18rem",
    "--sidebar-width-icon": "4rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full bg-background overflow-hidden selection:bg-accent/20">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="h-16 flex items-center px-4 border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-20">
            <SidebarTrigger className="md:hidden mr-4" />
            <div className="flex-1" />
            {/* Optional Header Actions */}
            <div className="flex items-center gap-4">
              <button className="text-muted-foreground hover:text-foreground transition-colors">
                <ShieldAlert className="w-5 h-5" />
              </button>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 scroll-smooth">
            <div className="max-w-6xl mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
