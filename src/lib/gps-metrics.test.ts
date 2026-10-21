import { describe, test } from "node:test";
import { strict as assert } from "node:assert";
import { gpsMean } from "./gps-metrics";

describe("GPS recorded averages", () => {
  test("includes distances even when another metric needs review", () => {
    assert.equal(gpsMean([{ distance: 5688, duration: 424.4 }, { distance: 4943, duration: 92.4 }], "distance"), 5315.5);
  });
  test("includes real zeros but not missing values", () => {
    assert.equal(gpsMean([{ sprint: 0 }, { sprint: 0.4 }, { sprint: null }], "sprint"), 0.2);
  });
  test("no available measurements returns null", () => {
    assert.equal(gpsMean([{ distance: null }], "distance"), null);
  });
});
import { loadLight, rpeLight } from "./gps-metrics";
describe("semáforo GPS", () => {
  it("verde hasta ±15% del promedio", () => expect(loadLight(1150, 1000)).toBe("verde"));
  it("amarillo hasta ±30%", () => expect(loadLight(750, 1000)).toBe("amarillo"));
  it("rojo más allá de ±30%", () => expect(loadLight(1400, 1000)).toBe("rojo"));
  it("PSE 8 o más es rojo", () => expect(rpeLight(8)).toBe("rojo"));
  it("PSE 7 es amarillo", () => expect(rpeLight(7)).toBe("amarillo"));
});
