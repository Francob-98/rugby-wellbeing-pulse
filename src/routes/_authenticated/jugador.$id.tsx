import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bar, CartesianGrid, ComposedChart, Legend, Line, LineChart, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PlayerPicker, usePlayers } from "@/components/PlayerPicker";
import { useEntries } from "@/lib/staff-data";
import { acwr, acwrStatus, dateRange, painHeat, shortDate, wellnessPct } from "@/lib/metrics";
import { BodyMap, PainLegend, zoneLabel } from "@/components/BodyMap";
import { Kpi, Panel, RangeSelect, chartTooltipStyle } from "@/components/staff/Widgets";
import { format, parseISO, subDays } from "date-fns";

export const Route = createFileRoute("/_authenticated/jugador/$id")({
  head: () => ({
    meta: [
      { title: "Ficha de jugador · CBMM Rugby" },
      { name: "description", content: "Wellness, carga, ACWR y mapa de dolor de un jugador." },
      { property: "og:title", content: "Ficha de jugador · CBMM Rugby" },
      { property: "og:description", content: "Seguimiento individual de cargas." },
    ],
  }),
  component: PlayerPage,
});

function PlayerPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [days, setDays] = useState(28);
  const { data: players = [] } = usePlayers();
  const player = players.find((p) => p.id === id);
  const { data, isLoading } = useEntries(days, id);

  const v = useMemo(() => {
    const w = data?.wellness ?? [];
    const s = data?.sessions ?? [];
    const range = dateRange(days);
    const start = range[0]!;
    const wR = w.filter((e) => e.entry_date >= start);
    const sR = s.filter((e) => e.entry_date >= start);
    const daily = range.map((d) => {
      const we = wR.find((e) => e.entry_date === d);
      const ses = sR.filter((e) => e.entry_date === d);
      return {
        date: shortDate(d),
        Sueño: we?.sleep_quality, Fatiga: we?.fatigue, Dolor: we?.soreness, Estrés: we?.stress, Ánimo: we?.mood,
        horas: we ? Number(we.sleep_hours) : null,
        wellness: we ? wellnessPct(we) : null,
        carga: ses.reduce((a, b) => a + b.load, 0) || null,
        rpe: ses.length ? Math.max(...ses.map((x) => x.rpe)) : null,
        acwr: (() => { const r = acwr(s, d).ratio; return r ? Number(r.toFixed(2)) : null; })(),
      };
    });
    const last = wR.at(-1);
    const radar = last ? [
      { k: "Sueño", v: last.sleep_quality }, { k: "Fatiga", v: last.fatigue }, { k: "Dolor", v: last.soreness },
      { k: "Estrés", v: last.stress }, { k: "Ánimo", v: last.mood },
    ] : [];
    const comments = sR.filter((e) => e.comments).reverse();
    const lastPain = { ...(wR.at(-1)?.pain_zones ?? {}), ...(sR.at(-1)?.pain_zones ?? {}) };
    return { daily, last, radar, comments, heat: painHeat([...wR, ...sR]), lastPain, sR, a: acwr(s) };
  }, [data, days]);

  const st = acwrStatus(v.a.ratio);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-display text-sm uppercase tracking-widest text-accent">{player?.team ?? "Jugador"}{player?.position ? ` · ${player.position}` : ""}</p>
          <h1 className="font-display text-4xl font-bold uppercase">{player?.full_name ?? "…"}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/jugador/$id/respuestas" params={{ id }} className="inline-flex h-9 items-center rounded-md border border-border bg-card px-3 text-sm font-medium hover:bg-muted">Ver todas las respuestas</Link>
          <div className="w-56"><PlayerPicker value={id} onlyActive={false} onChange={(pid) => navigate({ to: "/jugador/$id", params: { id: pid } })} /></div>
          <RangeSelect value={days} onChange={setDays} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Último wellness" value={v.last ? `${wellnessPct(v.last)}%` : "—"} sub={v.last ? shortDate(v.last.entry_date) : "sin datos"}
          tone={v.last ? (wellnessPct(v.last) >= 70 ? "ok" : wellnessPct(v.last) >= 60 ? "warn" : "bad") : undefined} />
        <Kpi label="Carga aguda (7d)" value={v.a.acute || "—"} sub="UA (RPE × min)" />
        <Kpi label="Carga crónica" value={v.a.chronicWeekly || "—"} sub="promedio semanal 28d" />
        <Kpi label="ACWR" value={v.a.ratio ? v.a.ratio.toFixed(2) : "—"} sub="zona óptima 0.8 – 1.3"
          tone={st === "ok" ? "ok" : st === "high" ? "bad" : st === "low" ? "warn" : undefined} />
      </div>

      {isLoading ? <p className="text-muted-foreground">Cargando…</p> : (
        <>
          <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
            <Panel title="Ítems de wellness (1 = peor · 5 = mejor)">
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={v.daily}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                  <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {["Sueño", "Fatiga", "Dolor", "Estrés", "Ánimo"].map((k, i) => (
                    <Line key={k} type="monotone" dataKey={k} stroke={`var(--chart-${i + 1})`} strokeWidth={2} connectNulls dot={{ r: 2 }} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </Panel>
            <Panel title="Último wellness">
              {v.radar.length ? (
                <ResponsiveContainer width="100%" height={260}>
                  <RadarChart data={v.radar}>
                    <PolarGrid stroke="var(--border)" />
                    <PolarAngleAxis dataKey="k" tick={{ fontSize: 12, fill: "var(--foreground)" }} />
                    <PolarRadiusAxis domain={[0, 5]} tick={false} axisLine={false} />
                    <Radar dataKey="v" stroke="var(--chart-2)" fill="var(--chart-2)" fillOpacity={0.35} />
                  </RadarChart>
                </ResponsiveContainer>
              ) : <p className="text-sm text-muted-foreground">Sin datos.</p>}
              {v.last && <p className="text-center text-sm text-muted-foreground">Durmió {Number(v.last.sleep_hours)} h</p>}
            </Panel>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Carga diaria (UA) y RPE">
              <ResponsiveContainer width="100%" height={240}>
                <ComposedChart data={v.daily}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                  <YAxis yAxisId="l" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                  <YAxis yAxisId="r" orientation="right" domain={[0, 10]} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar yAxisId="l" dataKey="carga" name="Carga" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="r" dataKey="rpe" name="RPE" stroke="var(--chart-2)" strokeWidth={2} connectNulls />
                </ComposedChart>
              </ResponsiveContainer>
            </Panel>
            <Panel title="ACWR y horas de sueño">
              <ResponsiveContainer width="100%" height={240}>
                <ComposedChart data={v.daily}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                  <YAxis yAxisId="l" domain={[0, 2]} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                  <YAxis yAxisId="r" orientation="right" domain={[0, 12]} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar yAxisId="r" dataKey="horas" name="Horas sueño" fill="var(--chart-5)" fillOpacity={0.4} radius={[4, 4, 0, 0]} />
                  <Line yAxisId="l" dataKey="acwr" name="ACWR" stroke="var(--chart-2)" strokeWidth={3} connectNulls dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </Panel>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Panel title="Dolor último registro">
              <BodyMap value={v.lastPain} />
              <ul className="mt-2 space-y-1 text-sm">
                {Object.entries(v.lastPain).map(([z, l]) => <li key={z} className="flex justify-between"><span>{zoneLabel(z)}</span><span>{["", "Leve", "Moderado", "Intenso"][l]}</span></li>)}
              </ul>
            </Panel>
            <Panel title={`Dolor acumulado (${days} días)`}>
              <BodyMap heat={v.heat} />
              <div className="mt-3"><PainLegend heat /></div>
            </Panel>
            <Panel title="Comentarios post entreno">
              <ul className="max-h-[420px] space-y-3 overflow-auto">
                {v.comments.map((c) => (
                  <li key={c.id} className="border-l-2 border-accent pl-3">
                    <div className="text-xs text-muted-foreground">{format(parseISO(c.entry_date), "dd/MM")} · {c.team} · RPE {c.rpe}</div>
                    <p className="text-sm">{c.comments}</p>
                  </li>
                ))}
                {!v.comments.length && <li className="text-sm text-muted-foreground">Sin comentarios.</li>}
              </ul>
            </Panel>
          </div>
        </>
      )}
      <p className="text-xs text-muted-foreground">Datos desde {format(subDays(new Date(), days - 1), "dd/MM/yyyy")}.</p>
    </div>
  );
}
