import { describe, expect, test } from "bun:test";
import { gpsMean } from "./gps-metrics";

describe("GPS recorded averages", () => {
  test("includes distances even when another metric needs review", () => {
    expect(gpsMean([{ distance: 5688, duration: 424.4 }, { distance: 4943, duration: 92.4 }], "distance")).toBe(5315.5);
  });
  test("includes real zeros but not missing values", () => {
    expect(gpsMean([{ sprint: 0 }, { sprint: 0.4 }, { sprint: null }], "sprint")).toBe(0.2);
  });
  test("no available measurements returns null", () => {
    expect(gpsMean([{ distance: null }], "distance")).toBeNull();
  });
});