import { supabase } from "@/integrations/supabase/client";
import type { RoutineSegment, RoutineDay, RoutineTemplate } from "@/types";

// Convert "HH:MM" to minutes; and back
export function minutesToTime(min: number): string {
  const m = Math.max(0, Math.min(1440, Math.round(min)));
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

export function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map((n) => parseInt(n, 10));
  return (h || 0) * 60 + (m || 0);
}

// Category → HSL hue color for segment visuals. Kept as a small palette so
// segments stay visually distinct without competing with theme tokens.
const CATEGORY_HUES: Record<string, number> = {
  Work: 262,
  Personal: 200,
  Health: 145,
  Learning: 45,
  Creative: 320,
  Social: 20,
  Finance: 165,
  Other: 230,
};

export function categoryColor(category?: string, opacity = 1): string {
  const hue = CATEGORY_HUES[category || "Other"] ?? 230;
  return `hsl(${hue} 70% 55% / ${opacity})`;
}

export function categoryHue(category?: string): number {
  return CATEGORY_HUES[category || "Other"] ?? 230;
}

function sortSegments(list: RoutineSegment[]): RoutineSegment[] {
  return [...list].sort((a, b) => a.startMin - b.startMin);
}

export function hasOverlap(list: RoutineSegment[], candidate: RoutineSegment): boolean {
  return list.some(
    (s) =>
      s.id !== candidate.id &&
      candidate.startMin < s.endMin &&
      candidate.endMin > s.startMin
  );
}

export async function getRoutineDay(date: string): Promise<RoutineDay | null> {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return null;

  const { data, error } = await supabase
    .from("routine_days")
    .select("*")
    .eq("user_id", user.id)
    .eq("date", date)
    .maybeSingle();

  if (!error && data) {
    return {
      id: data.id,
      date: data.date,
      segments: sortSegments((data.segments as any) || []),
    };
  }

  // Fallback: materialize from weekday template
  const dow = new Date(date + "T00:00:00").getDay();
  const template = await getRoutineTemplate(dow);
  if (template && template.segments.length > 0) {
    return {
      date,
      segments: template.segments.map((s) => ({ ...s, completed: false })),
    };
  }
  return { date, segments: [] };
}

export async function saveRoutineDay(day: RoutineDay): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("routine_days")
    .upsert(
      {
        user_id: user.id,
        date: day.date,
        segments: sortSegments(day.segments) as any,
      },
      { onConflict: "user_id,date" }
    );
  if (error) throw error;
}

export async function getRoutineTemplate(dayOfWeek: number): Promise<RoutineTemplate | null> {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return null;

  const { data, error } = await supabase
    .from("routine_templates")
    .select("*")
    .eq("user_id", user.id)
    .eq("day_of_week", dayOfWeek)
    .maybeSingle();

  if (!error && data) {
    return {
      id: data.id,
      dayOfWeek: data.day_of_week,
      segments: sortSegments((data.segments as any) || []),
    };
  }
  return null;
}

export async function saveRoutineTemplate(tpl: RoutineTemplate): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("routine_templates")
    .upsert(
      {
        user_id: user.id,
        day_of_week: tpl.dayOfWeek,
        segments: sortSegments(tpl.segments) as any,
      },
      { onConflict: "user_id,day_of_week" }
    );
  if (error) throw error;
}

// Roll segment completion up into per-task completion percentage.
// Returns Map<taskId or title, percent>.
export function computeTaskCompletionFromSegments(segments: RoutineSegment[]) {
  const totals = new Map<string, { total: number; done: number }>();
  for (const s of segments) {
    const key = s.taskId || s.title;
    if (!key) continue;
    const duration = Math.max(0, s.endMin - s.startMin);
    const cur = totals.get(key) || { total: 0, done: 0 };
    cur.total += duration;
    if (s.completed) cur.done += duration;
    totals.set(key, cur);
  }
  const out = new Map<string, number>();
  totals.forEach((v, k) => {
    out.set(k, v.total > 0 ? Math.round((v.done / v.total) * 100) : 0);
  });
  return out;
}

export function routineDayProductivity(segments: RoutineSegment[]): number {
  if (segments.length === 0) return 0;
  let total = 0;
  let done = 0;
  for (const s of segments) {
    const d = Math.max(0, s.endMin - s.startMin);
    total += d;
    if (s.completed) done += d;
  }
  return total > 0 ? Math.round((done / total) * 100) : 0;
}