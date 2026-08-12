import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchConversations, heartbeatPresence } from "@/lib/chat";

/** Conversation list + live updates from Realtime. */
export function useConversations() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["conversations"],
    queryFn: fetchConversations,
    staleTime: 10_000,
  });

  useEffect(() => {
    const channel = supabase
      .channel("chat-conversations")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "conversation_members" }, () => {
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}

export function useUnreadTotal() {
  const { data } = useConversations();
  return (data ?? []).reduce((sum, c) => sum + c.unread, 0);
}

/** Keeps the signed-in user's online indicator fresh. */
export function usePresenceHeartbeat() {
  useEffect(() => {
    void heartbeatPresence();
    const id = setInterval(() => void heartbeatPresence(), 45_000);
    return () => clearInterval(id);
  }, []);
}
