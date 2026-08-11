import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Camera, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Chip, EmptyState, PageHeading } from "@/components/gp";
import {
  CATEGORIES,
  categoryIcon,
  categoryLabel,
  severityTone,
  STATUS_LABEL,
  statusTone,
} from "@/lib/greenpulse";

export const Route = createFileRoute("/_authenticated/reports/")({
  head: () => ({
    meta: [
      { title: "My Reports — GreenPulse AI" },
      { name: "description", content: "Track every sustainability issue you reported and its resolution status." },
      { property: "og:title", content: "My Reports — GreenPulse AI" },
      { property: "og:description", content: "Pending, in progress and resolved campus reports in one place." },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [severity, setSeverity] = useState("all");
  const [sort, setSort] = useState("newest");

  const { data: reports, isLoading } = useQuery({
    queryKey: ["reports"],
    queryFn: async () => {
      const { data } = await supabase.from("reports").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    let list = reports ?? [];
    if (tab !== "all") list = list.filter((r) => r.status === tab);
    if (category !== "all") list = list.filter((r) => r.category === category);
    if (severity !== "all") list = list.filter((r) => r.severity === severity);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((r) =>
        [r.title, r.location, r.reference, r.description].some((field) => (field ?? "").toLowerCase().includes(q)),
      );
    }
    return [...list].sort((a, b) =>
      sort === "newest"
        ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        : new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
  }, [reports, tab, category, severity, search, sort]);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <PageHeading title="My Reports" subtitle="Every issue you reported, and where it stands." />

      <div className="surface-card space-y-3 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, location or report ID"
            className="h-10 rounded-xl pl-9"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-9 w-auto min-w-36 rounded-full text-xs">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.key} value={c.key}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={severity} onValueChange={setSeverity}>
            <SelectTrigger className="h-9 w-auto min-w-28 rounded-full text-xs">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All severity</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="h-9 w-auto min-w-28 rounded-full text-xs">
              <SelectValue placeholder="Date" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-4 rounded-full bg-muted p-1">
            <TabsTrigger value="all" className="rounded-full text-xs">
              All
            </TabsTrigger>
            <TabsTrigger value="pending" className="rounded-full text-xs">
              Pending
            </TabsTrigger>
            <TabsTrigger value="in_progress" className="rounded-full text-xs">
              In Progress
            </TabsTrigger>
            <TabsTrigger value="resolved" className="rounded-full text-xs">
              Resolved
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="space-y-3">
        {isLoading && Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}

        {!isLoading && filtered.length === 0 && (
          <EmptyState
            icon={Camera}
            title="Nothing here yet"
            description="No reports match these filters. Try clearing them, or report a new issue."
            action={
              <Button asChild className="rounded-full bg-gradient-primary text-primary-foreground shadow-glow">
                <Link to="/report">Report an issue</Link>
              </Button>
            }
          />
        )}

        {filtered.map((report) => {
          const Icon = categoryIcon(report.category);
          return (
            <Link
              key={report.id}
              to="/reports/$reportId"
              params={{ reportId: report.id }}
              className="animate-rise surface-card flex items-start gap-3 p-4 transition-all hover:-translate-y-0.5 hover:shadow-lifted"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-mint text-primary">
                <Icon className="h-5.5 w-5.5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate font-display text-sm font-semibold">
                    {report.title || categoryLabel(report.category)}
                  </p>
                  <Chip className={statusTone(report.status)}>{STATUS_LABEL[report.status] ?? report.status}</Chip>
                </div>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {report.location || "Location not set"}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Chip className="border-border bg-muted text-muted-foreground">{report.reference}</Chip>
                  <Chip className={severityTone(report.severity)}>{report.severity}</Chip>
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(report.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
