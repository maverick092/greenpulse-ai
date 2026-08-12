import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MessageSquarePlus, Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Avatar, ChatThread, ConversationRow } from "@/components/chat";
import { useConversations, usePresenceHeartbeat } from "@/hooks/use-chat";
import {
  conversationTitle,
  createGroupConversation,
  currentUserId,
  fetchPresence,
  isOnline,
  openDirectConversation,
  searchPeople,
} from "@/lib/chat";

export const Route = createFileRoute("/_authenticated/messages")({
  head: () => ({
    meta: [
      { title: "Messages — GreenPulse AI" },
      {
        name: "description",
        content:
          "Chat in real time with fellow students and campus sustainability teams inside GreenPulse AI.",
      },
      { property: "og:title", content: "Messages — GreenPulse AI" },
      {
        property: "og:description",
        content: "Real-time campus sustainability conversations, groups and photo sharing.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MessagesPage,
});

function MessagesPage() {
  const queryClient = useQueryClient();
  const [meId, setMeId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [term, setTerm] = useState("");
  const [newChatOpen, setNewChatOpen] = useState(false);

  usePresenceHeartbeat();

  useEffect(() => {
    void currentUserId().then(setMeId);
  }, []);

  const { data: conversations, isLoading } = useConversations();

  const { data: presence } = useQuery({
    queryKey: ["presence-all", (conversations ?? []).length],
    queryFn: () =>
      fetchPresence((conversations ?? []).flatMap((c) => c.members.map((m) => m.id))),
    enabled: Boolean(conversations?.length),
    refetchInterval: 45_000,
  });

  const filtered = useMemo(() => {
    if (!meId) return [];
    const list = conversations ?? [];
    if (!term.trim()) return list;
    const q = term.toLowerCase();
    return list.filter(
      (c) =>
        conversationTitle(c, meId).toLowerCase().includes(q) ||
        (c.lastMessage?.content ?? "").toLowerCase().includes(q),
    );
  }, [conversations, term, meId]);

  const active = (conversations ?? []).find((c) => c.id === activeId) ?? null;

  async function startDirect(userId: string) {
    try {
      const id = await openDirectConversation(userId);
      await queryClient.invalidateQueries({ queryKey: ["conversations"] });
      setActiveId(id);
      setNewChatOpen(false);
    } catch {
      toast.error("Could not start that conversation.");
    }
  }

  async function startGroup(name: string, ids: string[]) {
    try {
      const id = await createGroupConversation(name, ids);
      await queryClient.invalidateQueries({ queryKey: ["conversations"] });
      setActiveId(id);
      setNewChatOpen(false);
    } catch {
      toast.error("Could not create the group.");
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="surface-card overflow-hidden p-0">
        <div className="grid h-[calc(100vh-11rem)] min-h-[520px] grid-cols-1 lg:grid-cols-[22rem_1fr]">
          {/* Conversation list */}
          <aside
            className={cn(
              "flex min-h-0 flex-col border-r border-border/60",
              active ? "hidden lg:flex" : "flex",
            )}
          >
            <div className="border-b border-border/60 p-4">
              <div className="flex items-center justify-between gap-2">
                <h1 className="font-display text-lg font-bold">Messages</h1>
                <Button
                  size="icon"
                  className="rounded-full bg-gradient-primary shadow-glow"
                  onClick={() => setNewChatOpen(true)}
                  aria-label="New conversation"
                >
                  <MessageSquarePlus className="h-4.5 w-4.5" />
                </Button>
              </div>
              <div className="relative mt-3">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  placeholder="Search conversations"
                  className="rounded-full pl-9"
                />
              </div>
            </div>
            <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
              {isLoading && (
                <p className="py-10 text-center text-sm text-muted-foreground">Loading chats…</p>
              )}
              {!isLoading && filtered.length === 0 && (
                <div className="px-4 py-12 text-center">
                  <p className="text-sm font-semibold">No conversations yet</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Start chatting with students working on campus sustainability.
                  </p>
                  <Button
                    className="mt-4 rounded-full bg-gradient-primary"
                    onClick={() => setNewChatOpen(true)}
                  >
                    New chat
                  </Button>
                </div>
              )}
              {meId &&
                filtered.map((c) => {
                  const other = c.members.find((m) => m.id !== meId);
                  return (
                    <ConversationRow
                      key={c.id}
                      conversation={c}
                      meId={meId}
                      active={c.id === activeId}
                      online={isOnline(other ? presence?.get(other.id) : null)}
                      onSelect={() => setActiveId(c.id)}
                    />
                  );
                })}
            </div>
          </aside>

          {/* Thread */}
          <div className={cn("min-h-0", active ? "block" : "hidden lg:block")}>
            {active && meId ? (
              <ChatThread conversation={active} meId={meId} onBack={() => setActiveId(null)} />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent">
                  <Users className="h-7 w-7 text-accent-foreground" />
                </span>
                <p className="font-display text-lg font-semibold">Select a conversation</p>
                <p className="max-w-xs text-sm text-muted-foreground">
                  Pick a chat on the left, or start a new one to coordinate green action on campus.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <NewChatDialog
        open={newChatOpen}
        onOpenChange={setNewChatOpen}
        meId={meId}
        onDirect={startDirect}
        onGroup={startGroup}
      />
    </div>
  );
}

function NewChatDialog({
  open,
  onOpenChange,
  meId,
  onDirect,
  onGroup,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  meId: string | null;
  onDirect: (userId: string) => Promise<void>;
  onGroup: (name: string, ids: string[]) => Promise<void>;
}) {
  const [term, setTerm] = useState("");
  const [groupMode, setGroupMode] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const { data: people, isLoading } = useQuery({
    queryKey: ["people", term],
    queryFn: () => searchPeople(term),
    enabled: open,
  });

  const list = (people ?? []).filter((p) => p.id !== meId);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) {
          setGroupMode(false);
          setSelected([]);
          setGroupName("");
          setTerm("");
        }
      }}
    >
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle>{groupMode ? "New group" : "New conversation"}</DialogTitle>
          <DialogDescription>
            {groupMode
              ? "Name your group and pick the students to include."
              : "Search students and campus members to start chatting."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <Button
            variant={groupMode ? "outline" : "default"}
            size="sm"
            className="rounded-full"
            onClick={() => setGroupMode(false)}
          >
            Direct
          </Button>
          <Button
            variant={groupMode ? "default" : "outline"}
            size="sm"
            className="rounded-full"
            onClick={() => setGroupMode(true)}
          >
            Group
          </Button>
        </div>

        {groupMode && (
          <Input
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Group name (e.g. Eco Club Core Team)"
          />
        )}

        <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Search by name" />

        <div className="max-h-64 space-y-1 overflow-y-auto">
          {isLoading && <p className="py-6 text-center text-sm text-muted-foreground">Searching…</p>}
          {!isLoading && list.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">No users found.</p>
          )}
          {list.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                if (groupMode) {
                  setSelected((s) =>
                    s.includes(p.id) ? s.filter((i) => i !== p.id) : [...s, p.id],
                  );
                } else {
                  void onDirect(p.id);
                }
              }}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors",
                groupMode && selected.includes(p.id) ? "bg-accent" : "hover:bg-accent/60",
              )}
            >
              <Avatar name={p.full_name || "User"} url={p.avatar_url} size={34} />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{p.full_name || "GreenPulse user"}</p>
                <p className="truncate text-xs text-muted-foreground">{p.college || "Campus member"}</p>
              </div>
            </button>
          ))}
        </div>

        {groupMode && (
          <Button
            className="w-full rounded-full bg-gradient-primary"
            disabled={!groupName.trim() || selected.length === 0}
            onClick={() => void onGroup(groupName.trim(), selected)}
          >
            Create group
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
