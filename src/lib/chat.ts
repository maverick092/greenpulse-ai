import { supabase } from "@/integrations/supabase/client";

export type ChatProfile = {
  id: string;
  full_name: string;
  college: string;
  avatar_url: string | null;
};

export type ChatMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: string;
  attachment_path: string | null;
  created_at: string;
};

export type ConversationSummary = {
  id: string;
  type: string;
  name: string | null;
  image_path: string | null;
  updated_at: string;
  members: ChatProfile[];
  lastMessage: ChatMessage | null;
  unread: number;
  lastReadAt: string;
};

export const ONLINE_WINDOW_MS = 90_000;

export function isOnline(lastSeen?: string | null) {
  if (!lastSeen) return false;
  return Date.now() - new Date(lastSeen).getTime() < ONLINE_WINDOW_MS;
}

export function conversationTitle(c: ConversationSummary, meId: string) {
  if (c.type === "group") return c.name?.trim() || "Group chat";
  const other = c.members.find((m) => m.id !== meId);
  return other?.full_name?.trim() || "GreenPulse user";
}

export function otherMember(c: ConversationSummary, meId: string) {
  return c.members.find((m) => m.id !== meId) ?? null;
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

export function formatChatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { day: "numeric", month: "short" });
}

export async function currentUserId() {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/** Loads every conversation the signed-in user belongs to, with previews + unread counts. */
export async function fetchConversations(): Promise<ConversationSummary[]> {
  const meId = await currentUserId();
  if (!meId) return [];

  const { data: myMemberships, error } = await supabase
    .from("conversation_members")
    .select("conversation_id, last_read_at")
    .eq("user_id", meId);
  if (error) throw error;
  const ids = (myMemberships ?? []).map((m) => m.conversation_id);
  if (ids.length === 0) return [];

  const [{ data: conversations }, { data: allMembers }, { data: recentMessages }] = await Promise.all([
    supabase.from("conversations").select("*").in("id", ids),
    supabase.from("conversation_members").select("conversation_id, user_id").in("conversation_id", ids),
    supabase
      .from("messages")
      .select("*")
      .in("conversation_id", ids)
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  const memberIds = Array.from(new Set((allMembers ?? []).map((m) => m.user_id)));
  const { data: profiles } = memberIds.length
    ? await supabase.from("profiles").select("id, full_name, college, avatar_url").in("id", memberIds)
    : { data: [] as ChatProfile[] };
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p as ChatProfile]));

  return (conversations ?? [])
    .map((c) => {
      const lastReadAt =
        (myMemberships ?? []).find((m) => m.conversation_id === c.id)?.last_read_at ?? c.created_at;
      const msgs = (recentMessages ?? []).filter((m) => m.conversation_id === c.id);
      const members = (allMembers ?? [])
        .filter((m) => m.conversation_id === c.id)
        .map((m) => profileById.get(m.user_id))
        .filter((p): p is ChatProfile => Boolean(p));
      const unread = msgs.filter(
        (m) => m.sender_id !== meId && new Date(m.created_at) > new Date(lastReadAt),
      ).length;
      return {
        id: c.id,
        type: c.type,
        name: c.name,
        image_path: c.image_path,
        updated_at: c.updated_at,
        members,
        lastMessage: (msgs[0] as ChatMessage | undefined) ?? null,
        unread,
        lastReadAt,
      } satisfies ConversationSummary;
    })
    .sort(
      (a, b) =>
        new Date(b.lastMessage?.created_at ?? b.updated_at).getTime() -
        new Date(a.lastMessage?.created_at ?? a.updated_at).getTime(),
    );
}

export async function fetchMessages(conversationId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(300);
  if (error) throw error;
  return (data ?? []) as ChatMessage[];
}

export async function searchPeople(term: string): Promise<ChatProfile[]> {
  const meId = await currentUserId();
  let query = supabase.from("profiles").select("id, full_name, college, avatar_url").limit(30);
  if (term.trim()) query = query.ilike("full_name", `%${term.trim()}%`);
  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as ChatProfile[]).filter((p) => p.id !== meId);
}

