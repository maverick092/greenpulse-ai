import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Camera, ImagePlus, Loader2, MapPin, Sparkle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { analyzeReport } from "@/lib/ai.functions";
import { CATEGORIES, POINTS_PER_REPORT, SEVERITIES, type CategoryKey } from "@/lib/greenpulse";
import { fileToDataUrl, logActivity, notify, syncBadges } from "@/lib/rewards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeading } from "@/components/gp";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/report")({
  head: () => ({
    meta: [
      { title: "Report an Issue — GreenPulse AI" },
      {
        name: "description",
        content: "Report a campus sustainability issue with a photo and let AI analyse severity and impact.",
      },
      { property: "og:title", content: "Report an Issue — GreenPulse AI" },
      { property: "og:description", content: "Snap, describe, submit — AI handles the analysis." },
    ],
  }),
  component: ReportPage,
});

function ReportPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const analyze = useServerFn(analyzeReport);
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(1);
  const [category, setCategory] = useState<CategoryKey | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<string>("medium");
  const [submitting, setSubmitting] = useState(false);

  function pickFile(selected: File | undefined) {
    if (!selected) return;
    if (selected.size > 8 * 1024 * 1024) {
      toast.error("Please choose an image under 8 MB.");
      return;
    }
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  }

  async function submit() {
    if (!category) return;
    setSubmitting(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Session expired. Please sign in again.");

      let imagePath: string | null = null;
      let imageDataUrl: string | undefined;

      if (file) {
        imageDataUrl = await fileToDataUrl(file);
        const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${auth.user.id}/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage
          .from("report-photos")
          .upload(path, file, { contentType: file.type });
        if (uploadError) throw uploadError;
        imagePath = path;
      }

      const analysis = await analyze({
        data: {
          category,
          description,
          location,
          severity,
          ...(imageDataUrl ? { imageDataUrl } : {}),
        },
      });

      const { data: report, error: insertError } = await supabase
        .from("reports")
        .insert({
          user_id: auth.user.id,
          category,
          title: analysis.detected_issue,
          description,
          location,
          image_path: imagePath,
          severity: analysis.severity,
          status: "pending",
          water_saved_litres: analysis.water_saved_litres,
          co2_saved_kg: analysis.co2_saved_kg,
          energy_saved_kwh: analysis.energy_saved_kwh,
        })
        .select()
        .single();
      if (insertError) throw insertError;

      await supabase.from("ai_analysis").insert({
        report_id: report.id,
        user_id: auth.user.id,
        detected_issue: analysis.detected_issue,
        confidence: analysis.confidence,
        severity: analysis.severity,
        environmental_impact: analysis.environmental_impact,
        estimated_water_loss: analysis.estimated_water_loss,
        estimated_energy_loss: analysis.estimated_energy_loss,
        suggested_action: analysis.suggested_action,
        summary: analysis.summary,
      });

      await logActivity("report_submitted", POINTS_PER_REPORT, { report_id: report.id });
      await notify("Report submitted", `${report.reference} is now under review by the campus team.`, "report");
      const badges = await syncBadges();

      queryClient.invalidateQueries();
      toast.success(`Report submitted · +${POINTS_PER_REPORT} green points`);
      if (badges.length) toast.success(`Badge unlocked: ${badges.join(", ")}`);
      navigate({ to: "/reports/$reportId", params: { reportId: report.id } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not submit the report.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        {step > 1 && (
          <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setStep(step - 1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <PageHeading title="Report an Issue" subtitle="Help us keep the campus greener — it takes 20 seconds." />
      </div>

      <div className="flex items-center gap-2">
        {[1, 2, 3].map((n) => (
          <div key={n} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors",
                step >= n ? "bg-gradient-primary text-primary-foreground shadow-glow" : "bg-muted text-muted-foreground",
              )}
            >
              {n}
            </span>
            {n < 3 && <span className={cn("h-1 flex-1 rounded-full", step > n ? "bg-primary" : "bg-muted")} />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="animate-rise surface-card p-5">
          <h2 className="font-display text-base font-semibold">Select category</h2>
          <p className="text-xs text-muted-foreground">What kind of issue did you spot?</p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {CATEGORIES.map((item) => (
              <button
                key={item.key}
                onClick={() => {
                  setCategory(item.key);
                  setStep(2);
                }}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition-all hover:-translate-y-0.5 hover:shadow-soft",
                  category === item.key ? "border-primary bg-accent" : "border-border bg-card",
                )}
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-mint text-primary">
                  <item.icon className="h-5 w-5" />
                </span>
                <span className="text-xs font-semibold leading-tight">{item.label}</span>
                <span className="text-[10px] text-muted-foreground">{item.hint}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="animate-rise surface-card p-5">
          <h2 className="font-display text-base font-semibold">Capture or upload</h2>
          <p className="text-xs text-muted-foreground">A photo helps our AI analyse the issue accurately.</p>

          <input
            ref={cameraInput}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => pickFile(e.target.files?.[0])}
          />
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => pickFile(e.target.files?.[0])}
          />

          {preview ? (
            <div className="relative mt-4 overflow-hidden rounded-2xl border border-border">
              <img src={preview} alt="Selected issue" className="h-64 w-full object-cover" />
              <Button
                size="icon"
                variant="secondary"
                className="absolute right-3 top-3 rounded-full"
                onClick={() => {
                  setFile(null);
                  setPreview(null);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <button
              onClick={() => cameraInput.current?.click()}
              className="mt-4 flex h-56 w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-primary/40 bg-gradient-mint transition-colors hover:border-primary"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-card text-primary shadow-soft">
                <Camera className="h-6 w-6" />
              </span>
              <span className="text-sm font-semibold text-accent-foreground">Take Photo</span>
            </button>
          )}

          <Button
            variant="outline"
            className="mt-3 h-11 w-full rounded-xl bg-card"
            onClick={() => fileInput.current?.click()}
          >
            <ImagePlus className="mr-2 h-4 w-4" /> Upload from gallery
          </Button>

          <Button
            className="mt-4 h-11 w-full rounded-xl bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-95"
            onClick={() => setStep(3)}
          >
            Next
          </Button>
        </div>
      )}

      {step === 3 && (
        <div className="animate-rise surface-card space-y-5 p-5">
          <div>
            <h2 className="font-display text-base font-semibold">Issue details</h2>
            <p className="text-xs text-muted-foreground">Tell us where it is and what you saw.</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="location">Location</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="location"
                value={location}
                maxLength={200}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ex: Library, Building A, Floor 2"
                className="h-11 rounded-xl pl-9"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              maxLength={1000}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide more details about the issue (optional)"
              className="min-h-28 rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Severity level</Label>
            <div className="grid grid-cols-3 gap-2">
              {SEVERITIES.map((level) => (
                <button
                  key={level}
                  onClick={() => setSeverity(level)}
                  className={cn(
                    "rounded-xl border py-2.5 text-sm font-semibold capitalize transition-all",
                    severity === level
                      ? level === "high"
                        ? "border-destructive/30 bg-destructive/10 text-destructive"
                        : level === "medium"
                          ? "border-warning/40 bg-warning/15 text-warning-foreground"
                          : "border-primary/30 bg-accent text-accent-foreground"
                      : "border-border bg-card text-muted-foreground",
                  )}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          <Button
            disabled={submitting || !category}
            onClick={submit}
            className="h-12 w-full rounded-xl bg-gradient-primary text-base font-semibold text-primary-foreground shadow-glow hover:opacity-95"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> AI is analysing your report…
              </>
            ) : (
              <>
                <Sparkle className="mr-2 h-4 w-4" /> Submit Report
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
