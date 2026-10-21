/** Average the recorded metric, including zero; missing values are not zero. */
export function gpsMean<T, K extends keyof T>(entries: T[], key: K): number | null {
  const values = entries.map(entry => entry[key]).filter((value): value is T[K] & number => typeof value === "number" && Number.isFinite(value) && value >= 0);
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

export type Light = "verde" | "amarillo" | "rojo" | "sin-dato";

/** Compare a value with the session mean: ±15% green, ±30% yellow, beyond red. */
export function loadLight(value: number | null | undefined, groupMean: number | null): Light {
  if (value == null || groupMean == null || groupMean <= 0) return "sin-dato";
  const diff = Math.abs(value / groupMean - 1);
  return diff <= 0.15 ? "verde" : diff <= 0.3 ? "amarillo" : "rojo";
}

/** Perceived effort: 8+ needs follow-up, 7 observe. */
export function rpeLight(rpe: number | null | undefined): Light {
  if (rpe == null) return "sin-dato";
  return rpe >= 8 ? "rojo" : rpe >= 7 ? "amarillo" : "verde";
}
