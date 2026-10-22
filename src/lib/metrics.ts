import { format, subDays, parseISO, differenceInCalendarDays, startOfWeek } from "date-fns";

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

/** Days of history needed: current week (up to 7 days) + 4 previous full weeks. */
export const WEEKLY_HISTORY_DAYS = 35;
/** Minimum previous weeks with registered sessions to compute a usual range. */
export const MIN_HISTORY_WEEKS = 3;

export interface WeeklyLoad {
  current: number;
  weeks: number[]; // previous 4 full weeks (oldest → newest), empty weeks count as 0
  mean: number | null;
  sd: number | null;
  low: number | null;
  high: number | null;
  changePct: number | null;
}

/**
 * Carga semanal (lunes a domingo, suma de RPE × minutos) vs. rango habitual
 * (promedio ± 1 desvío estándar de las 4 semanas completas anteriores).
 */
export function weeklyLoad(sessions: SessionEntry[], ref = today()): WeeklyLoad {
  const refD = parseISO(ref);
  const monday = startOfWeek(refD, { weekStartsOn: 1 });
  let current = 0;
  const weeks = [0, 0, 0, 0];
  const withData = [false, false, false, false];
  for (const s of sessions) {
    const d = parseISO(s.entry_date);
    if (d > refD) continue;
    const diff = differenceInCalendarDays(monday, d);
    if (diff <= 0) { current += s.load; continue; }
    const idx = 3 - Math.floor((diff - 1) / 7);
    if (idx >= 0) { weeks[idx] = (weeks[idx] ?? 0) + s.load; withData[idx] = true; }
  }
  if (withData.filter(Boolean).length < MIN_HISTORY_WEEKS) {
    return { current, weeks, mean: null, sd: null, low: null, high: null, changePct: null };
  }
  const mean = weeks.reduce((a, b) => a + b, 0) / 4;
  const sd = Math.sqrt(weeks.reduce((a, b) => a + (b - mean) ** 2, 0) / 4);
  return {
    current, weeks,
    mean: Math.round(mean), sd: Math.round(sd),
    low: Math.max(0, Math.round(mean - sd)), high: Math.round(mean + sd),
    changePct: mean > 0 ? Math.round(((current - mean) / mean) * 100) : null,
  };
}

/** Orientativo, no un umbral validado: >30% rojo, >15% amarillo. */
export const weeklyStatus = (pct: number | null) =>
  pct == null ? "none" : pct > 30 ? "high" : pct > 15 ? "warn" : "ok";

export const formatWeekly = (w: WeeklyLoad) =>
  w.changePct == null
    ? `${w.current} UA · historial insuficiente`
    : `${w.current} UA · ${w.changePct > 0 ? "+" : ""}${w.changePct}% vs. su promedio (habitual ${w.low}–${w.high})`;

export function painHeat(entries: { pain_zones: Record<string, number> }[]) {
  const heat: Record<string, number> = {};
  for (const e of entries) for (const z of Object.keys(e.pain_zones ?? {})) heat[z] = (heat[z] ?? 0) + 1;
  return heat;
}

export function dateRange(days: number) {
  return Array.from({ length: days }, (_, i) => daysAgo(days - 1 - i));
}
