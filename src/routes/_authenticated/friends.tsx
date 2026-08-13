import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Check,
  Clock,
  MessageCircle,
  Search,
  UserMinus,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Chip, EmptyState, PageHeading } from "@/components/gp";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/greenpulse";
import { levelFor } from "@/lib/levels";
import { openDirectConversation } from "@/lib/chat";
import {
  acceptFriendRequest,
  cancelFriendRequest,
  displayName,
  fetchFriendGraph,
  friendshipState,
  initialsOf,
  lastActiveLabel,
  profilesByIds,
  rejectFriendRequest,
  removeFriend,
  searchUsers,
  sendFriendRequest,
  type SocialUser,
} from "@/lib/social";

export const Route = createFileRoute("/_authenticated/friends")({
  head: () => ({
    meta: [
      { title: "Friends & Community — GreenPulse AI" },
      {
        name: "description",
        content: "Find classmates, send friend requests and see the level and green points of your campus community.",
      },
      { property: "og:title", content: "Friends & Community — GreenPulse AI" },
      { property: "og:description", content: "Connect with students building a greener campus together." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FriendsPage,
});

type Tab = "friends" | "requests" | "discover";

function FriendsPage() {
  const [tab, setTab] = useState<Tab>("friends");
  const [term, setTerm] = useState("");
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: graph, isLoading: graphLoading } = useQuery({
    queryKey: ["friend-graph"],
    queryFn: fetchFriendGraph,
  });

  const relatedIds = useMemo(() => {
    if (!graph) return [];
    const ids = new Set<string>();
    graph.friends.forEach((f) => ids.add(f.friendId));
    graph.requests.forEach((r) => {
      ids.add(r.requester_id);
      ids.add(r.addressee_id);
    });
    if (graph.me) ids.delete(graph.me);
    return [...ids];
  }, [graph]);

  const { data: peopleMap } = useQuery({
    queryKey: ["friends-page", relatedIds],
    queryFn: () => profilesByIds(relatedIds),
    enabled: relatedIds.length > 0,
  });

  const { data: searchResults, isFetching: searching } = useQuery({
    queryKey: ["user-search", term],
    queryFn: () => searchUsers(term),
    enabled: tab === "discover",
  });

  const act = useMutation({
    mutationFn: async (input: { action: "add" | "cancel" | "accept" | "reject" | "remove"; id: string }) => {
      if (input.action === "add") return sendFriendRequest(input.id);
      if (input.action === "cancel") return cancelFriendRequest(input.id);
      if (input.action === "accept") return acceptFriendRequest(input.id);
      if (input.action === "reject") return rejectFriendRequest(input.id);
      return removeFriend(input.id);
    },
    onSuccess: (_d, input) => {
      const messages: Record<string, string> = {
        add: "Friend request sent",
        cancel: "Request cancelled",
        accept: "You're now friends 🎉",
        reject: "Request declined",
        remove: "Friend removed",
      };
      toast.success(messages[input.action] ?? "Done");
      queryClient.invalidateQueries({ queryKey: ["friend-graph"] });
      queryClient.invalidateQueries({ queryKey: ["user-search"] });
    },
    onError: (error: Error) => toast.error(error.message || "Something went wrong."),
  });

  async function messageUser(id: string) {
    try {
      await openDirectConversation(id);
      navigate({ to: "/messages" });
    } catch {
      toast.error("Could not open the chat.");
    }
  }

  const me = graph?.me ?? null;
  const incoming = (graph?.requests ?? []).filter((r) => r.addressee_id === me);
  const outgoing = (graph?.requests ?? []).filter((r) => r.requester_id === me);

  const friendRows = (graph?.friends ?? [])
    .map((f) => ({ user: peopleMap?.[f.friendId], since: f.since }))
    .filter((r): r is { user: SocialUser; since: string } => Boolean(r.user))
    .filter((r) => {
      if (tab !== "friends" || !term.trim()) return true;
      const q = term.trim().toLowerCase();
      return (
        displayName(r.user).toLowerCase().includes(q) || (r.user.college ?? "").toLowerCase().includes(q)
      );
    })
    .sort((a, b) => b.user.green_points - a.user.green_points);

  const TABS: { key: Tab; label: string; count?: number }[] = [
    { key: "friends", label: "Friends", count: graph?.friends.length ?? 0 },
    { key: "requests", label: "Requests", count: incoming.length },
    { key: "discover", label: "Discover" },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeading title="Friends" subtitle="Connect with students making campus greener." />

      <div className="flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setTab(t.key);
              setTerm("");
            }}
            className={cn(
              "flex-1 rounded-full border px-3 py-2 text-xs font-semibold transition-all",
              tab === t.key
                ? "border-primary/30 bg-gradient-primary text-primary-foreground shadow-glow"
                : "border-border bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
            {t.count ? ` (${t.count})` : ""}
          </button>
        ))}
      </div>

      {tab !== "requests" && (
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder={tab === "friends" ? "Search your friends" : "Search by name, college or username"}
            className="h-11 rounded-xl pl-10"
          />
        </div>
      )}

      {graphLoading && <Skeleton className="h-56 rounded-3xl" />}

      {tab === "friends" && !graphLoading && (
        <div className="space-y-3">
          {friendRows.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No friends yet"
              description="Head to Discover to search students from your college and send a friend request."
            />
          ) : (
            friendRows.map(({ user, since }) => (
              <PersonCard
                key={user.id}
                user={user}
                caption={`Friends since ${new Date(since).toLocaleDateString([], { month: "short", year: "numeric" })}`}
                actions={
                  <>
                    <Button size="sm" variant="secondary" className="rounded-full" onClick={() => messageUser(user.id)}>
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full"
                      disabled={act.isPending}
                      onClick={() => act.mutate({ action: "remove", id: user.id })}
                    >
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  </>
                }
              />
            ))
          )}
        </div>
      )}

      {tab === "requests" && !graphLoading && (
        <div className="space-y-5">
          <section className="space-y-3">
            <h2 className="font-display text-sm font-semibold">Incoming ({incoming.length})</h2>
            {incoming.length === 0 && <p className="text-sm text-muted-foreground">No pending requests.</p>}
            {incoming.map((r) => {
              const user = peopleMap?.[r.requester_id];
              if (!user) return null;
              return (
                <PersonCard
                  key={r.id}
                  user={user}
                  caption={`Requested ${lastActiveLabel(r.created_at)}`}
                  actions={
                    <>
                      <Button
                        size="sm"
                        className="rounded-full"
                        disabled={act.isPending}
                        onClick={() => act.mutate({ action: "accept", id: r.id })}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full"
                        disabled={act.isPending}
                        onClick={() => act.mutate({ action: "reject", id: r.id })}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  }
                />
              );
            })}
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-sm font-semibold">Sent ({outgoing.length})</h2>
            {outgoing.length === 0 && <p className="text-sm text-muted-foreground">No outgoing requests.</p>}
            {outgoing.map((r) => {
              const user = peopleMap?.[r.addressee_id];
              if (!user) return null;
              return (
                <PersonCard
                  key={r.id}
                  user={user}
                  caption="Waiting for a response"
                  actions={
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full"
                      disabled={act.isPending}
                      onClick={() => act.mutate({ action: "cancel", id: r.id })}
                    >
                      <Clock className="mr-1 h-3.5 w-3.5" /> Cancel
                    </Button>
                  }
                />
              );
            })}
          </section>
        </div>
      )}

      {tab === "discover" && (
        <div className="space-y-3">
          {searching && <Skeleton className="h-40 rounded-3xl" />}
          {!searching && (searchResults ?? []).length === 0 && (
            <EmptyState icon={Search} title="No students found" description="Try a different name or college." />
          )}
          {(searchResults ?? []).map((user) => {
            const relation = graph ? friendshipState(graph, user.id) : { state: "none" as const };
            return (
              <PersonCard
                key={user.id}
                user={user}
                caption={lastActiveLabel(user.last_active_at)}
                actions={
                  relation.state === "friends" ? (
                    <Chip className="border-primary/30 bg-accent text-accent-foreground">Friends</Chip>
                  ) : relation.state === "outgoing" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full"
                      disabled={act.isPending}
                      onClick={() => act.mutate({ action: "cancel", id: relation.requestId! })}
                    >
                      <Clock className="mr-1 h-3.5 w-3.5" /> Pending
                    </Button>
                  ) : relation.state === "incoming" ? (
                    <Button
                      size="sm"
                      className="rounded-full"
                      disabled={act.isPending}
                      onClick={() => act.mutate({ action: "accept", id: relation.requestId! })}
                    >
                      <Check className="mr-1 h-3.5 w-3.5" /> Accept
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="rounded-full"
                      disabled={act.isPending}
                      onClick={() => act.mutate({ action: "add", id: user.id })}
                    >
                      <UserPlus className="mr-1 h-3.5 w-3.5" /> Add
                    </Button>
                  )
                }
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function PersonCard({
  user,
  caption,
  actions,
}: {
  user: SocialUser;
  caption: string;
  actions: React.ReactNode;
}) {
  const name = displayName(user);
  const info = levelFor(user.green_points);

  return (
    <div className="animate-rise surface-card flex items-center gap-3 p-4">
      <Link to="/u/$userId" params={{ userId: user.id }} className="shrink-0">
        <Avatar className="h-11 w-11">
          {user.avatar_url && <AvatarImage src={user.avatar_url} alt={name} />}
          <AvatarFallback className="bg-accent text-xs font-semibold text-accent-foreground">
            {initialsOf(name)}
          </AvatarFallback>
        </Avatar>
      </Link>
      <Link to="/u/$userId" params={{ userId: user.id }} className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{name}</p>
        <p className="truncate text-[11px] text-muted-foreground">{user.college || "Campus student"}</p>
        <p className="mt-0.5 truncate text-[11px] font-medium text-primary">
          Lv {info.level} · {formatNumber(user.green_points)} pts · {caption}
        </p>
      </Link>
      <div className="flex shrink-0 items-center gap-1.5">{actions}</div>
    </div>
  );
}
