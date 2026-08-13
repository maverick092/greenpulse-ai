import { supabase } from "@/integrations/supabase/client";

export type SocialUser = {
  id: string;
  full_name: string;
  username: string | null;
  college: string;
  avatar_url: string | null;
  green_points: number;
  reputation: number;
  streak_days: number;
  last_active_at: string;
};

export type FriendshipState = "self" | "friends" | "outgoing" | "incoming" | "none";

export type FriendEdge = {
  friendId: string;
  since: string;
};

export type FriendRequestRow = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: string;
  created_at: string;
};

export type PublicProfile = {
  id: string;
  full_name: string;
  username: string | null;
  college: string;
  avatar_url: string | null;
  green_points: number;
  reputation: number;
  streak_days: number;
  best_streak: number;
  last_active_at: string;
  level: number;
  joined_at: string;
  reports_count: number;
  resolved_count: number;
  water_saved: number;
  co2_saved: number;
  energy_saved: number;
  friend_count: number;
  mutual_friends: number;
  rank: number;
  badges: {
    code: string;
    name: string;
    emoji: string;
    description: string;
    earned_at: string;
  }[];
};

export type LeaderboardRow = {
  user_id: string;
  full_name: string;
  username: string | null;
  college: string;
  avatar_url: string | null;
  green_points: number;
  period_points: number;
  badge_count: number;
  reports_count: number;
  reputation: number;
  level: number;
  rank: number;
};

export type LeaderboardScope = "global" | "college" | "month" | "week" | "all";

const PROFILE_COLUMNS =
  "id, full_name, username, college, avatar_url, green_points, reputation, streak_days, last_active_at";

export async function meId() {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export function displayName(user: { full_name?: string | null; username?: string | null }) {
  return user.full_name?.trim() || user.username?.trim() || "GreenPulse student";
}

export function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

export function lastActiveLabel(iso: string | null | undefined) {
  if (!iso) return "Unknown";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 2 * 60_000) return "Active now";
  if (diff < 60 * 60_000) return `${Math.round(diff / 60_000)}m ago`;
  if (diff < 24 * 60 * 60_000) return `${Math.round(diff / 3_600_000)}h ago`;
  const days = Math.round(diff / 86_400_000);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString([], { day: "numeric", month: "short" });
}

/** Search the student directory by name, college or username. */
export async function searchUsers(term: string): Promise<SocialUser[]> {
  const me = await meId();
  const q = term.trim();
  let query = supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .order("green_points", { ascending: false })
    .limit(30);
  if (q) {
    const like = `%${q}%`;
    query = query.or(`full_name.ilike.${like},college.ilike.${like},username.ilike.${like}`);
  }
  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as SocialUser[]).filter((u) => u.id !== me);
}

export async function fetchFriendGraph() {
  const me = await meId();
  if (!me) return { me: null, friends: [] as FriendEdge[], requests: [] as FriendRequestRow[] };

  const [friendsRes, requestsRes] = await Promise.all([
    supabase.from("friends").select("friend_id, created_at").eq("user_id", me),
    supabase
      .from("friend_requests")
      .select("id, requester_id, addressee_id, status, created_at")
      .eq("status", "pending"),
  ]);
  if (friendsRes.error) throw friendsRes.error;
  if (requestsRes.error) throw requestsRes.error;

  return {
    me,
    friends: (friendsRes.data ?? []).map((f) => ({ friendId: f.friend_id, since: f.created_at })),
    requests: (requestsRes.data ?? []) as FriendRequestRow[],
  };
}

export function friendshipState(
  graph: { me: string | null; friends: FriendEdge[]; requests: FriendRequestRow[] },
  otherId: string,
): { state: FriendshipState; requestId?: string } {
  if (!graph.me || graph.me === otherId) return { state: "self" };
  if (graph.friends.some((f) => f.friendId === otherId)) return { state: "friends" };
  const outgoing = graph.requests.find((r) => r.requester_id === graph.me && r.addressee_id === otherId);
  if (outgoing) return { state: "outgoing", requestId: outgoing.id };
  const incoming = graph.requests.find((r) => r.addressee_id === graph.me && r.requester_id === otherId);
  if (incoming) return { state: "incoming", requestId: incoming.id };
  return { state: "none" };
}

export async function profilesByIds(ids: string[]): Promise<Record<string, SocialUser>> {
  if (ids.length === 0) return {};
  const { data, error } = await supabase.from("profiles").select(PROFILE_COLUMNS).in("id", ids);
  if (error) throw error;
  const map: Record<string, SocialUser> = {};
  for (const row of (data ?? []) as SocialUser[]) map[row.id] = row;
  return map;
}

export async function sendFriendRequest(addresseeId: string) {
  const me = await meId();
  if (!me) throw new Error("Please sign in first.");
  const { error } = await supabase
    .from("friend_requests")
    .insert({ requester_id: me, addressee_id: addresseeId, status: "pending" });
  if (error) throw error;
  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", me).maybeSingle();
  await supabase.from("notifications").insert({
    user_id: addresseeId,
    title: "New friend request",
    message: `${profile?.full_name?.trim() || "A student"} wants to connect with you on GreenPulse.`,
    type: "friend",
  });
}

export async function acceptFriendRequest(requestId: string) {
  const { error } = await supabase.rpc("accept_friend_request", { _request_id: requestId });
  if (error) throw error;
}

export async function rejectFriendRequest(requestId: string) {
  const { error } = await supabase
    .from("friend_requests")
    .update({ status: "rejected" })
    .eq("id", requestId);
  if (error) throw error;
}

export async function cancelFriendRequest(requestId: string) {
  const { error } = await supabase.from("friend_requests").delete().eq("id", requestId);
  if (error) throw error;
}

export async function removeFriend(otherId: string) {
  const { error } = await supabase.rpc("remove_friend", { _other_id: otherId });
  if (error) throw error;
}

export async function fetchPublicProfile(userId: string): Promise<PublicProfile | null> {
  const { data, error } = await supabase.rpc("get_public_profile", { _user_id: userId });
  if (error) throw error;
  return (data as unknown as PublicProfile) ?? null;
}

export async function fetchLeaderboard(scope: LeaderboardScope): Promise<LeaderboardRow[]> {
  let college: string | null = null;
  let since: string | null = null;

  if (scope === "college") {
    const me = await meId();
    if (me) {
      const { data } = await supabase.from("profiles").select("college").eq("id", me).maybeSingle();
      college = data?.college?.trim() || null;
    }
  }
  if (scope === "month") since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  if (scope === "week") since = new Date(Date.now() - 7 * 86_400_000).toISOString();

  const { data, error } = await supabase.rpc("get_leaderboard", {
    _college: college,
    _since: since,
    _limit: 100,
  });
  if (error) throw error;
  return (data ?? []) as LeaderboardRow[];
}
