import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Calendar, BarChart3, Brain, Target, Settings, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

interface MobileLayoutProps {
  children: ReactNode;
}

export function MobileLayout({ children }: MobileLayoutProps) {
  const location = useLocation();
  const { signOut } = useAuth();
  
  const navItems = [
    { path: "/", icon: Home, label: "Home" },
    { path: "/calendar", icon: Calendar, label: "Calendar" },
    { path: "/analytics", icon: BarChart3, label: "Stats" },
    { path: "/insights", icon: Brain, label: "Insights" },
    { path: "/goals", icon: Target, label: "Goals" },
    { path: "/settings", icon: Settings, label: "Settings" },
  ];
  
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-12 items-center justify-between px-4">
          <Link to="/" className="flex items-center space-x-2">
            <span className="font-semibold text-lg bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Glow
            </span>
          </Link>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={signOut}
            className="gap-1.5 h-8 text-xs"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </Button>
        </div>
      </header>
      
      <main className="flex-1 pb-16 overflow-auto">
        {children}
      </main>
      
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-40">
        <div className="flex justify-around items-center h-14 max-w-full overflow-x-auto">
          {navItems.map(({ path, icon: Icon, label }) => {
            const isActive = location.pathname === path || 
              (path !== "/" && location.pathname.startsWith(path));
            return (
              <Link
                key={path}
                to={path}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 min-w-[56px] h-full gap-0.5 transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="text-[9px] font-medium">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
