import { describe, test } from "node:test";
import { strict as assert } from "node:assert";
import { gpsMean, loadLight, rpeLight } from "./gps-metrics";

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
describe("semáforo GPS", () => {
  test("verde hasta ±15% del promedio", () => assert.equal(loadLight(1150, 1000), "verde"));
  test("amarillo hasta ±30%", () => assert.equal(loadLight(750, 1000), "amarillo"));
  test("rojo más allá de ±30%", () => assert.equal(loadLight(1400, 1000), "rojo"));
  test("PSE 8 o más es rojo", () => assert.equal(rpeLight(8), "rojo"));
  test("PSE 7 es amarillo", () => assert.equal(rpeLight(7), "amarillo"));
});
