import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Bot, Send, Loader2 } from "lucide-react";
import { askGreenBot } from "@/lib/ai.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/assistant")({
  head: () => ({
    meta: [
      { title: "GreenBot — GreenPulse AI" },
      { name: "description", content: "Chat with GreenBot for sustainability tips, recycling and energy saving advice." },
      { property: "og:title", content: "GreenBot — GreenPulse AI" },
      { property: "og:description", content: "Your AI sustainability assistant for campus life." },
    ],
  }),
  component: AssistantPage,
});

type Message = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "How can students save water?",
  "How can we reduce plastic waste?",
  "How can colleges become greener?",
  "Tips for better waste segregation",
];

function AssistantPage() {
  const ask = useServerFn(askGreenBot);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const next: Message[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const result = await ask({ data: { messages: next.slice(-12) } });
      setMessages([...next, { role: "assistant", content: result.reply }]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "GreenBot could not reply.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-9rem)] max-w-3xl flex-col">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow">
          <Bot className="h-5.5 w-5.5" />
        </span>
        <div>
          <h1 className="font-display text-lg font-bold">GreenBot</h1>
          <p className="text-xs text-muted-foreground">AI Sustainability Assistant</p>
        </div>
      </div>

      <div className="mt-4 flex-1 space-y-4 overflow-y-auto pb-4">
        {messages.length === 0 && (
          <div className="animate-rise rounded-3xl bg-gradient-mint p-6 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-card text-primary shadow-soft">
              <Bot className="h-7 w-7" />
            </span>
            <p className="mt-3 font-display text-base font-semibold">Good day! How can I help you today?</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Ask about water, waste, energy or recycling on your campus.
            </p>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => send(suggestion)}
                  className="rounded-2xl bg-card p-3 text-left text-xs font-medium shadow-soft transition-transform hover:-translate-y-0.5"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={cn("flex gap-2.5", message.role === "user" ? "justify-end" : "justify-start")}
          >
            {message.role === "assistant" && (
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-mint text-primary">
                <Bot className="h-4 w-4" />
              </span>
            )}
            <div
              className={cn(
                "max-w-[80%] whitespace-pre-wrap text-sm leading-relaxed",
                message.role === "user"
                  ? "rounded-3xl rounded-br-md bg-primary px-4 py-2.5 font-medium text-primary-foreground"
                  : "text-foreground",
              )}
            >
              {message.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-mint text-primary">
              <Bot className="h-4 w-4" />
            </span>
            <span className="animate-pulse">GreenBot is thinking…</span>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="surface-glass sticky bottom-0 flex items-center gap-2 rounded-full p-2"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything about sustainability…"
          maxLength={1000}
          className="h-10 border-0 bg-transparent shadow-none focus-visible:ring-0"
        />
        <Button
          type="submit"
          size="icon"
          disabled={loading || !input.trim()}
          className="h-10 w-10 shrink-0 rounded-full bg-gradient-primary text-primary-foreground shadow-glow"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>
    </div>
  );
}
