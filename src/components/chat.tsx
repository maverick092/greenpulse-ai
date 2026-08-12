import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  ImageIcon,
  Info,
  LogOut,
  MoreVertical,
  Paperclip,
  Plus,
  Send,
  Smile,
  UserPlus,
  Users,
  WifiOff,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  attachmentUrl,
  conversationTitle,
  fetchMessages,
  fetchPresence,
  fetchReadStatus,
  formatChatTime,
  initials,
  isOnline,
  leaveConversation,
  markConversationRead,
  markMessagesRead,
  otherMember,
  searchPeople,
  sendMessage,
  uploadAttachment,
  addGroupMembers,
  type ChatMessage,
  type ConversationSummary,
} from "@/lib/chat";

const EMOJIS = ["🌱", "♻️", "💧", "🌍", "☀️", "👍", "🙌", "🎉", "😀", "😅", "🙏", "❤️", "🔥", "✅", "😮", "😢"];

export function Avatar({
  name,
  url,
  size = 44,
  online,
  group,
}: {
  name: string;
  url?: string | null | undefined;
  size?: number | undefined;
  online?: boolean | undefined;
  group?: boolean | undefined;
}) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {url ? (
        <img
          src={url}
          alt={name}
          className="h-full w-full rounded-full object-cover"
          style={{ width: size, height: size }}
        />
      ) : (
        <div
          className={cn(
            "flex h-full w-full items-center justify-center rounded-full font-semibold",
            group ? "bg-accent text-accent-foreground" : "bg-gradient-primary text-primary-foreground",
          )}
          style={{ fontSize: size * 0.36 }}
        >
          {group ? <Users style={{ width: size * 0.45, height: size * 0.45 }} /> : initials(name)}
        </div>
      )}
      {online !== undefined && !group && (
        <span
          className={cn(
            "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background",
            online ? "bg-primary" : "bg-muted-foreground/50",
          )}
        />
      )}
    </div>
  );
}

