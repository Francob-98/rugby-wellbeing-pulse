import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bar, CartesianGrid, ComposedChart, Legend, Line, LineChart, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PlayerPicker, usePlayers } from "@/components/PlayerPicker";
import { useEntries } from "@/lib/staff-data";
import { weeklyLoad, weeklyStatus, dateRange, painHeat, shortDate, wellnessPct } from "@/lib/metrics";
import { BodyMap, PainLegend, zoneLabel } from "@/components/BodyMap";
import { Kpi, Panel, RangeSelect, chartTooltipStyle } from "@/components/staff/Widgets";
import { format, parseISO, subDays } from "date-fns";

export const Route = createFileRoute("/_authenticated/jugador/$id")({
  head: () => ({
    meta: [
      { title: "Ficha de jugador · CBMM Rugby" },
      { name: "description", content: "Wellness, carga semanal y mapa de dolor de un jugador." },
      { property: "og:title", content: "Ficha de jugador · CBMM Rugby" },
      { property: "og:description", content: "Seguimiento individual de cargas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PlayerPage,
});

function PlayerPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [days, setDays] = useState(28);
  const [painDate, setPainDate] = useState<string | null>(null);
  const { data: players = [] } = usePlayers();
  const player = players.find((p) => p.id === id);
  const { data, isLoading } = useEntries(days, id);

  const v = useMemo(() => {
    const w = data?.wellness ?? [];
    const s = data?.sessions ?? [];
    const range = dateRange(days);
    const start = range[0] ?? "";
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
      };
    });
    const last = wR.at(-1);
    const radar = last ? [
      { k: "Sueño", v: last.sleep_quality }, { k: "Fatiga", v: last.fatigue }, { k: "Dolor", v: last.soreness },
      { k: "Estrés", v: last.stress }, { k: "Ánimo", v: last.mood },
    ] : [];
    const comments = sR.filter((e) => e.comments).reverse();
    const lastPain = { ...(wR.at(-1)?.pain_zones ?? {}), ...(sR.at(-1)?.pain_zones ?? {}) };
    const dayPain: Record<string, number> = {};
    if (painDate) for (const e of [...wR, ...sR].filter((e) => e.entry_date === painDate))
      for (const [z, l] of Object.entries(e.pain_zones ?? {})) dayPain[z] = Math.max(dayPain[z] ?? 0, Number(l));
    return { daily, last, radar, comments, heat: painHeat([...wR, ...sR]), lastPain: painDate ? dayPain : lastPain, sR, a: weeklyLoad(s) };
  }, [data, days, painDate]);

  const st = weeklyStatus(v.a.changePct);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-display text-sm uppercase tracking-widest text-accent">{player?.active === false ? "Desafectado" : "Jugador"}</p>
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
        <Kpi label="Carga semanal" value={v.a.current || "—"} sub="UA lunes a hoy (RPE × min)" />
        <Kpi label="Rango habitual" value={v.a.low != null ? `${v.a.low}–${v.a.high}` : "—"} sub={v.a.mean != null ? `promedio ${v.a.mean} UA · 4 semanas` : "historial insuficiente"} />
        <Kpi label="Cambio vs. promedio" value={v.a.changePct != null ? `${v.a.changePct > 0 ? "+" : ""}${v.a.changePct}%` : "—"} sub="amarillo +15% · rojo +30% (orientativo)"
          tone={st === "ok" ? "ok" : st === "high" ? "bad" : st === "warn" ? "warn" : undefined} />
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
            <Panel title="Horas de sueño">
              <ResponsiveContainer width="100%" height={240}>
                <ComposedChart data={v.daily}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                                    <YAxis yAxisId="r" domain={[0, 12]} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar yAxisId="r" dataKey="horas" name="Horas sueño" fill="var(--chart-5)" fillOpacity={0.4} radius={[4, 4, 0, 0]} />
                </ComposedChart>
              </ResponsiveContainer>
            </Panel>
          </div>

          <Panel title={`Sesiones guardadas (${v.sR.length})`}>
            <p className="mb-2 text-xs text-muted-foreground">Tocá una fecha para ver su dolor en el mapa.</p>
            {v.sR.length ? (
              <>
                <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Kpi label="Sesiones" value={v.sR.length} />
                  <Kpi label="Minutos totales" value={v.sR.reduce((a, b) => a + b.duration_min, 0)} />
                  <Kpi label="RPE promedio" value={(v.sR.reduce((a, b) => a + b.rpe, 0) / v.sR.length).toFixed(1)} />
                  <Kpi label="Carga total" value={v.sR.reduce((a, b) => a + b.load, 0)} sub="UA" />
                </div>
                <div className="max-h-[420px] overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-card text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <tr><th className="py-2">Fecha</th><th>Equipo</th><th>Tipo</th><th className="text-right">Min</th><th className="text-right">RPE</th><th className="text-right">Carga</th><th className="pl-3">Evolución</th></tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const max = Math.max(...v.sR.map((x) => x.load), 1);
                        return [...v.sR].reverse().map((s) => (
                          <tr key={s.id} onClick={() => setPainDate(painDate === s.entry_date ? null : s.entry_date)} aria-selected={painDate === s.entry_date}
                            className={`cursor-pointer border-t border-border hover:bg-muted/50 ${painDate === s.entry_date ? "bg-primary/10" : ""}`}>
                            <td className="py-2">{format(parseISO(s.entry_date), "dd/MM/yy")}</td>
                            <td>{s.team}</td>
                            <td>{s.session_type ?? "Entrenamiento"}</td>
                            <td className="text-right">{s.duration_min}</td>
                            <td className={`text-right font-semibold ${s.rpe >= 8 ? "text-destructive" : ""}`}>{s.rpe}</td>
                            <td className="text-right font-semibold">{s.load}</td>
                            <td className="w-1/4 pl-3"><div className="h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-primary" style={{ width: `${(s.load / max) * 100}%` }} /></div></td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </>
            ) : <p className="text-sm text-muted-foreground">Sin sesiones en este período.</p>}
          </Panel>

          <div className="grid gap-4 lg:grid-cols-3">
            <Panel title={painDate ? `Dolor del ${format(parseISO(painDate), "dd/MM/yy")}` : "Dolor último registro"}>
              {painDate && <button onClick={() => setPainDate(null)} className="mb-2 text-xs text-primary underline">Volver al último registro</button>}
              <BodyMap value={v.lastPain} />
              {painDate && !Object.keys(v.lastPain).length && <p className="mt-2 text-sm text-muted-foreground">Sin dolor reportado en esa fecha.</p>}
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
