import { format, subDays, parseISO, differenceInCalendarDays } from "date-fns";

export interface WellnessEntry {
  player_line?: string | null;
  id: string;
  player_id: string;
  entry_date: string;
  sleep_quality: number;
  sleep_hours: number;
  fatigue: number;
  soreness: number;
  stress: number;
  mood: number;
  pain_zones: Record<string, number>;
  created_at: string;
}

export interface SessionEntry {
  player_line?: string | null;
  id: string;
  player_id: string;
  entry_date: string;
  team: string;
  session_type?: string;
  duration_min: number;
  rpe: number;
  fatigue: number;
  pain_zones: Record<string, number>;
  comments: string | null;
  load: number;
  created_at: string;
}

export const today = () => format(new Date(), "yyyy-MM-dd");
export const daysAgo = (n: number) => format(subDays(new Date(), n), "yyyy-MM-dd");
export const shortDate = (d: string) => format(parseISO(d), "dd/MM");

/** 5 items, each 1-5 where 5 is best → 0-100 */
export const wellnessPct = (e: WellnessEntry) =>
  Math.round(((e.sleep_quality + e.fatigue + e.soreness + e.stress + e.mood) / 25) * 100);

export const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export function acwr(sessions: SessionEntry[], ref = today()) {
  const refD = parseISO(ref);
  let acute = 0, chronic = 0;
  for (const s of sessions) {
    const d = differenceInCalendarDays(refD, parseISO(s.entry_date));
    if (d < 0) continue;
    if (d < 7) acute += s.load;
    if (d < 28) chronic += s.load;
  }
  const chronicWeekly = chronic / 4;
  return { acute, chronicWeekly: Math.round(chronicWeekly), ratio: chronicWeekly ? acute / chronicWeekly : null };
}

export const acwrStatus = (r: number | null) =>
  r == null ? "none" : r > 1.5 ? "high" : r < 0.8 ? "low" : "ok";

export function painHeat(entries: { pain_zones: Record<string, number> }[]) {
  const heat: Record<string, number> = {};
  for (const e of entries) for (const z of Object.keys(e.pain_zones ?? {})) heat[z] = (heat[z] ?? 0) + 1;
  return heat;
}

export function dateRange(days: number) {
  return Array.from({ length: days }, (_, i) => daysAgo(days - 1 - i));
}
