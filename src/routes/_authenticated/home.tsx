import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  ClipboardList,
  CircleCheckBig,
  Droplets,
  Leaf,
  TrendingUp,
  Camera,
  Bot,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Chip, EmptyState, PageHeading, ScoreRing, StatCard } from "@/components/gp";
import { categoryIcon, categoryLabel, severityTone, STATUS_LABEL, statusTone } from "@/lib/greenpulse";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({
    meta: [
      { title: "Home — GreenPulse AI" },
      { name: "description", content: "Your campus sustainability overview, impact stats and recent reports." },
      { property: "og:title", content: "Home — GreenPulse AI" },
      { property: "og:description", content: "Track your campus sustainability score and environmental impact." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { data, isLoading } = useQuery({
    queryKey: ["home-overview"],
    queryFn: async () => {
      const [reportsRes, scoresRes] = await Promise.all([
        supabase.from("reports").select("*").order("created_at", { ascending: false }),
        supabase.from("sustainability_scores").select("*").order("recorded_for", { ascending: true }),
      ]);
      return { reports: reportsRes.data ?? [], scores: scoresRes.data ?? [] };
    },
  });

  const reports = data?.reports ?? [];
  const scores = data?.scores ?? [];
  const resolved = reports.filter((r) => r.status === "resolved").length;
  const water = reports.reduce((sum, r) => sum + Number(r.water_saved_litres ?? 0), 0);
  const co2 = reports.reduce((sum, r) => sum + Number(r.co2_saved_kg ?? 0), 0);

  const latestScore = scores.at(-1)?.score ?? 0;
  const previousScore = scores.at(-2)?.score ?? latestScore;
  const delta = latestScore - previousScore;
  const campusScore = Math.min(100, latestScore + Math.min(reports.length * 2, 12));

  return (
    <div className="space-y-6">
      <div className="animate-rise overflow-hidden rounded-3xl bg-gradient-primary p-6 text-primary-foreground shadow-glow lg:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <h1 className="font-display text-2xl font-extrabold leading-tight lg:text-4xl">
              Let's Build a Greener Campus Together
            </h1>
            <p className="mt-2 text-sm opacity-90 lg:text-base">
              Report sustainability issues, let AI analyze them, and create real environmental impact.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button asChild variant="secondary" className="h-11 rounded-full px-5 font-semibold">
                <Link to="/report">
                  <Camera className="mr-1.5 h-4 w-4" /> Report Issue
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-11 rounded-full border-primary-foreground/40 bg-transparent px-5 font-semibold text-primary-foreground hover:bg-primary-foreground/10"
              >
                <Link to="/reports">View My Reports</Link>
              </Button>
            </div>
          </div>
          <Leaf className="animate-float-slow hidden h-32 w-32 opacity-30 lg:block" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)
        ) : (
          <>
            <StatCard icon={ClipboardList} label="Total Reports" value={reports.length} />
            <StatCard icon={CircleCheckBig} label="Issues Resolved" value={resolved} tone="info" />
            <StatCard icon={Droplets} label="Water Saved" value={water} suffix=" L" tone="info" />
            <StatCard icon={Leaf} label="Carbon Impact" value={co2} suffix=" kg" tone="warning" />
          </>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="surface-card animate-rise flex flex-col items-center p-6 text-center lg:col-span-1">
          <h2 className="font-display text-base font-semibold">Campus Sustainability Score</h2>
          <div className="mt-5">
            <ScoreRing score={campusScore} />
          </div>
          <Chip className="mt-5 border-primary/20 bg-accent text-accent-foreground">
            <TrendingUp className="h-3.5 w-3.5" /> {delta >= 0 ? "+" : ""}
            {delta} this week
          </Chip>
          <p className="mt-3 text-xs text-muted-foreground">
            Score improves as issues get reported and resolved across campus.
          </p>
        </div>

        <div className="surface-card animate-rise p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold">Recent Reports</h2>
            <Link to="/reports" className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
              See all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mt-4 space-y-2.5">
            {isLoading && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}

            {!isLoading && reports.length === 0 && (
              <EmptyState
                icon={Camera}
                title="No reports yet"
                description="Spotted a leaking tap or an overflowing bin? Your first report takes 20 seconds."
                action={
                  <Button asChild className="rounded-full bg-gradient-primary text-primary-foreground shadow-glow">
                    <Link to="/report">Report an issue</Link>
                  </Button>
                }
              />
            )}

            {reports.slice(0, 5).map((report) => {
              const Icon = categoryIcon(report.category);
              return (
                <Link
                  key={report.id}
                  to="/reports/$reportId"
                  params={{ reportId: report.id }}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition-all hover:-translate-y-0.5 hover:shadow-soft"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-mint text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{report.title || categoryLabel(report.category)}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {report.location || "Location not set"} · {report.reference}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <Chip className={statusTone(report.status)}>{STATUS_LABEL[report.status] ?? report.status}</Chip>
                    <Chip className={severityTone(report.severity)}>{report.severity}</Chip>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Link
          to="/assistant"
          className="surface-card flex items-center gap-4 p-5 transition-all hover:-translate-y-0.5 hover:shadow-lifted"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-mint text-primary">
            <Bot className="h-6 w-6" />
          </span>
          <div>
            <p className="font-display font-semibold">Ask GreenBot</p>
            <p className="text-xs text-muted-foreground">Sustainability tips, recycling help and more.</p>
          </div>
        </Link>
        <Link
          to="/learn"
          className="surface-card flex items-center gap-4 p-5 transition-all hover:-translate-y-0.5 hover:shadow-lifted"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-info/10 text-info">
            <Leaf className="h-6 w-6" />
          </span>
          <div>
            <p className="font-display font-semibold">Learn & earn points</p>
            <p className="text-xs text-muted-foreground">Short reads on water, waste and energy.</p>
          </div>
        </Link>
      </div>
    </div>
  );
}

export { PageHeading };
