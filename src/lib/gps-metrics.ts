/** Average the recorded metric, including zero; missing values are not zero. */
export function gpsMean<T, K extends keyof T>(entries: T[], key: K): number | null {
  const values = entries.map(entry => entry[key]).filter((value): value is T[K] & number => typeof value === "number" && Number.isFinite(value) && value >= 0);
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

export type GpsLine = "Backs" | "Forwards";
export type GpsTargets = Partial<Record<GpsLine, number | null>>;
export function gpsTarget(line: string | null | undefined, base: GpsTargets, session: GpsTargets): number | null {
  if (line !== "Backs" && line !== "Forwards") return null;
  const value = session[line] ?? base[line];
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}
export function gpsTargetPercent(distance: number | null | undefined, target: number | null): number | null {
  return distance != null && Number.isFinite(distance) && distance >= 0 && target != null && target > 0 ? distance / target * 100 : null;
}
