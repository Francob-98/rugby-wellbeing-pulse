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
