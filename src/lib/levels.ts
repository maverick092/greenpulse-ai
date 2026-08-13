/** Mirrors the configurable public.user_levels table. */
export const LEVELS = [
  { level: 1, title: "Campus Observer", min: 0 },
  { level: 2, title: "Campus Scout", min: 100 },
  { level: 3, title: "Eco Warrior", min: 250 },
  { level: 4, title: "Campus Guardian", min: 500 },
  { level: 5, title: "Sustainability Champion", min: 1000 },
  { level: 6, title: "Campus Hero", min: 2000 },
  { level: 7, title: "Impact Leader", min: 3500 },
  { level: 8, title: "Campus Legend", min: 5000 },
] as const;

export type LevelInfo = {
  level: number;
  title: string;
  currentMin: number;
  nextMin: number | null;
  nextTitle: string | null;
  pointsToNext: number;
  progress: number;
};

export function levelFor(points: number): LevelInfo {
  const pts = Math.max(points ?? 0, 0);
  let index = 0;
  for (let i = 0; i < LEVELS.length; i += 1) {
    if (pts >= LEVELS[i]!.min) index = i;
  }
  const current = LEVELS[index]!;
  const next = LEVELS[index + 1] ?? null;
  const span = next ? next.min - current.min : 1;
  const progress = next ? Math.min(((pts - current.min) / span) * 100, 100) : 100;

  return {
    level: current.level,
    title: current.title,
    currentMin: current.min,
    nextMin: next?.min ?? null,
    nextTitle: next?.title ?? null,
    pointsToNext: next ? Math.max(next.min - pts, 0) : 0,
    progress,
  };
}

export function levelTitle(points: number) {
  return levelFor(points).title;
}
