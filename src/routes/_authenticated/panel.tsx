import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Flag, Sun } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { usePlayers } from "@/components/PlayerPicker";
import { useEntries } from "@/lib/staff-data";
import { acwr, acwrStatus, avg, dateRange, painHeat, shortDate, today, wellnessPct } from "@/lib/metrics";
import { TEAMS } from "@/lib/constants";
import { BodyMap, PainLegend, zoneLabel } from "@/components/BodyMap";
import { Kpi, Panel, RangeSelect, StatusPill, chartTooltipStyle } from "@/components/staff/Widgets";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/panel")({
  head: () => ({
    meta: [
      { title: "Panel general · CBMM Rugby" },
      { name: "description", content: "Wellness, carga y dolor del plantel completo." },
      { property: "og:title", content: "Panel general · CBMM Rugby" },
      { property: "og:description", content: "Control de cargas del plantel." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PanelPage,
});

function PanelPage() {
  const [days, setDays] = useState(14);
  const [team, setTeam] = useState("all");
  const [kind, setKind] = useState("all");
  const { data: players = [] } = usePlayers();
  const { data, isLoading } = useEntries(days);

  const view = useMemo(() => {
    const allS = (data?.sessions ?? []).filter((e) => kind === "all" || (e.session_type ?? "Entrenamiento") === kind);
    // Post-entreno se filtra por el equipo en el que jugó cada uno; pre-entreno por el equipo del jugador
    const s = allS.filter((e) => team === "all" || e.team === team);
    const sIds = new Set(s.map((e) => e.player_id));
    const ps = players.filter((p) => team === "all" || p.team === team || sIds.has(p.id));
    const ids = new Set(ps.map((p) => p.id));
    const w = (data?.wellness ?? []).filter((e) => ids.has(e.player_id));
    const range = dateRange(days);
    const start = range[0]!;
    const wR = w.filter((e) => e.entry_date >= start);
    const sR = s.filter((e) => e.entry_date >= start);

    const daily = range.map((d) => {
      const wd = wR.filter((e) => e.entry_date === d);
      const sd = sR.filter((e) => e.entry_date === d);
      return {
        date: shortDate(d),
        wellness: wd.length ? Math.round(avg(wd.map(wellnessPct))!) : null,
        carga: sd.length ? Math.round(avg(sd.map((x) => x.load))!) : null,
        rpe: sd.length ? Number(avg(sd.map((x) => x.rpe))!.toFixed(1)) : null,
      };
    });

    const t = today();
    const rows = ps.map((p) => {
      const pw = w.filter((e) => e.player_id === p.id);
      const lastW = pw.at(-1);
      const ps_ = s.filter((e) => e.player_id === p.id);
      const lastS = ps_.at(-1);
      const a = acwr(ps_);
      const painCount = Object.keys(lastW?.pain_zones ?? {}).length + Object.keys(lastS?.pain_zones ?? {}).length;
      return { p, lastW, lastS, a, painCount, todayW: lastW?.entry_date === t };
    }).sort((x, y) => (x.lastW ? wellnessPct(x.lastW) : 999) - (y.lastW ? wellnessPct(y.lastW) : 999));

    const todayW = wR.filter((e) => e.entry_date === t);
    const heat = painHeat([...wR, ...sR]);
    const topZones = Object.entries(heat).sort((a, b) => b[1] - a[1]).slice(0, 6);

    return { ps, daily, rows, todayW, heat, topZones, sR };
  }, [players, data, days, team, kind]);

  const avgToday = avg(view.todayW.map(wellnessPct));
  const avgRpe = avg(view.sR.map((entry) => entry.rpe));
  const alerts = view.rows.filter((r) => (r.lastW && wellnessPct(r.lastW) < 60) || acwrStatus(r.a.ratio) === "high").length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-display text-sm uppercase tracking-widest text-accent">Panel general</p>
          <h1 className="font-display text-4xl font-bold uppercase">Estado del plantel</h1>
        </div>
        <div className="flex gap-2">
          <Select value={team} onValueChange={setTeam}>
            <SelectTrigger className="w-44 bg-card"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo el plantel</SelectItem>
              {TEAMS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={kind} onValueChange={setKind}>
            <SelectTrigger className="w-44 bg-card"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Entrenamientos y partidos</SelectItem>
              {SESSION_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <RangeSelect value={days} onChange={setDays} />
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <section className="border-l-4 border-primary bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2 border-b border-border pb-3">
            <Sun className="size-5 text-primary" />
            <div>
              <p className="font-display text-lg font-bold uppercase leading-none">Pre-entreno</p>
              <p className="mt-1 text-xs text-muted-foreground">Respuestas de wellness de hoy</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Kpi label="Respuestas" value={`${view.todayW.length}/${view.ps.length}`} sub="jugadores" className="border-0 bg-muted/60" />
            <Kpi label="Wellness medio" value={avgToday != null ? `${Math.round(avgToday)}%` : "—"} tone={avgToday == null ? undefined : avgToday >= 70 ? "ok" : avgToday >= 60 ? "warn" : "bad"} className="border-0 bg-muted/60" />
          </div>
        </section>

        <section className="border-l-4 border-accent bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2 border-b border-border pb-3">
            <Flag className="size-5 text-accent" />
            <div>
              <p className="font-display text-lg font-bold uppercase leading-none">Post-entreno</p>
              <p className="mt-1 text-xs text-muted-foreground">Respuestas de los últimos {days} días</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Kpi label="Respuestas" value={view.sR.length} sub="sesiones" className="border-0 bg-muted/60" />
            <Kpi label="RPE medio" value={avgRpe != null ? avgRpe.toFixed(1) : "—"} sub={`${alerts} alertas activas`} tone={alerts ? "bad" : "ok"} className="border-0 bg-muted/60" />
          </div>
        </section>
      </div>

      {isLoading ? <p className="text-muted-foreground">Cargando datos…</p> : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Wellness medio del plantel (%)">
              <ResponsiveContainer width="100%" height={240}>
                <ComposedChart data={view.daily}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Line type="monotone" dataKey="wellness" name="Wellness" stroke="var(--chart-1)" strokeWidth={3} connectNulls dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </Panel>
            <Panel title="Carga media por sesión (sRPE) y RPE">
              <ResponsiveContainer width="100%" height={240}>
                <ComposedChart data={view.daily}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                  <YAxis yAxisId="l" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                  <YAxis yAxisId="r" orientation="right" domain={[0, 10]} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar yAxisId="l" dataKey="carga" name="Carga (UA)" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="r" type="monotone" dataKey="rpe" name="RPE" stroke="var(--chart-1)" strokeWidth={2} connectNulls />
                </ComposedChart>
              </ResponsiveContainer>
            </Panel>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
            <Panel title="Jugadores (ordenado por peor wellness)">
              <div className="max-h-[520px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Jugador</TableHead>
                      <TableHead>Wellness</TableHead>
                      <TableHead>Últ. RPE</TableHead>
                      <TableHead>Carga 7d</TableHead>
                      <TableHead>ACWR</TableHead>
                      <TableHead>Dolor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {view.rows.map(({ p, lastW, lastS, a, painCount, todayW }) => {
                      const pct = lastW ? wellnessPct(lastW) : null;
                      const st = acwrStatus(a.ratio);
                      return (
                        <TableRow key={p.id}>
                          <TableCell>
                            <Link to="/jugador/$id" params={{ id: p.id }} className="font-medium hover:text-accent">{p.full_name}</Link>
                            <div className="text-xs text-muted-foreground">{p.team}</div>
                          </TableCell>
                          <TableCell>
                            {pct == null ? <StatusPill status="none">—</StatusPill> :
                              <StatusPill status={pct >= 70 ? "ok" : pct >= 60 ? "warn" : "bad"}>{pct}%{!todayW && " ·" + shortDate(lastW!.entry_date)}</StatusPill>}
                          </TableCell>
                          <TableCell>{lastS?.rpe ?? "—"}</TableCell>
                          <TableCell>{a.acute || "—"}</TableCell>
                          <TableCell><StatusPill status={st}>{a.ratio ? a.ratio.toFixed(2) : "—"}</StatusPill></TableCell>
                          <TableCell>{painCount ? <StatusPill status="warn">{painCount} zonas</StatusPill> : "—"}</TableCell>
                        </TableRow>
                      );
                    })}
                    {!view.rows.length && (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Cargá jugadores en “Plantel” para empezar.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </Panel>
            <Panel title="Mapa de dolor del plantel">
              <BodyMap heat={view.heat} />
              <div className="mt-3"><PainLegend heat /></div>
              <ul className="mt-3 space-y-1 text-sm">
                {view.topZones.map(([z, n]) => (
                  <li key={z} className="flex justify-between"><span>{zoneLabel(z)}</span><span className="font-semibold">{n}</span></li>
                ))}
                {!view.topZones.length && <li className="text-muted-foreground">Sin dolores reportados.</li>}
              </ul>
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}
