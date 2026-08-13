import { supabase } from "@/integrations/supabase/client";

/**
 * Awards points for an action using the secure database rule table.
 * The frontend never chooses the amount, and `dedupeKey` makes an award
 * impossible to claim twice for the same thing.
 */
export async function awardPoints(
  action: string,
  dedupeKey: string | null = null,
  metadata: Record<string, unknown> = {},
): Promise<number> {
  const { data, error } = await supabase.rpc("award_points", {
    _action: action,
    ...(dedupeKey ? { _dedupe_key: dedupeKey } : {}),
    _metadata: metadata as never,
  });
  if (error) {
    console.error("[rewards] award_points failed", error);
    return 0;
  }
  const row = Array.isArray(data) ? data[0] : data;
  return row?.awarded ?? 0;
}

export async function logActivity(action: string, _points = 0, metadata: Record<string, unknown> = {}) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return 0;
  const awarded = await awardPoints(action, (metadata['dedupe_key'] as string) ?? null, metadata);
  await supabase.from("activity_logs").insert({
    user_id: auth.user.id,
    action,
    points: awarded,
    metadata: metadata as never,
  });
  return awarded;
}

/** Once-per-day login reward + streak bookkeeping. */
export async function claimDailyLogin() {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;
  const today = new Date().toISOString().slice(0, 10);
  const awarded = await awardPoints("daily_login", `daily_login:${today}`, { day: today });
  if (awarded <= 0) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("streak_days, best_streak, last_active_at")
    .eq("id", auth.user.id)
    .maybeSingle();

  const last = profile?.last_active_at ? new Date(profile.last_active_at) : null;
  const daysApart = last ? Math.floor((Date.now() - last.getTime()) / 86_400_000) : 99;
  const streak = daysApart <= 1 ? (profile?.streak_days ?? 1) + 1 : 1;
  const best = Math.max(profile?.best_streak ?? 1, streak);

  await supabase
    .from("profiles")
    .update({ streak_days: streak, best_streak: best, last_active_at: new Date().toISOString() })
    .eq("id", auth.user.id);

  if (streak > 0 && streak % 7 === 0) {
    await awardPoints("streak_reward", `streak:${streak}`, { streak });
    await notify("Streak reward", `${streak}-day contribution streak — bonus points added.`, "points");
  }
}

export async function notify(title: string, message: string, type = "info") {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;
  await supabase.from("notifications").insert({ user_id: auth.user.id, title, message, type });
}

/** Awards any badges the student now qualifies for and returns newly earned names. */
export async function syncBadges(): Promise<string[]> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];

  const [{ data: profile }, { data: reports }, { data: badges }, { data: earned }] = await Promise.all([
    supabase.from("profiles").select("green_points").eq("id", auth.user.id).maybeSingle(),
    supabase.from("reports").select("category"),
    supabase.from("badges").select("*"),
    supabase.from("user_badges").select("badge_code"),
  ]);

  const points = profile?.green_points ?? 0;
  const list = reports ?? [];
  const has = new Set((earned ?? []).map((b) => b.badge_code));

  const qualifies: Record<string, boolean> = {
    green_starter: list.length >= 1,
    eco_warrior: list.length >= 5,
    water_saver: list.some((r) => r.category === "water_leakage"),
    energy_guardian: list.some((r) => r.category === "energy_wastage"),
    sustainability_hero: points >= 500,
    campus_champion: points >= 1000,
  };

  const newlyEarned: string[] = [];
  for (const badge of badges ?? []) {
    if (has.has(badge.code) || !qualifies[badge.code]) continue;
    const { error } = await supabase
      .from("user_badges")
      .insert({ user_id: auth.user.id, badge_code: badge.code });
    if (!error) {
      newlyEarned.push(`${badge.emoji} ${badge.name}`);
      await notify("New badge unlocked", `You earned the ${badge.name} badge.`, "badge");
    }
  }
  return newlyEarned;
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read the image."));
    reader.readAsDataURL(file);
  });
}

export async function signedPhotoUrl(path: string | null) {
  if (!path) return null;
  const { data } = await supabase.storage.from("report-photos").createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}
