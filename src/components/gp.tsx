import { useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/greenpulse";

export function Counter({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef(0);

  useEffect(() => {
    const start = ref.current;
    const diff = value - start;
    const duration = 900;
    let frame = 0;
    const startedAt = performance.now();

    const tick = (now: number) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(start + diff * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
      else ref.current = value;
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return (
    <span>
      {formatNumber(Math.round(display * 10) / 10)}
      {suffix}
    </span>
  );
}

export function StatCard({
  icon: Icon,
  label,
  value,
  suffix,
  tone = "primary",
  caption,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  suffix?: string;
  tone?: "primary" | "info" | "warning" | "destructive";
  caption?: string;
}) {
  const tones = {
    primary: "bg-accent text-accent-foreground",
    info: "bg-info/10 text-info",
    warning: "bg-warning/15 text-warning-foreground",
    destructive: "bg-destructive/10 text-destructive",
  } as const;

  return (
    <div className="animate-rise surface-card p-4 transition-transform hover:-translate-y-0.5 hover:shadow-lifted">
      <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl", tones[tone])}>
        <Icon className="h-4.5 w-4.5" />
      </div>
      <p className="mt-3 font-display text-2xl font-bold leading-none">
        <Counter value={value} suffix={suffix} />
      </p>
      <p className="mt-1.5 text-xs font-medium text-muted-foreground">{label}</p>
      {caption && <p className="mt-0.5 text-[11px] text-muted-foreground/80">{caption}</p>}
    </div>
  );
}

export function ScoreRing({ score, size = 148 }: { score: number; size?: number }) {
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(Math.max(score, 0), 100) / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--muted)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.16,1,0.3,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-3xl font-bold">{Math.round(score)}</span>
        <span className="text-[11px] text-muted-foreground">out of 100</span>
      </div>
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="surface-card flex flex-col items-center px-6 py-14 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-mint">
        <Icon className="h-7 w-7 text-primary" />
      </div>
      <h3 className="mt-4 font-display text-lg font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function PageHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="animate-rise">
      <h1 className="font-display text-2xl font-bold tracking-tight lg:text-3xl">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

export function Chip({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
        className,
      )}
    >
      {children}
    </span>
  );
}
