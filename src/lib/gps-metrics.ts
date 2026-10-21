/** Average the recorded metric, including zero; missing values are not zero. */
export function gpsMean<T, K extends keyof T>(entries: T[], key: K): number | null {
  const values = entries.map(entry => entry[key]).filter((value): value is T[K] & number => typeof value === "number" && Number.isFinite(value) && value >= 0);
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}