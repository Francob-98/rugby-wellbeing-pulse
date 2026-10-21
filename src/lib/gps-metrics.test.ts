import { describe, test } from "node:test";
import { strict as assert } from "node:assert";
import { gpsMean, gpsTarget, gpsTargetPercent } from "./gps-metrics";

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

describe("GPS distance reference rules", () => {
  test("session adjustment takes precedence over the base for the selected line", () => {
    assert.equal(gpsTarget("Backs", { Backs: 6000, Forwards: 4000 }, { Backs: 5000 }), 5000);
    assert.equal(gpsTarget("Forwards", { Backs: 6000, Forwards: 4000 }, { Backs: 5000 }), 4000);
  });
  test("percentage is actual distance divided by target, including zero and above target", () => {
    assert.equal(gpsTargetPercent(4000, 5000), 80);
    assert.equal(gpsTargetPercent(6000, 5000), 120);
    assert.equal(gpsTargetPercent(0, 5000), 0);
  });
  test("missing line, target or distance never produces a fabricated assessment", () => {
    assert.equal(gpsTarget(null, { Backs: 5000 }, {}), null);
    assert.equal(gpsTarget("Backs", {}, {}), null);
    assert.equal(gpsTargetPercent(null, 5000), null);
    assert.equal(gpsTargetPercent(4000, 0), null);
  });
});