/** Reuses an existing 1:1 conversation between the two users when one exists. */
export async function openDirectConversation(otherUserId: string): Promise<string> {
  const meId = await currentUserId();
  if (!meId) throw new Error("You need to be signed in to start a chat.");

  const { data: mine } = await supabase
    .from("conversation_members")
    .select("conversation_id")
    .eq("user_id", meId);
  const myIds = (mine ?? []).map((m) => m.conversation_id);

  if (myIds.length) {
    const { data: shared } = await supabase
      .from("conversation_members")
      .select("conversation_id")
      .eq("user_id", otherUserId)
      .in("conversation_id", myIds);
    const sharedIds = (shared ?? []).map((m) => m.conversation_id);
    if (sharedIds.length) {
      const { data: directs } = await supabase
        .from("conversations")
        .select("id")
        .eq("type", "direct")
        .in("id", sharedIds);
      const existing = directs?.[0]?.id;
      if (existing) return existing;
    }
  }

  const { data: created, error } = await supabase
    .from("conversations")
    .insert({ type: "direct", created_by: meId })
    .select("id")
    .single();
  if (error) throw error;

  const { error: memberError } = await supabase.from("conversation_members").insert([
    { conversation_id: created.id, user_id: meId },
    { conversation_id: created.id, user_id: otherUserId },
  ]);
  if (memberError) throw memberError;
  return created.id;
}

export async function createGroupConversation(name: string, memberIds: string[]): Promise<string> {
  const meId = await currentUserId();
  if (!meId) throw new Error("You need to be signed in to create a group.");
  if (!name.trim()) throw new Error("Give your group a name.");
  if (memberIds.length < 2) throw new Error("Pick at least 2 other people for a group.");

  const { data: created, error } = await supabase
    .from("conversations")
    .insert({ type: "group", name: name.trim(), created_by: meId })
    .select("id")
    .single();
  if (error) throw error;

  const unique = Array.from(new Set([meId, ...memberIds]));
  const { error: memberError } = await supabase
    .from("conversation_members")
    .insert(unique.map((user_id) => ({ conversation_id: created.id, user_id })));
  if (memberError) throw memberError;
  return created.id;
}

export async function addGroupMembers(conversationId: string, memberIds: string[]) {
  if (!memberIds.length) return;
  const { error } = await supabase
    .from("conversation_members")
    .upsert(
      memberIds.map((user_id) => ({ conversation_id: conversationId, user_id })),
      { onConflict: "conversation_id,user_id", ignoreDuplicates: true },
    );
  if (error) throw error;
}

export async function leaveConversation(conversationId: string) {
  const meId = await currentUserId();
  if (!meId) return;
  const { error } = await supabase
    .from("conversation_members")
    .delete()
    .eq("conversation_id", conversationId)
    .eq("user_id", meId);
  if (error) throw error;
}

export async function sendMessage(input: {
  conversationId: string;
  content: string;
  messageType?: "text" | "image" | "file";
  attachmentPath?: string | null;
}) {
  const meId = await currentUserId();
  if (!meId) throw new Error("You need to be signed in to send messages.");
  const { error } = await supabase.from("messages").insert({
    conversation_id: input.conversationId,
    sender_id: meId,
    content: input.content,
    message_type: input.messageType ?? "text",
    attachment_path: input.attachmentPath ?? null,
  });
  if (error) throw error;
}

export async function uploadAttachment(file: File): Promise<string> {
  const meId = await currentUserId();
  if (!meId) throw new Error("You need to be signed in to share files.");
  const ext = file.name.split(".").pop() ?? "bin";
  const path = `${meId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("chat-attachments").upload(path, file);
  if (error) throw error;
  return path;
}

export async function attachmentUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from("chat-attachments").createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

export async function markConversationRead(conversationId: string) {
  const meId = await currentUserId();
  if (!meId) return;
  await supabase
    .from("conversation_members")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("user_id", meId);
}

export async function markMessagesRead(messageIds: string[]) {
  const meId = await currentUserId();
  if (!meId || !messageIds.length) return;
  await supabase
    .from("message_read_status")
    .upsert(
      messageIds.map((message_id) => ({ message_id, user_id: meId })),
      { onConflict: "message_id,user_id", ignoreDuplicates: true },
    );
}

export async function fetchReadStatus(conversationId: string) {
  const { data } = await supabase
    .from("messages")
    .select("id, message_read_status(user_id)")
    .eq("conversation_id", conversationId);
  const map = new Map<string, string[]>();
  for (const row of data ?? []) {
    map.set(
      row.id,
      ((row.message_read_status ?? []) as { user_id: string }[]).map((r) => r.user_id),
    );
  }
  return map;
}

export async function fetchPresence(userIds: string[]) {
  if (!userIds.length) return new Map<string, string>();
  const { data } = await supabase.from("user_presence").select("user_id, last_seen_at").in("user_id", userIds);
  return new Map((data ?? []).map((p) => [p.user_id, p.last_seen_at]));
}

export async function heartbeatPresence() {
  const meId = await currentUserId();
  if (!meId) return;
  await supabase
    .from("user_presence")
    .upsert({ user_id: meId, last_seen_at: new Date().toISOString() }, { onConflict: "user_id" });
}
