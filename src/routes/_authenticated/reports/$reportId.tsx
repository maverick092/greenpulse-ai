import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Bot,
  CircleCheck,
  Droplets,
  Gauge,
  Leaf,
  MapPin,
  Sparkle,
  Zap,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { signedPhotoUrl } from "@/lib/rewards";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Chip } from "@/components/gp";
import {
  categoryLabel,
  completedSteps,
  severityTone,
  STATUS_FLOW,
  STATUS_LABEL,
  STATUS_STEP_LABEL,
  statusTone,
} from "@/lib/greenpulse";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/reports/$reportId")({
  head: () => ({
    meta: [
      { title: "Report Details — GreenPulse AI" },
      { name: "description", content: "AI analysis, environmental impact and progress timeline for your report." },
      { property: "og:title", content: "Report Details — GreenPulse AI" },
      { property: "og:description", content: "See what AI detected and how your report is progressing." },
    ],
  }),
  component: ReportDetails,
});

function ReportDetails() {
  const { reportId } = useParams({ from: "/_authenticated/reports/$reportId" });

  const { data, isLoading } = useQuery({
    queryKey: ["report", reportId],
    queryFn: async () => {
      const [reportRes, analysisRes] = await Promise.all([
        supabase.from("reports").select("*").eq("id", reportId).maybeSingle(),
        supabase.from("ai_analysis").select("*").eq("report_id", reportId).maybeSingle(),
      ]);
      const photo = await signedPhotoUrl(reportRes.data?.image_path ?? null);
      return { report: reportRes.data, analysis: analysisRes.data, photo };
    },
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-64 rounded-3xl" />
        <Skeleton className="h-40 rounded-3xl" />
        <Skeleton className="h-40 rounded-3xl" />
      </div>
    );
  }

  const report = data?.report;
  const analysis = data?.analysis;

  if (!report) {
    return (
      <div className="surface-card mx-auto max-w-md p-10 text-center">
        <p className="font-display text-lg font-semibold">Report not found</p>
        <Button asChild variant="ghost" className="mt-4">
          <Link to="/reports">Back to my reports</Link>
        </Button>
      </div>
    );
  }

  const steps = completedSteps(report.status);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="icon" className="rounded-full">
          <Link to="/reports">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="font-display text-xl font-bold">Report Details</h1>
          <p className="text-xs text-muted-foreground">{report.reference}</p>
        </div>
      </div>

      {data?.photo && (
        <div className="animate-rise overflow-hidden rounded-3xl border border-border shadow-soft">
          <img src={data.photo} alt={report.title} className="h-72 w-full object-cover" />
        </div>
      )}

      <div className="animate-rise surface-card p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold">{report.title || categoryLabel(report.category)}</h2>
            <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" /> {report.location || "Location not set"}
            </p>
          </div>
          <Chip className={statusTone(report.status)}>{STATUS_LABEL[report.status] ?? report.status}</Chip>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Detail label="Category" value={categoryLabel(report.category)} />
          <Detail label="Severity" value={report.severity} tone={severityTone(report.severity)} />
          <Detail label="Reported on" value={new Date(report.created_at).toLocaleString()} />
        </div>

        {report.description && (
          <p className="mt-4 rounded-2xl bg-muted p-4 text-sm text-muted-foreground">{report.description}</p>
        )}
      </div>

      {analysis && (
        <div className="animate-rise rounded-3xl bg-gradient-mint p-5">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-card text-primary shadow-soft">
              <Bot className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-display text-base font-semibold">AI Analysis</h2>
              <p className="text-[11px] text-muted-foreground">Detected automatically by GreenPulse AI</p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <AiCard
              icon={Sparkle}
              label="Detected issue"
              value={analysis.detected_issue}
              caption={`${Math.round(Number(analysis.confidence))}% confidence`}
            />
            <AiCard icon={Gauge} label="Environmental impact" value={analysis.environmental_impact} caption={`Severity: ${analysis.severity}`} />
            <AiCard icon={Droplets} label="Estimated water loss" value={analysis.estimated_water_loss ?? "—"} />
            <AiCard icon={Zap} label="Estimated energy loss" value={analysis.estimated_energy_loss ?? "—"} />
          </div>

          <div className="mt-3 rounded-2xl bg-card p-4 shadow-soft">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Suggested action</p>
            <p className="mt-1 text-sm font-medium">{analysis.suggested_action}</p>
            {analysis.summary && <p className="mt-2 text-xs text-muted-foreground">{analysis.summary}</p>}
          </div>

          <div className="mt-3 grid grid-cols-3 gap-3">
            <Impact icon={Droplets} value={`${Number(report.water_saved_litres)} L`} label="Water/day" />
            <Impact icon={Leaf} value={`${Number(report.co2_saved_kg)} kg`} label="CO₂/week" />
            <Impact icon={Zap} value={`${Number(report.energy_saved_kwh)} kWh`} label="Energy/week" />
          </div>
        </div>
      )}

      <div className="animate-rise surface-card p-5">
        <h2 className="font-display text-base font-semibold">Status timeline</h2>
        <div className="mt-4 space-y-0">
          {STATUS_FLOW.map((step, index) => {
            const done = index < steps;
            const current = index === steps - 1;
            return (
              <div key={step} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full border-2 transition-colors",
                      done
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-muted-foreground",
                    )}
                  >
                    {done ? <CircleCheck className="h-4 w-4" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
                  </span>
                  {index < STATUS_FLOW.length - 1 && (
                    <span className={cn("my-1 w-0.5 flex-1", index < steps - 1 ? "bg-primary" : "bg-border")} />
                  )}
                </div>
                <div className={cn("pb-6", index === STATUS_FLOW.length - 1 && "pb-0")}>
                  <p className={cn("text-sm font-semibold", !done && "text-muted-foreground")}>
                    {STATUS_STEP_LABEL[step]}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {done ? (current ? "Current stage" : "Completed") : "Pending"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      {tone ? (
        <Chip className={cn("mt-1.5 capitalize", tone)}>{value}</Chip>
      ) : (
        <p className="mt-1 text-sm font-medium capitalize">{value}</p>
      )}
    </div>
  );
}

function AiCard({
  icon: Icon,
  label,
  value,
  caption,
}: {
  icon: typeof Bot;
  label: string;
  value: string;
  caption?: string;
}) {
  return (
    <div className="rounded-2xl bg-card p-4 shadow-soft">
      <div className="flex items-center gap-2 text-primary">
        <Icon className="h-4 w-4" />
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      </div>
      <p className="mt-1.5 text-sm font-semibold capitalize">{value}</p>
      {caption && <p className="text-[11px] capitalize text-muted-foreground">{caption}</p>}
    </div>
  );
}

function Impact({ icon: Icon, value, label }: { icon: typeof Bot; value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-card p-3 text-center shadow-soft">
      <Icon className="mx-auto h-4 w-4 text-primary" />
      <p className="mt-1 font-display text-sm font-bold">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
