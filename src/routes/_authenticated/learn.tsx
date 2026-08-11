import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { BookOpen, Clock, CircleCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { logActivity, notify, syncBadges } from "@/lib/rewards";
import { POINTS_PER_ARTICLE } from "@/lib/greenpulse";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Chip, PageHeading } from "@/components/gp";

export const Route = createFileRoute("/_authenticated/learn")({
  head: () => ({
    meta: [
      { title: "Learning Center — GreenPulse AI" },
      { name: "description", content: "Short sustainability lessons on water, waste, energy and campus climate action." },
      { property: "og:title", content: "Learning Center — GreenPulse AI" },
      { property: "og:description", content: "Read, learn and earn green points for sustainability knowledge." },
    ],
  }),
  component: LearnPage,
});

type Article = {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  reading_minutes: number;
};

const CATEGORY_EMOJI: Record<string, string> = {
  water: "💧",
  waste: "♻️",
  energy: "⚡",
  climate: "🌍",
  campus: "🏫",
};

function articleEmoji(category: string) {
  return CATEGORY_EMOJI[category] ?? "🌱";
}

function LearnPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState<Article | null>(null);
  const [claiming, setClaiming] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["learn"],
    queryFn: async () => {
      const [articlesRes, logsRes] = await Promise.all([
        supabase.from("learning_articles").select("*").order("created_at", { ascending: true }),
        supabase.from("activity_logs").select("metadata, action"),
      ]);
      const read = new Set(
        (logsRes.data ?? [])
          .filter((log) => log.action === "article_read")
          .map((log) => (log.metadata as { article_id?: string } | null)?.article_id)
          .filter(Boolean) as string[],
      );
      return { articles: (articlesRes.data ?? []) as Article[], read };
    },
  });

  async function markRead(article: Article) {
    if (data?.read.has(article.id) || claiming) return;
    setClaiming(true);
    try {
      await logActivity("article_read", POINTS_PER_ARTICLE, { article_id: article.id, title: article.title });
      await notify("Lesson completed", `You earned ${POINTS_PER_ARTICLE} green points for "${article.title}".`, "points");
      await syncBadges();
      await queryClient.invalidateQueries();
      toast.success(`+${POINTS_PER_ARTICLE} green points`);
    } catch {
      toast.error("Could not save your progress.");
    } finally {
      setClaiming(false);
    }
  }

  const articles = data?.articles ?? [];
  const readCount = articles.filter((a) => data?.read.has(a.id)).length;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <PageHeading title="Learning Center" subtitle="Small lessons, real campus impact." />

      <div className="animate-rise rounded-3xl bg-gradient-mint p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-card text-primary shadow-soft">
            <BookOpen className="h-5 w-5" />
          </span>
          <div>
            <p className="font-display text-base font-semibold">
              {readCount} of {articles.length} lessons completed
            </p>
            <p className="text-xs text-muted-foreground">
              Each lesson you finish earns {POINTS_PER_ARTICLE} green points.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {isLoading && Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-3xl" />)}

        {articles.map((article) => {
          const isRead = data?.read.has(article.id);
          return (
            <button
              key={article.id}
              onClick={() => setOpen(article)}
              className="animate-rise surface-card p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-lifted"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-2xl">{articleEmoji(article.category)}</span>
                {isRead ? (
                  <Chip className="border-primary/30 bg-primary/10 text-primary">
                    <CircleCheck className="mr-1 h-3 w-3" /> Completed
                  </Chip>
                ) : (
                  <Chip className="border-border bg-muted text-muted-foreground">+{POINTS_PER_ARTICLE} pts</Chip>
                )}
              </div>
              <h2 className="mt-3 font-display text-base font-semibold">{article.title}</h2>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{article.excerpt}</p>
              <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Clock className="h-3 w-3" /> {article.reading_minutes} min read · {article.category}
              </p>
            </button>
          );
        })}
      </div>

      <Dialog open={!!open} onOpenChange={(value) => !value && setOpen(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto rounded-3xl sm:max-w-lg">
          {open && (
            <>
              <DialogHeader>
                <span className="text-3xl">{articleEmoji(open.category)}</span>
                <DialogTitle className="font-display text-lg">{open.title}</DialogTitle>
              </DialogHeader>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{open.content}</p>
              <Button
                onClick={() => markRead(open)}
                disabled={claiming || data?.read.has(open.id)}
                className="mt-2 h-11 w-full rounded-full bg-gradient-primary text-primary-foreground shadow-glow"
              >
                {data?.read.has(open.id) ? "Lesson completed" : `Mark as read · +${POINTS_PER_ARTICLE} pts`}
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
