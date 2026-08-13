import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Crown, Medal, Trophy, ShieldCheck, Award } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Chip, EmptyState, PageHeading } from "@/components/gp";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/greenpulse";
import { levelFor } from "@/lib/levels";
import {
  displayName,
  fetchLeaderboard,
  initialsOf,
  meId,
  type LeaderboardScope,
} from "@/lib/social";

export const Route = createFileRoute("/_authenticated/leaderboard")({
  head: () => ({
    meta: [
      { title: "Campus Leaderboard — GreenPulse AI" },
      {
        name: "description",
        content: "See the top student contributors ranked by green points, level, badges and report accuracy.",
      },
      { property: "og:title", content: "Campus Leaderboard — GreenPulse AI" },
      { property: "og:description", content: "Compete with your campus and climb the sustainability rankings." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LeaderboardPage,
});

const SCOPES: { key: LeaderboardScope; label: string }[] = [
  { key: "global", label: "Global" },
  { key: "college", label: "My College" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "all", label: "All Time" },
];

function LeaderboardPage() {
  const [scope, setScope] = useState<LeaderboardScope>("global");

  const { data: myId } = useQuery({ queryKey: ["me-id"], queryFn: meId });
  const { data, isLoading } = useQuery({
    queryKey: ["leaderboard", scope],
    queryFn: () => fetchLeaderboard(scope),
  });

  const rows = data ?? [];
  const podium = rows.slice(0, 3);
  const rest = rows.slice(3);
  const mine = rows.find((r) => r.user_id === myId);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeading title="Leaderboard" subtitle="Top campus contributors, ranked by real impact." />

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {SCOPES.map((s) => (
          <button
            key={s.key}
            onClick={() => setScope(s.key)}
            className={cn(
              "shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition-all",
              scope === s.key
                ? "border-primary/30 bg-gradient-primary text-primary-foreground shadow-glow"
                : "border-border bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-40 rounded-3xl" />
          <Skeleton className="h-64 rounded-3xl" />
        </div>
      )}

      {!isLoading && rows.length === 0 && (
        <EmptyState
          icon={Trophy}
          title="No rankings yet"
          description="Once students start reporting campus issues, the leaderboard fills up here."
        />
      )}

      {!isLoading && podium.length > 0 && (
        <div className="animate-rise grid grid-cols-3 items-end gap-2 sm:gap-3">
          {[podium[1], podium[0], podium[2]].map((row, i) =>
            row ? (
              <Link
                key={row.user_id}
                to="/u/$userId"
                params={{ userId: row.user_id }}
                className={cn(
                  "surface-card flex flex-col items-center gap-1.5 p-3 text-center transition-transform hover:-translate-y-0.5 sm:p-4",
                  i === 1 && "border-primary/30 bg-gradient-mint pb-6 pt-6 shadow-glow",
                )}
              >
                <span className="text-lg">{i === 1 ? "🥇" : i === 0 ? "🥈" : "🥉"}</span>
                <Avatar className={cn("border-2 border-primary/20", i === 1 ? "h-14 w-14" : "h-11 w-11")}>
                  {row.avatar_url && <AvatarImage src={row.avatar_url} alt={displayName(row)} />}
                  <AvatarFallback className="bg-accent font-display text-xs font-bold text-accent-foreground">
                    {initialsOf(displayName(row))}
                  </AvatarFallback>
                </Avatar>
                <p className="line-clamp-1 font-display text-xs font-bold sm:text-sm">{displayName(row)}</p>
                <p className="text-[10px] text-muted-foreground">Level {row.level}</p>
                <p className="font-display text-sm font-bold text-primary">
                  {formatNumber(row.period_points)}
                </p>
              </Link>
            ) : (
              <div key={i} />
            ),
          )}
        </div>
      )}

      {mine && (
        <div className="animate-rise flex items-center gap-3 rounded-2xl bg-gradient-primary p-4 text-primary-foreground shadow-glow">
          <Crown className="h-5 w-5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-display text-sm font-bold">Your rank: #{mine.rank}</p>
            <p className="text-[11px] opacity-90">
              Level {mine.level} · {levelFor(mine.green_points).title} · {formatNumber(mine.period_points)} points
            </p>
          </div>
          <Chip className="border-primary-foreground/25 bg-primary-foreground/15 text-primary-foreground">
            {mine.badge_count} badges
          </Chip>
        </div>
      )}

      {rest.length > 0 && (
        <div className="animate-rise surface-card divide-y divide-border/60 overflow-hidden">
          {rest.map((row) => (
            <Link
              key={row.user_id}
              to="/u/$userId"
              params={{ userId: row.user_id }}
              className={cn(
                "flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/40",
                row.user_id === myId && "bg-accent/50",
              )}
            >
              <span className="w-8 shrink-0 text-center font-display text-sm font-bold text-muted-foreground">
                #{row.rank}
              </span>
              <Avatar className="h-10 w-10">
                {row.avatar_url && <AvatarImage src={row.avatar_url} alt={displayName(row)} />}
                <AvatarFallback className="bg-accent text-xs font-semibold text-accent-foreground">
                  {initialsOf(displayName(row))}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{displayName(row)}</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  Level {row.level} · {row.college || "Campus"}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-display text-sm font-bold text-primary">{formatNumber(row.period_points)}</p>
                <p className="flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
                  <Award className="h-3 w-3" /> {row.badge_count}
                  <ShieldCheck className="ml-1 h-3 w-3" /> {row.reputation}%
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {!isLoading && rows.length > 0 && (
        <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground">
          <Medal className="h-3.5 w-3.5" /> Rankings update live from verified activity and report accuracy.
        </p>
      )}
    </div>
  );
}
