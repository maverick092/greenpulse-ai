import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Home,
  CirclePlus,
  ClipboardList,
  ChartPie,
  Bot,
  BookOpen,
  MessageCircle,
  User,
  Bell,
  LogOut,
  Leaf,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/greenpulse-logo.png";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useUnreadTotal } from "@/hooks/use-chat";
import type { ReactNode } from "react";

const NAV = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/report", label: "Report", icon: CirclePlus },
  { to: "/reports", label: "My Reports", icon: ClipboardList },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { to: "/friends", label: "Friends", icon: Users },
  { to: "/analytics", label: "Analytics", icon: ChartPie },
  { to: "/assistant", label: "GreenBot", icon: Bot },
  { to: "/messages", label: "Messages", icon: MessageCircle },
  { to: "/learn", label: "Learn", icon: BookOpen },
  { to: "/profile", label: "Profile", icon: User },
] as const;

const MOBILE_NAV = ["/home", "/report", "/leaderboard", "/friends", "/profile"];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", auth.user.id)
        .maybeSingle();
      return data;
    },
  });

  const { data: notifications } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(12);
      return data ?? [];
    },
  });

  const unread = (notifications ?? []).filter((n) => !n.read).length;
  const unreadChats = useUnreadTotal();

  async function markAllRead() {
    await supabase.from("notifications").update({ read: true }).eq("read", false);
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  }

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const isActive = (to: string) => pathname === to || pathname.startsWith(`${to}/`);

  return (
    <div className="min-h-screen w-full bg-gradient-hero">
      <div className="mx-auto flex w-full max-w-[1400px]">
        {/* Desktop sidebar */}
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border/70 bg-sidebar/70 p-5 backdrop-blur-xl lg:flex">
          <Link to="/home" className="flex items-center gap-2.5">
            <img src={logo} alt="GreenPulse AI" width={36} height={36} className="h-9 w-9" />
            <div>
              <p className="font-display text-base font-bold leading-none text-foreground">GreenPulse AI</p>
              <p className="mt-1 text-[11px] text-muted-foreground">Smart Campus. Green Future.</p>
            </div>
          </Link>

          <nav className="mt-8 flex flex-col gap-1">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                  isActive(item.to)
                    ? "bg-accent text-accent-foreground shadow-soft"
                    : "text-muted-foreground hover:bg-accent/60 hover:text-accent-foreground",
                )}
              >
                <item.icon className="h-4.5 w-4.5" />
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="mt-auto space-y-3">
            <div className="rounded-2xl bg-gradient-primary p-4 text-primary-foreground shadow-glow">
              <div className="flex items-center gap-2 text-xs font-medium opacity-90">
                <Leaf className="h-4 w-4" /> Green Points
              </div>
              <p className="mt-1 font-display text-2xl font-bold">{profile?.green_points ?? 0}</p>
              <p className="text-[11px] opacity-90">{profile?.streak_days ?? 1} day streak</p>
            </div>
            <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground" onClick={signOut}>
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          </div>
        </aside>

        <div className="flex min-h-screen w-full flex-col">
          {/* Top bar */}
          <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border/60 bg-background/70 px-4 py-3 backdrop-blur-xl lg:px-8">
            <Link to="/home" className="flex items-center gap-2 lg:hidden">
              <img src={logo} alt="GreenPulse AI" width={30} height={30} className="h-7.5 w-7.5" />
              <span className="font-display text-base font-bold">GreenPulse AI</span>
            </Link>
            <p className="hidden text-sm text-muted-foreground lg:block">
              Welcome back{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""} 👋
            </p>

            <div className="flex items-center gap-2">
              <span className="hidden items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground sm:inline-flex">
                <Leaf className="h-3.5 w-3.5" /> {profile?.green_points ?? 0} pts
              </span>
              <Link to="/messages" aria-label="Messages">
                <Button variant="ghost" size="icon" className="relative rounded-full" asChild>
                  <span>
                    <MessageCircle className="h-5 w-5" />
                    {unreadChats > 0 && (
                      <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                        {unreadChats > 9 ? "9+" : unreadChats}
                      </span>
                    )}
                  </span>
                </Button>
              </Link>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative rounded-full">
                    <Bell className="h-5 w-5" />
                    {unread > 0 && (
                      <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive" />
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-80 rounded-2xl p-0">
                  <div className="flex items-center justify-between border-b border-border px-4 py-3">
                    <p className="text-sm font-semibold">Notifications</p>
                    {unread > 0 && (
                      <button onClick={markAllRead} className="text-xs font-medium text-primary">
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {(notifications ?? []).length === 0 && (
                      <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                        No notifications yet.
                      </p>
                    )}
                    {(notifications ?? []).map((n) => (
                      <div key={n.id} className="border-b border-border/60 px-4 py-3 last:border-0">
                        <div className="flex items-start gap-2">
                          {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                          <div>
                            <p className="text-sm font-medium">{n.title}</p>
                            <p className="text-xs text-muted-foreground">{n.message}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </header>

          <main className="flex-1 px-4 pb-28 pt-5 lg:px-8 lg:pb-10">{children}</main>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/60 bg-background/85 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex max-w-md items-end justify-between">
          {NAV.filter((item) => MOBILE_NAV.includes(item.to)).map((item) => {
            const active = isActive(item.to);
            const primary = item.to === "/report";
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 rounded-xl py-1.5 text-[10px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full transition-all",
                    primary
                      ? "bg-gradient-primary text-primary-foreground shadow-glow"
                      : active
                        ? "bg-accent text-accent-foreground"
                        : "",
                  )}
                >
                  <item.icon className="h-5 w-5" />
                </span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
