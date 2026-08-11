import { supabase } from "@/integrations/supabase/client";

export async function logActivity(action: string, points: number, metadata: Record<string, unknown> = {}) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;
  await supabase.from("activity_logs").insert({
    user_id: auth.user.id,
    action,
    points,
    metadata: metadata as never,
  });
  const { data: profile } = await supabase
    .from("profiles")
    .select("green_points")
    .eq("id", auth.user.id)
    .maybeSingle();
  await supabase
    .from("profiles")
    .update({ green_points: (profile?.green_points ?? 0) + points })
    .eq("id", auth.user.id);
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
