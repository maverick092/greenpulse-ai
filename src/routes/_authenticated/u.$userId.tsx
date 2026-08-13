import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  Award,
  Check,
  Clock,
  Droplets,
  Flame,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserMinus,
  UserPlus,
  Users,
  X,
  Zap,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Chip, EmptyState } from "@/components/gp";
import { formatNumber } from "@/lib/greenpulse";
import { levelFor } from "@/lib/levels";
import { openDirectConversation } from "@/lib/chat";
import {
  acceptFriendRequest,
  cancelFriendRequest,
  displayName,
  fetchFriendGraph,
  fetchPublicProfile,
  friendshipState,
  initialsOf,
  lastActiveLabel,
  rejectFriendRequest,
  removeFriend,
  sendFriendRequest,
} from "@/lib/social";

export const Route = createFileRoute("/_authenticated/u/$userId")({
  head: () => ({
    meta: [
      { title: "Student Profile — GreenPulse AI" },
      {
        name: "description",
        content: "View a GreenPulse student's level, green points, badges, campus rank and environmental impact.",
      },
      { property: "og:title", content: "Student Profile — GreenPulse AI" },
      { property: "og:description", content: "Level, points, badges and campus impact of a GreenPulse student." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PublicProfilePage,
});

function PublicProfilePage() {
  const { userId } = useParams({ from: "/_authenticated/u/$userId" });
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["public-profile", userId],
    queryFn: () => fetchPublicProfile(userId),
  });
  const { data: graph } = useQuery({ queryKey: ["friend-graph"], queryFn: fetchFriendGraph });

  const relation = graph ? friendshipState(graph, userId) : { state: "none" as const };

  const act = useMutation({
    mutationFn: async (action: "add" | "cancel" | "accept" | "reject" | "remove") => {
      if (action === "add") return sendFriendRequest(userId);
      if (action === "cancel" && relation.requestId) return cancelFriendRequest(relation.requestId);
      if (action === "accept" && relation.requestId) return acceptFriendRequest(relation.requestId);
      if (action === "reject" && relation.requestId) return rejectFriendRequest(relation.requestId);
      if (action === "remove") return removeFriend(userId);
    },
    onSuccess: (_d, action) => {
      const messages: Record<string, string> = {
        add: "Friend request sent",
        cancel: "Request cancelled",
        accept: "You're now friends 🎉",
        reject: "Request declined",
        remove: "Friend removed",
      };
      toast.success(messages[action] ?? "Done");
      queryClient.invalidateQueries({ queryKey: ["friend-graph"] });
      queryClient.invalidateQueries({ queryKey: ["public-profile", userId] });
      queryClient.invalidateQueries({ queryKey: ["friends-page"] });
    },
    onError: (error: Error) => toast.error(error.message || "Something went wrong."),
  });

  async function messageUser() {
    try {
      await openDirectConversation(userId);
      navigate({ to: "/messages" });
    } catch {
      toast.error("Could not open the chat.");
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-52 rounded-3xl" />
        <Skeleton className="h-40 rounded-3xl" />
      </div>
    );
  }

  if (!profile) {
    return (
      <EmptyState
        icon={Users}
        title="Student not found"
        description="This profile doesn't exist or is no longer available."
      />
    );
  }

  const info = levelFor(profile.green_points);
  const name = displayName(profile);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link to="/friends" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <div className="animate-rise overflow-hidden rounded-3xl bg-gradient-primary p-6 text-primary-foreground shadow-glow">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 border-2 border-primary-foreground/30">
            {profile.avatar_url && <AvatarImage src={profile.avatar_url} alt={name} />}
            <AvatarFallback className="bg-primary-foreground/15 font-display text-lg font-bold text-primary-foreground">
              {initialsOf(name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h1 className="truncate font-display text-xl font-bold">{name}</h1>
            <p className="truncate text-sm opacity-80">{profile.college || "Campus student"}</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/15 px-2.5 py-0.5 text-[11px] font-semibold">
                <Sparkles className="h-3 w-3" /> Level {info.level} · {info.title}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/15 px-2.5 py-0.5 text-[11px] font-semibold">
                <Trophy className="h-3 w-3" /> Rank #{profile.rank}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <HeroStat value={formatNumber(profile.green_points)} label="Green Points" />
          <HeroStat value={String(profile.friend_count)} label="Friends" />
          <HeroStat value={`${profile.reputation}%`} label="Accuracy" />
        </div>

        <div className="mt-5">
          <div className="flex justify-between text-[11px] font-medium opacity-80">
            <span>Level {info.level}</span>
            <span>
              {info.nextTitle ? `${formatNumber(info.pointsToNext)} pts to ${info.nextTitle}` : "Max level reached"}
            </span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-primary-foreground/20">
            <div className="h-full rounded-full bg-primary-foreground transition-all" style={{ width: `${info.progress}%` }} />
          </div>
        </div>
      </div>

      <div className="animate-rise flex flex-wrap gap-2">
        {relation.state === "none" && (
          <Button onClick={() => act.mutate("add")} disabled={act.isPending} className="rounded-full">
            <UserPlus className="mr-1.5 h-4 w-4" /> Add friend
          </Button>
        )}
        {relation.state === "outgoing" && (
          <Button variant="outline" onClick={() => act.mutate("cancel")} disabled={act.isPending} className="rounded-full">
            <Clock className="mr-1.5 h-4 w-4" /> Pending · Cancel
          </Button>
        )}
        {relation.state === "incoming" && (
          <>
            <Button onClick={() => act.mutate("accept")} disabled={act.isPending} className="rounded-full">
              <Check className="mr-1.5 h-4 w-4" /> Accept request
            </Button>
            <Button variant="outline" onClick={() => act.mutate("reject")} disabled={act.isPending} className="rounded-full">
              <X className="mr-1.5 h-4 w-4" /> Decline
            </Button>
          </>
        )}
        {relation.state === "friends" && (
          <Button variant="outline" onClick={() => act.mutate("remove")} disabled={act.isPending} className="rounded-full">
            <UserMinus className="mr-1.5 h-4 w-4" /> Remove friend
          </Button>
        )}
        {relation.state !== "self" && (
          <Button variant="secondary" onClick={messageUser} className="rounded-full">
            <MessageCircle className="mr-1.5 h-4 w-4" /> Message
          </Button>
        )}
        {relation.state !== "self" && profile.mutual_friends > 0 && (
          <Chip className="border-border bg-muted text-muted-foreground">
            <Users className="mr-1 h-3 w-3" /> {profile.mutual_friends} mutual
          </Chip>
        )}
      </div>

      <div className="animate-rise grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MiniStat icon={Award} label="Reports" value={String(profile.reports_count)} />
        <MiniStat icon={ShieldCheck} label="Resolved" value={String(profile.resolved_count)} />
        <MiniStat icon={Flame} label="Best streak" value={`${profile.best_streak}d`} />
        <MiniStat icon={Clock} label="Last active" value={lastActiveLabel(profile.last_active_at)} />
      </div>

      <div className="animate-rise surface-card p-5">
        <h2 className="font-display text-base font-semibold">Environmental impact</h2>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <MiniStat icon={Droplets} label="Water saved" value={`${formatNumber(profile.water_saved)} L`} />
          <MiniStat icon={Sparkles} label="CO₂ saved" value={`${formatNumber(profile.co2_saved)} kg`} />
          <MiniStat icon={Zap} label="Energy saved" value={`${formatNumber(profile.energy_saved)} kWh`} />
        </div>
      </div>

      <div className="animate-rise surface-card p-5">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          <h2 className="font-display text-base font-semibold">Achievements</h2>
          <Chip className="border-border bg-muted text-muted-foreground">{profile.badges.length}</Chip>
        </div>
        {profile.badges.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No achievements unlocked yet.</p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {profile.badges.map((badge) => (
              <div key={badge.code} className="rounded-2xl border border-primary/30 bg-gradient-mint p-4 text-center shadow-soft">
                <span className="text-3xl">{badge.emoji}</span>
                <p className="mt-2 font-display text-sm font-semibold">{badge.name}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {new Date(badge.earned_at).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function HeroStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-primary-foreground/15 p-3 text-center">
      <p className="font-display text-lg font-bold">{value}</p>
      <p className="text-[10px] uppercase tracking-wide opacity-80">{label}</p>
    </div>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Award;
  label: string;
  value: string;
}) {
  return (
    <div className="surface-card p-3 text-center">
      <Icon className="mx-auto h-4 w-4 text-primary" />
      <p className="mt-1.5 font-display text-sm font-bold">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
