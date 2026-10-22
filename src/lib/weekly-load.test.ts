import { describe, expect, it } from "bun:test";
import { weeklyLoad, weeklyStatus, type SessionEntry } from "./metrics";

const s = (entry_date: string, load: number) => ({ entry_date, load } as SessionEntry);
// 2026-10-22 is a Thursday; week starts Monday 2026-10-19
const hist = [s("2026-09-21", 600), s("2026-09-28", 900), s("2026-10-05", 600), s("2026-10-12", 900)];

describe("carga semanal vs. habitual", () => {
  it("suma lunes a hoy y compara contra promedio ± 1 DE de 4 semanas", () => {
    const w = weeklyLoad([...hist, s("2026-10-19", 500), s("2026-10-21", 512)], "2026-10-22");
    expect(w.current).toBe(1012);
    expect(w.mean).toBe(750);
    expect(w.low).toBe(600);
    expect(w.high).toBe(900);
    expect(w.changePct).toBe(35);
  });
  it("sin historial suficiente no calcula", () => {
    expect(weeklyLoad([s("2026-10-12", 900)], "2026-10-22").changePct).toBeNull();
  });
  it("umbrales orientativos 15% y 30%", () => {
    expect(weeklyStatus(10)).toBe("ok");
    expect(weeklyStatus(20)).toBe("warn");
    expect(weeklyStatus(35)).toBe("high");
  });
});
