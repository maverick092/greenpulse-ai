import {
  Droplets,
  Trash2,
  Zap,
  Recycle,
  Trees,
  Bus,
  Wind,
  CircleDot,
  type LucideIcon,
} from "lucide-react";

export type CategoryKey =
  | "water_leakage"
  | "waste_management"
  | "energy_wastage"
  | "plastic_pollution"
  | "green_space_damage"
  | "transport_problem"
  | "air_pollution"
  | "other";

export const CATEGORIES: {
  key: CategoryKey;
  label: string;
  icon: LucideIcon;
  hint: string;
}[] = [
  { key: "water_leakage", label: "Water Leakage", icon: Droplets, hint: "Taps, pipes, tanks" },
  { key: "waste_management", label: "Waste Management", icon: Trash2, hint: "Overflowing bins" },
  { key: "energy_wastage", label: "Energy Wastage", icon: Zap, hint: "Lights, ACs, fans" },
  { key: "plastic_pollution", label: "Plastic Pollution", icon: Recycle, hint: "Litter, packaging" },
  { key: "green_space_damage", label: "Green Space Damage", icon: Trees, hint: "Trees, lawns" },
  { key: "transport_problem", label: "Transport Problem", icon: Bus, hint: "Idling, congestion" },
  { key: "air_pollution", label: "Air Pollution", icon: Wind, hint: "Smoke, dust, fumes" },
  { key: "other", label: "Other", icon: CircleDot, hint: "Anything else" },
];

export function categoryLabel(key: string) {
  return CATEGORIES.find((c) => c.key === key)?.label ?? "Other";
}

export function categoryIcon(key: string): LucideIcon {
  return CATEGORIES.find((c) => c.key === key)?.icon ?? CircleDot;
}

export const SEVERITIES = ["low", "medium", "high"] as const;
export type Severity = (typeof SEVERITIES)[number];

export const STATUS_FLOW = ["submitted", "ai_analysis", "under_review", "in_progress", "resolved"] as const;

export const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  resolved: "Resolved",
};

export const STATUS_STEP_LABEL: Record<string, string> = {
  submitted: "Submitted",
  ai_analysis: "AI Analysis",
  under_review: "Under Review",
  in_progress: "In Progress",
  resolved: "Resolved",
};

export function severityTone(severity: string) {
  if (severity === "high") return "text-destructive bg-destructive/10 border-destructive/20";
  if (severity === "medium") return "text-warning-foreground bg-warning/15 border-warning/30";
  return "text-accent-foreground bg-accent border-primary/20";
}

export function statusTone(status: string) {
  if (status === "resolved") return "text-accent-foreground bg-accent border-primary/20";
  if (status === "in_progress") return "text-info bg-info/10 border-info/20";
  return "text-warning-foreground bg-warning/15 border-warning/30";
}

export const POINTS_PER_REPORT = 40;
export const POINTS_PER_ARTICLE = 10;

export function completedSteps(status: string) {
  if (status === "resolved") return 5;
  if (status === "in_progress") return 4;
  return 3;
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 }).format(value);
}