export function ConversationRow({
  conversation,
  meId,
  active,
  online,
  onSelect,
}: {
  conversation: ConversationSummary;
  meId: string;
  active: boolean;
  online: boolean;
  onSelect: () => void;
}) {
  const title = conversationTitle(conversation, meId);
  const other = otherMember(conversation, meId);
  const preview = conversation.lastMessage
    ? conversation.lastMessage.message_type === "image"
      ? "📷 Photo"
      : conversation.lastMessage.message_type === "file"
        ? "📎 Attachment"
        : conversation.lastMessage.content
    : "No messages yet — say hello 🌱";

  return (
    <button
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors",
        active ? "bg-accent" : "hover:bg-accent/60",
      )}
    >
      <Avatar
        name={title}
        url={conversation.type === "group" ? null : other?.avatar_url}
        group={conversation.type === "group"}
        online={conversation.type === "group" ? undefined : online}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-semibold text-foreground">{title}</p>
          <span className="shrink-0 text-[11px] text-muted-foreground">
            {conversation.lastMessage ? formatChatTime(conversation.lastMessage.created_at) : ""}
          </span>
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <p
            className={cn(
              "truncate text-xs",
              conversation.unread > 0 ? "font-medium text-foreground" : "text-muted-foreground",
            )}
          >
            {preview}
          </p>
          {conversation.unread > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
              {conversation.unread}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function AttachmentBubble({ path, type }: { path: string; type: string }) {
  const { data: url } = useQuery({
    queryKey: ["chat-attachment", path],
    queryFn: () => attachmentUrl(path),
    staleTime: 30 * 60_000,
  });
  if (!url) return <p className="text-xs opacity-80">Loading attachment…</p>;
  if (type === "image")
    return (
      <a href={url} target="_blank" rel="noreferrer">
        <img src={url} alt="Shared image" className="max-h-64 rounded-xl object-cover" />
      </a>
    );
  return (
    <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm underline">
      <Paperclip className="h-4 w-4" /> Open attachment
    </a>
  );
}

export function ChatThread({
  conversation,
  meId,
  onBack,
}: {
  conversation: ConversationSummary;
  meId: string;
  onBack: () => void;
}) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [offline, setOffline] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const title = conversationTitle(conversation, meId);
  const other = otherMember(conversation, meId);

  const { data: messages, isLoading, isError } = useQuery({
    queryKey: ["messages", conversation.id],
    queryFn: () => fetchMessages(conversation.id),
  });

  const { data: readStatus } = useQuery({
    queryKey: ["read-status", conversation.id, messages?.length ?? 0],
    queryFn: () => fetchReadStatus(conversation.id),
    enabled: Boolean(messages?.length),
  });

  const { data: presence } = useQuery({
    queryKey: ["presence", conversation.id],
    queryFn: () => fetchPresence(conversation.members.map((m) => m.id)),
    refetchInterval: 45_000,
  });

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel(`chat-thread-${conversation.id}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversation.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["messages", conversation.id] });
          queryClient.invalidateQueries({ queryKey: ["conversations"] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversation.id, queryClient]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages?.length]);

  useEffect(() => {
    if (!messages) return;
    void (async () => {
      await markConversationRead(conversation.id);
      await markMessagesRead(messages.filter((m) => m.sender_id !== meId).map((m) => m.id));
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    })();
  }, [conversation.id, messages, meId, queryClient]);

  async function submit() {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setDraft("");
    try {
      await sendMessage({ conversationId: conversation.id, content: text });
      queryClient.invalidateQueries({ queryKey: ["messages", conversation.id] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    } catch {
      setDraft(text);
      toast.error("Message failed to send. Check your connection and try again.");
    } finally {
      setSending(false);
    }
  }

  async function upload(file: File, kind: "image" | "file") {
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Files must be under 10 MB.");
      return;
    }
    setSending(true);
    try {
      const path = await uploadAttachment(file);
      await sendMessage({
        conversationId: conversation.id,
        content: kind === "image" ? "Photo" : file.name,
        messageType: kind,
        attachmentPath: path,
      });
      queryClient.invalidateQueries({ queryKey: ["messages", conversation.id] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    } catch {
      toast.error("Upload failed. Please try again.");
    } finally {
      setSending(false);
    }
  }

  const online = isOnline(other ? presence?.get(other.id) : null);

  return (
    <section className="flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-3 border-b border-border/60 bg-background/70 px-3 py-3 backdrop-blur-xl lg:px-5">
        <Button variant="ghost" size="icon" className="rounded-full lg:hidden" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Avatar
          name={title}
          url={conversation.type === "group" ? null : other?.avatar_url}
          group={conversation.type === "group"}
          size={40}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{title}</p>
          <p className="text-[11px] text-muted-foreground">
            {conversation.type === "group"
              ? `${conversation.members.length} member${conversation.members.length === 1 ? "" : "s"}`
              : online
                ? "Online"
                : "Offline"}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-xl">
            <DropdownMenuItem onClick={() => setShowInfo(true)}>
              <Info className="mr-2 h-4 w-4" /> Conversation info
            </DropdownMenuItem>
            {conversation.type === "group" && (
              <DropdownMenuItem onClick={() => setShowAdd(true)}>
                <UserPlus className="mr-2 h-4 w-4" /> Add members
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={async () => {
                try {
                  await leaveConversation(conversation.id);
                  queryClient.invalidateQueries({ queryKey: ["conversations"] });
                  toast.success("You left the conversation.");
                  onBack();
                } catch {
                  toast.error("Could not leave the conversation.");
                }
              }}
            >
              <LogOut className="mr-2 h-4 w-4" /> Leave conversation
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {offline && (
        <div className="flex items-center justify-center gap-2 bg-destructive/10 px-4 py-2 text-xs text-destructive">
          <WifiOff className="h-3.5 w-3.5" /> You're offline — messages will send once you reconnect.
        </div>
      )}

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-4 lg:px-6">
        {isLoading && <p className="py-10 text-center text-sm text-muted-foreground">Loading messages…</p>}
        {isError && (
          <p className="py-10 text-center text-sm text-destructive">
            We couldn't load this conversation. Please try again.
          </p>
        )}
        {!isLoading && !isError && (messages ?? []).length === 0 && (
          <div className="py-14 text-center">
            <p className="text-sm font-semibold">No messages yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Start the conversation about campus sustainability 🌱
            </p>
          </div>
        )}
        {(messages ?? []).map((m: ChatMessage) => {
          const mine = m.sender_id === meId;
          const sender = conversation.members.find((p) => p.id === m.sender_id);
          const readers = (readStatus?.get(m.id) ?? []).filter((id) => id !== meId);
          return (
            <div key={m.id} className={cn("flex gap-2", mine ? "justify-end" : "justify-start")}>
              {!mine && conversation.type === "group" && (
                <Avatar name={sender?.full_name || "User"} url={sender?.avatar_url} size={28} />
              )}
              <div
                className={cn(
                  "max-w-[78%] break-words rounded-2xl px-3.5 py-2.5 shadow-soft",
                  mine
                    ? "rounded-br-md bg-gradient-primary text-primary-foreground"
                    : "rounded-bl-md bg-card text-card-foreground",
                )}
              >
                {!mine && conversation.type === "group" && (
                  <p className="mb-1 text-[11px] font-semibold text-primary">
                    {sender?.full_name || "Removed user"}
                  </p>
                )}
                {m.attachment_path ? (
                  <AttachmentBubble path={m.attachment_path} type={m.message_type} />
                ) : (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.content}</p>
                )}
                <div
                  className={cn(
                    "mt-1 flex items-center justify-end gap-1 text-[10px]",
                    mine ? "text-primary-foreground/80" : "text-muted-foreground",
                  )}
                >
                  {formatChatTime(m.created_at)}
                  {mine && <span>{readers.length > 0 ? "· Read" : "· Sent"}</span>}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-border/60 bg-background/80 px-3 py-3 backdrop-blur-xl lg:px-5">
        <div className="flex items-end gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Plus className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="rounded-xl">
              <DropdownMenuItem onClick={() => imageRef.current?.click()}>
                <ImageIcon className="mr-2 h-4 w-4" /> Photo
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => fileRef.current?.click()}>
                <Paperclip className="mr-2 h-4 w-4" /> Attachment
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <input
            ref={imageRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void upload(f, "image");
              e.target.value = "";
            }}
          />
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void upload(f, "file");
              e.target.value = "";
            }}
          />
          <div className="flex flex-1 items-center gap-1 rounded-2xl border border-input bg-card px-3">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void submit();
                }
              }}
              placeholder="Type a message..."
              className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            />
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground">
                  <Smile className="h-4.5 w-4.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-64 rounded-2xl p-2">
                <div className="grid grid-cols-8 gap-1">
                  {EMOJIS.map((e) => (
                    <button
                      key={e}
                      onClick={() => setDraft((d) => d + e)}
                      className="rounded-lg p-1.5 text-lg hover:bg-accent"
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <Button
            size="icon"
            className="rounded-full bg-gradient-primary shadow-glow"
            disabled={sending || !draft.trim()}
            onClick={() => void submit()}
          >
            <Send className="h-4.5 w-4.5" />
          </Button>
        </div>
      </div>

      <Dialog open={showInfo} onOpenChange={setShowInfo}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              {conversation.type === "group"
                ? `${conversation.members.length} member${conversation.members.length === 1 ? "" : "s"}`
                : "Direct conversation"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {conversation.members.map((m) => (
              <div key={m.id} className="flex items-center gap-3 rounded-xl bg-accent/40 px-3 py-2">
                <Avatar name={m.full_name || "User"} url={m.avatar_url} size={34} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {m.full_name || "GreenPulse user"}
                    {m.id === meId ? " (you)" : ""}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{m.college || "Campus member"}</p>
                </div>
              </div>
            ))}
            {conversation.members.length === 1 && (
              <p className="text-xs text-muted-foreground">
                You're the only member left here. Add people to keep chatting.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AddMembersDialog
        open={showAdd}
        onOpenChange={setShowAdd}
        existingIds={conversation.members.map((m) => m.id)}
        onAdd={async (ids) => {
          try {
            await addGroupMembers(conversation.id, ids);
            queryClient.invalidateQueries({ queryKey: ["conversations"] });
            toast.success("Members added.");
          } catch {
            toast.error("Could not add members.");
          }
        }}
      />
    </section>
  );
}

function AddMembersDialog({
  open,
  onOpenChange,
  existingIds,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  existingIds: string[];
  onAdd: (ids: string[]) => Promise<void>;
}) {
  const [term, setTerm] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const { data: people } = useQuery({
    queryKey: ["people", term],
    queryFn: () => searchPeople(term),
    enabled: open,
  });
  const candidates = useMemo(
    () => (people ?? []).filter((p) => !existingIds.includes(p.id)),
    [people, existingIds],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle>Add members</DialogTitle>
          <DialogDescription>Search GreenPulse users to add to this group.</DialogDescription>
        </DialogHeader>
        <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Search by name" />
        <div className="max-h-64 space-y-1 overflow-y-auto">
          {candidates.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">No matching users found.</p>
          )}
          {candidates.map((p) => (
            <button
              key={p.id}
              onClick={() =>
                setSelected((s) => (s.includes(p.id) ? s.filter((i) => i !== p.id) : [...s, p.id]))
              }
              className={cn(
                "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left",
                selected.includes(p.id) ? "bg-accent" : "hover:bg-accent/60",
              )}
            >
              <Avatar name={p.full_name || "User"} url={p.avatar_url} size={32} />
              <span className="truncate text-sm">{p.full_name || "GreenPulse user"}</span>
            </button>
          ))}
        </div>
        <Button
          className="w-full rounded-full bg-gradient-primary"
          disabled={selected.length === 0}
          onClick={async () => {
            await onAdd(selected);
            setSelected([]);
            onOpenChange(false);
          }}
        >
          Add {selected.length > 0 ? `${selected.length} ` : ""}member{selected.length === 1 ? "" : "s"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
