import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Award, Flame, LogOut, Lock, Sparkles, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Chip, Counter, PageHeading } from "@/components/gp";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile & Badges — GreenPulse AI" },
      { name: "description", content: "Your green points, streaks, badges and campus sustainability achievements." },
      { property: "og:title", content: "Profile & Badges — GreenPulse AI" },
      { property: "og:description", content: "Track achievements and level up your campus impact." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<{ full_name: string; college: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["profile-page"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const [profileRes, badgesRes, earnedRes, reportsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", auth.user!.id).maybeSingle(),
        supabase.from("badges").select("*").order("sort_order", { ascending: true }),
        supabase.from("user_badges").select("badge_code, earned_at"),
        supabase.from("reports").select("status"),
      ]);
      return {
        email: auth.user?.email ?? "",
        profile: profileRes.data,
        badges: badgesRes.data ?? [],
        earned: earnedRes.data ?? [],
        reports: reportsRes.data ?? [],
      };
    },
  });

  async function saveProfile() {
    if (!form) return;
    setSaving(true);
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: form.full_name.trim(), college: form.college.trim() })
      .eq("id", auth.user!.id);
    setSaving(false);
    if (error) {
      toast.error("Could not update your profile.");
      return;
    }
    toast.success("Profile updated");
    setForm(null);
    await queryClient.invalidateQueries();
  }

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-48 rounded-3xl" />
        <Skeleton className="h-64 rounded-3xl" />
      </div>
    );
  }

  const profile = data?.profile;
  const points = profile?.green_points ?? 0;
  const earnedCodes = new Set((data?.earned ?? []).map((b) => b.badge_code));
  const resolved = (data?.reports ?? []).filter((r) => r.status === "resolved").length;
  const level = Math.floor(points / 250) + 1;
  const progress = ((points % 250) / 250) * 100;
  const initials = (profile?.full_name ?? data?.email ?? "G").slice(0, 2).toUpperCase();

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeading title="Profile" subtitle="Your impact, achievements and account." />

      <div className="animate-rise overflow-hidden rounded-3xl bg-gradient-primary p-6 text-primary-foreground shadow-glow">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 border-2 border-primary-foreground/30">
            <AvatarFallback className="bg-primary-foreground/15 font-display text-lg font-bold text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h2 className="truncate font-display text-xl font-bold">{profile?.full_name || "Green Student"}</h2>
            <p className="truncate text-sm opacity-80">{profile?.college || data?.email}</p>
            <p className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/15 px-2.5 py-0.5 text-[11px] font-semibold">
              <Sparkles className="h-3 w-3" /> Level {level} Eco Champion
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <HeroStat value={points} label="Green Points" />
          <HeroStat value={profile?.streak_days ?? 0} label="Day Streak" />
          <HeroStat value={resolved} label="Resolved" />
        </div>

        <div className="mt-5">
          <div className="flex justify-between text-[11px] font-medium opacity-80">
            <span>Level {level}</span>
            <span>{250 - (points % 250)} pts to level {level + 1}</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-primary-foreground/20">
            <div className="h-full rounded-full bg-primary-foreground transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      <div className="animate-rise surface-card p-5">
        <div className="flex items-center gap-2">
          <Award className="h-5 w-5 text-primary" />
          <h2 className="font-display text-base font-semibold">Badges</h2>
          <Chip className="border-border bg-muted text-muted-foreground">
            {earnedCodes.size}/{data?.badges.length ?? 0}
          </Chip>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {(data?.badges ?? []).map((badge) => {
            const earned = earnedCodes.has(badge.code);
            return (
              <div
                key={badge.code}
                className={cn(
                  "rounded-2xl border p-4 text-center transition-all",
                  earned
                    ? "border-primary/30 bg-gradient-mint shadow-soft"
                    : "border-dashed border-border bg-muted/40 opacity-70",
                )}
              >
                <span className="text-3xl">{earned ? badge.emoji : "🔒"}</span>
                <p className="mt-2 font-display text-sm font-semibold">{badge.name}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{badge.description}</p>
                {!earned && (
                  <p className="mt-2 inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                    <Lock className="h-3 w-3" /> Locked
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="animate-rise surface-card p-5">
        <h2 className="font-display text-base font-semibold">Account details</h2>
        <div className="mt-4 space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Full name</Label>
            <Input
              value={form?.full_name ?? profile?.full_name ?? ""}
              onChange={(e) =>
                setForm({
                  full_name: e.target.value,
                  college: form?.college ?? profile?.college ?? "",
                })
              }
              className="h-11 rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">College / University</Label>
            <Input
              value={form?.college ?? profile?.college ?? ""}
              onChange={(e) =>
                setForm({
                  full_name: form?.full_name ?? profile?.full_name ?? "",
                  college: e.target.value,
                })
              }
              className="h-11 rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Email</Label>
            <Input value={data?.email ?? ""} readOnly disabled className="h-11 rounded-xl" />
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              onClick={saveProfile}
              disabled={!form || saving}
              className="h-11 rounded-full bg-gradient-primary px-6 text-primary-foreground shadow-glow"
            >
              {saving ? "Saving…" : "Save changes"}
            </Button>
            <Button onClick={signOut} variant="outline" className="h-11 rounded-full px-6">
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </Button>
          </div>
        </div>
      </div>

      <div className="surface-card flex items-center gap-3 p-5">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-mint text-primary">
          <TrendingUp className="h-5 w-5" />
        </span>
        <p className="text-xs text-muted-foreground">
          Keep reporting to grow your streak — <Flame className="inline h-3 w-3 text-primary" /> daily activity keeps your
          campus score climbing.
        </p>
      </div>
    </div>
  );
}

function HeroStat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-2xl bg-primary-foreground/15 p-3 text-center">
      <p className="font-display text-lg font-bold">
        <Counter value={value} />
      </p>
      <p className="text-[10px] opacity-80">{label}</p>
    </div>
  );
}
