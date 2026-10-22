import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { weeklyLoad, weeklyStatus, type SessionEntry } from "./metrics";

const s = (entry_date: string, load: number) => ({ entry_date, load } as SessionEntry);
// 2026-10-22 is a Thursday; week starts Monday 2026-10-19
const hist = [s("2026-09-21", 600), s("2026-09-28", 900), s("2026-10-05", 600), s("2026-10-12", 900)];

describe("carga semanal vs. habitual", () => {
  it("suma lunes a hoy y compara contra promedio ± 1 DE de 4 semanas", () => {
    const w = weeklyLoad([...hist, s("2026-10-19", 500), s("2026-10-21", 512)], "2026-10-22");
    assert.equal(w.current, 1012);
    assert.equal(w.mean, 750);
    assert.equal(w.low, 600);
    assert.equal(w.high, 900);
    assert.equal(w.changePct, 35);
  });
  it("sin historial suficiente no calcula", () => {
    assert.equal(weeklyLoad([s("2026-10-12", 900)], "2026-10-22").changePct, null);
  });
  it("umbrales orientativos 15% y 30%", () => {
    assert.equal(weeklyStatus(10), "ok");
    assert.equal(weeklyStatus(20), "warn");
    assert.equal(weeklyStatus(35), "high");
  });
});
