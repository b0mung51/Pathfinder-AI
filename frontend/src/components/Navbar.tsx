import { Link, useLocation, useNavigate } from "react-router-dom";
import { GraduationCap, Search, ListChecks, User, LogOut, LogIn, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const navItems = [
  { label: "Dashboard", path: "/dashboard", icon: GraduationCap },
  { label: "College Search", path: "/search", icon: Search },
  { label: "Program Search", path: "/program-search", icon: BookOpen },
  { label: "My List", path: "/list", icon: ListChecks },
  { label: "Profile", path: "/profile", icon: User },
];

export function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticating, signOut } = useAuth();
  const { toast } = useToast();

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <GraduationCap className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold">PathFinder AI</span>
        </Link>

        {location.pathname !== "/" ? (
          <div className="flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <Button
                  key={item.path}
                  variant={isActive ? "default" : "ghost"}
                  size="sm"
                  asChild
                  className={cn(
                    "transition-smooth",
                    isActive && "shadow-card"
                  )}
                >
                  <Link to={item.path}>
                    <Icon className="h-4 w-4" />
                    <span className="hidden md:inline">{item.label}</span>
                  </Link>
                </Button>
              );
            })}
          </div>
        ) : (
          <div />
        )}

        <div className="flex items-center gap-2">
          {!user ? (
            <Button
              variant="secondary"
              size="sm"
              className="transition-smooth"
              disabled={isAuthenticating}
              onClick={() => navigate("/auth")}
            >
              <LogIn className="mr-2 h-4 w-4" />
              Sign In
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="transition-smooth"
              disabled={isAuthenticating}
              onClick={async () => {
                try {
                  await signOut();
                  toast({
                    title: "Signed out",
                    description: "Come back soon!",
                  });
                  navigate("/", { replace: true });
                } catch (error) {
                  const message = error instanceof Error ? error.message : "Unable to sign out.";
                  toast({
                    title: "Sign out failed",
                    description: message,
                    variant: "destructive",
                  });
                }
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
}
