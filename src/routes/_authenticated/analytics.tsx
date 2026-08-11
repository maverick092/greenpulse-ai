import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CircleCheckBig, Droplets, Leaf, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeading, ScoreRing, StatCard } from "@/components/gp";
import { categoryLabel } from "@/lib/greenpulse";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — GreenPulse AI" },
      { name: "description", content: "Category breakdowns, monthly trends and environmental impact analytics." },
      { property: "og:title", content: "Analytics — GreenPulse AI" },
      { property: "og:description", content: "Measure resolution rates and environmental impact across campus." },
    ],
  }),
  component: AnalyticsPage,
});

const CHART_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

function AnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["analytics"],
    queryFn: async () => {
      const [reportsRes, scoresRes] = await Promise.all([
        supabase.from("reports").select("*"),
        supabase.from("sustainability_scores").select("*").order("recorded_for", { ascending: true }),
      ]);
      return { reports: reportsRes.data ?? [], scores: scoresRes.data ?? [] };
    },
  });

  const reports = data?.reports ?? [];

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    reports.forEach((r) => map.set(r.category, (map.get(r.category) ?? 0) + 1));
    return [...map.entries()].map(([key, value]) => ({ name: categoryLabel(key), value }));
  }, [reports]);

  const bySeverity = useMemo(
    () =>
      ["low", "medium", "high"].map((level) => ({
        name: level[0]!.toUpperCase() + level.slice(1),
        count: reports.filter((r) => r.severity === level).length,
      })),
    [reports],
  );

  const monthly = useMemo(() => {
    const map = new Map<string, number>();
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      map.set(date.toLocaleString("en", { month: "short" }), 0);
    }
    reports.forEach((r) => {
      const label = new Date(r.created_at).toLocaleString("en", { month: "short" });
      if (map.has(label)) map.set(label, (map.get(label) ?? 0) + 1);
    });
    return [...map.entries()].map(([name, reportsCount]) => ({ name, reports: reportsCount }));
  }, [reports]);

  const resolved = reports.filter((r) => r.status === "resolved").length;
  const resolutionRate = reports.length ? Math.round((resolved / reports.length) * 100) : 0;
  const water = reports.reduce((s, r) => s + Number(r.water_saved_litres ?? 0), 0);
  const co2 = reports.reduce((s, r) => s + Number(r.co2_saved_kg ?? 0), 0);
  const energy = reports.reduce((s, r) => s + Number(r.energy_saved_kwh ?? 0), 0);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 rounded-3xl" />
        <Skeleton className="h-72 rounded-3xl" />
        <Skeleton className="h-72 rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeading title="Analytics" subtitle="Your environmental impact, measured." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Droplets} label="Water Saved" value={water} suffix=" L" tone="info" caption="Potential, per day" />
        <StatCard icon={Leaf} label="CO₂ Reduced" value={co2} suffix=" kg" caption="Potential, per week" />
        <StatCard icon={Zap} label="Energy Saved" value={energy} suffix=" kWh" tone="warning" caption="Potential, per week" />
        <StatCard icon={CircleCheckBig} label="Issues Resolved" value={resolved} tone="info" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="surface-card p-5 lg:col-span-2">
          <h2 className="font-display text-base font-semibold">Reports by category</h2>
          {byCategory.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">Submit a report to see the breakdown.</p>
          ) : (
            <div className="mt-2 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={byCategory} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={3}>
                    {byCategory.map((_, index) => (
                      <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: 14,
                      border: "1px solid var(--border)",
                      background: "var(--card)",
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="mt-2 flex flex-wrap gap-3">
            {byCategory.map((item, index) => (
              <span key={item.name} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: CHART_COLORS[index % CHART_COLORS.length] }}
                />
                {item.name} · {item.value}
              </span>
            ))}
          </div>
        </div>

        <div className="surface-card flex flex-col items-center p-5 text-center">
          <h2 className="font-display text-base font-semibold">Resolution rate</h2>
          <div className="mt-5">
            <ScoreRing score={resolutionRate} size={140} />
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            {resolved} of {reports.length} reported issues resolved.
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="surface-card p-5">
          <h2 className="font-display text-base font-semibold">Monthly trend</h2>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthly}>
                <CartesianGrid strokeDasharray="4 4" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" />
                <Tooltip
                  contentStyle={{
                    borderRadius: 14,
                    border: "1px solid var(--border)",
                    background: "var(--card)",
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="reports"
                  stroke="var(--chart-1)"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "var(--chart-1)" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="surface-card p-5">
          <h2 className="font-display text-base font-semibold">Severity distribution</h2>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bySeverity}>
                <CartesianGrid strokeDasharray="4 4" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" />
                <Tooltip
                  contentStyle={{
                    borderRadius: 14,
                    border: "1px solid var(--border)",
                    background: "var(--card)",
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="count" radius={[10, 10, 0, 0]}>
                  {bySeverity.map((_, index) => (
                    <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
