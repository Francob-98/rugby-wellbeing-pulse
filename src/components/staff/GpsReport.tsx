import { forwardRef } from "react";
import { ClubBrand } from "@/components/ClubBrand";
import type { GpsRow } from "@/lib/gps-extract.functions";
import { gpsMean as mean, loadLight, rpeLight, type Light } from "@/lib/gps-metrics";

export type GpsReportEntry = GpsRow & { id: string; player_id: string | null; players: { full_name: string } | null };
type Metric = { key: keyof GpsRow; title: string; unit: string; paint: string };
const metrics: Metric[] = [
  { key: "distance_m", title: "Distancia recorrida", unit: "m", paint: "var(--primary)" },
  { key: "m_per_min", title: "Ritmo de trabajo", unit: "m/min", paint: "var(--accent)" },
  { key: "hsd_m", title: "Distancia a alta velocidad", unit: "m", paint: "var(--chart-5)" },
];
const detailMetrics = [
  ["duration_min", "Tiempo", "min"], ["distance_m", "Distancia", "m"], ["m_per_min", "Ritmo", "m/min"],
  ["hsd_m", "Alta velocidad", "m"], ["max_speed", "Vel. máxima", "km/h"], ["sprint_per_min", "Sprints/min", ""],
  ["accel_decel", "Acel. + desacel.", ""], ["max_accel", "Acel. máxima", "m/s²"], ["max_decel", "Desac. máxima", "m/s²"],
] as const;
const fmt = (n: number | null | undefined) => n == null ? "—" : n.toLocaleString("es-AR", { maximumFractionDigits: 1 });
const name = (e: GpsReportEntry) => e.players?.full_name ?? e.gps_name;

function Ranking({ entries, metric, isValid }: { entries: GpsReportEntry[]; metric: Metric; isValid: (e: GpsReportEntry) => boolean }) {
  const sorted = [...entries].sort((a, b) => Number(b[metric.key] ?? 0) - Number(a[metric.key] ?? 0));
  const max = Math.max(1, ...entries.map(e => Number(e[metric.key] ?? 0)));
  return <section data-report-page className="border-t border-border bg-card px-5 py-6 sm:px-8">
    <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
      <h3 className="font-display text-2xl font-bold uppercase">{metric.title}</h3>
      <p className="text-sm text-muted-foreground">Promedio: <b className="text-foreground">{fmt(mean(entries, metric.key))} {metric.unit}</b></p>
    </div>
    <div className="space-y-4">{sorted.map(e => {
      const value = e[metric.key];
      const number = typeof value === "number" ? value : null;
      return <div key={e.id} data-report-block className="space-y-1.5">
        <div className="flex items-baseline justify-between gap-4 text-base"><span className="min-w-0 break-words font-medium capitalize">{name(e)}</span><b className="shrink-0 tabular-nums">{fmt(number)} <span className="text-xs font-normal text-muted-foreground">{metric.unit}</span></b></div>
        <svg role="img" aria-label={`${name(e)}: ${fmt(number)} ${metric.unit}`} viewBox="0 0 800 22" className="h-5 w-full" preserveAspectRatio="none">
          <rect width="800" height="22" rx="3" fill="var(--muted)" />
          <rect width={Math.max(0, ((number ?? 0) / max) * 800)} height="22" rx="3" fill={isValid(e) ? metric.paint : "var(--warning)"} />
        </svg>
      </div>;
    })}</div>
  </section>;
}

type Rpe = Record<string, { rpe: number; load: number | null }>;
const lightPaint: Record<Light, string> = { verde: "var(--success)", amarillo: "var(--warning)", rojo: "var(--destructive)", "sin-dato": "var(--muted)" };
const pct = (v: number | null | undefined, m: number | null) => v == null || !m ? "" : `${v >= m ? "+" : ""}${Math.round((v / m - 1) * 100)}%`;

function Dot({ light, label }: { light: Light; label: string }) {
  return <div className="flex items-center gap-2"><svg viewBox="0 0 20 20" className="h-5 w-5 shrink-0" aria-hidden><circle cx="10" cy="10" r="9" fill={lightPaint[light]} stroke="var(--border)" /></svg><span className="text-sm tabular-nums">{label}</span></div>;
}

function phrase(d: Light, i: Light, p: Light, dist: number | null | undefined, dm: number | null, rpe?: number) {
  if (p === "rojo" && (d === "verde" || (dist ?? 0) < (dm ?? 0))) return "PSE alta con carga habitual o baja: seguimiento";
  if (p === "rojo") return "Carga y PSE elevadas: controlar recuperación";
  if (d === "rojo" && (dist ?? 0) > (dm ?? 0)) return "Carga muy superior al grupo";
  if (d === "rojo" || i === "rojo") return "Carga o intensidad muy por debajo del grupo";
  if (d === "amarillo" || i === "amarillo" || p === "amarillo") return "Observar";
  if (rpe == null) return "Sin PSE informada";
  return "Dentro de lo habitual";
}

function LightsTable({ entries, rpe }: { entries: GpsReportEntry[]; rpe: Rpe }) {
  const dm = mean(entries, "distance_m"), im = mean(entries, "m_per_min");
  const rows = entries.map(e => {
    const r = e.player_id ? rpe[e.player_id]?.rpe : undefined;
    const d = loadLight(e.distance_m, dm), i = loadLight(e.m_per_min, im), p = rpeLight(r);
    const score = [d, i, p].reduce((s, l) => s + (l === "rojo" ? 3 : l === "amarillo" ? 1 : 0), 0);
    return { e, r, d, i, p, score };
  }).sort((a, b) => b.score - a.score);
  return <section data-report-page className="border-t border-border bg-card px-5 py-6 sm:px-8">
    <h3 className="font-display text-2xl font-bold uppercase">Semáforo por jugador</h3>
    <p className="mb-4 mt-1 text-sm text-muted-foreground">Verde: dentro de ±15% del promedio del grupo · Amarillo: hasta ±30% · Rojo: más de ±30%. PSE: 7 amarillo, 8 o más rojo.</p>
    <div className="grid grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,0.8fr))] gap-x-3 border-b border-border pb-2 text-xs font-semibold uppercase text-muted-foreground"><span>Jugador</span><span>Carga</span><span>Intensidad</span><span>PSE</span></div>
    {rows.map(({ e, r, d, i, p }) => <div key={e.id} data-report-block className="border-b border-border py-2.5">
      <div className="grid grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,0.8fr))] items-center gap-x-3">
        <span className="min-w-0 break-words font-medium capitalize">{name(e)}</span>
        <Dot light={d} label={pct(e.distance_m, dm)} /><Dot light={i} label={pct(e.m_per_min, im)} /><Dot light={p} label={r == null ? "—" : `${r}/10`} />
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{phrase(d, i, p, e.distance_m, dm, r)}</p>
    </div>)}
  </section>;
}

function LoadMatrix({ entries, rpe }: { entries: GpsReportEntry[]; rpe: Rpe }) {
  const dm = mean(entries, "distance_m");
  const pts = entries.flatMap(e => {
    const r = e.player_id ? rpe[e.player_id]?.rpe : undefined;
    return r != null && e.distance_m != null && dm ? [{ e, r, x: e.distance_m / dm }] : [];
  });
  const W = 800, H = 480, L = 50, B = 40, xMax = Math.max(1.6, ...pts.map(p => p.x)) ;
  const X = (x: number) => L + (x / xMax) * (W - L - 10), Y = (r: number) => H - B - (r / 10) * (H - B - 10);
  return <section data-report-page className="border-t border-border bg-card px-5 py-6 sm:px-8">
    <h3 className="font-display text-2xl font-bold uppercase">Carga externa vs. PSE</h3>
    <p className="mb-4 mt-1 text-sm text-muted-foreground">Arriba a la izquierda: poca carga y PSE alta (posible fatiga). Abajo a la derecha: mucha carga con PSE baja.</p>
    {pts.length === 0 ? <p className="text-sm text-muted-foreground">No hay PSE informada para cruzar en esta fecha.</p> :
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Matriz de carga externa contra PSE">
        <rect x={L} y={10} width={X(1) - L} height={Y(7) - 10} fill="var(--destructive)" fillOpacity="0.1" />
        <rect x={X(1)} y={Y(4)} width={W - 10 - X(1)} height={H - B - Y(4)} fill="var(--warning)" fillOpacity="0.12" />
        <line x1={X(1)} x2={X(1)} y1={10} y2={H - B} stroke="var(--muted-foreground)" strokeDasharray="6 6" />
        <line x1={L} x2={W - 10} y1={Y(7)} y2={Y(7)} stroke="var(--muted-foreground)" strokeDasharray="6 6" />
        <line x1={L} x2={W - 10} y1={H - B} y2={H - B} stroke="var(--border)" /><line x1={L} x2={L} y1={10} y2={H - B} stroke="var(--border)" />
        {[0, 2, 4, 6, 8, 10].map(r => <text key={r} x={L - 10} y={Y(r) + 5} textAnchor="end" fontSize="14" fill="var(--muted-foreground)">{r}</text>)}
        <text x={X(1)} y={H - 12} textAnchor="middle" fontSize="14" fill="var(--muted-foreground)">Promedio del grupo</text>
        <text x={W - 10} y={H - 12} textAnchor="end" fontSize="14" fill="var(--muted-foreground)">Más distancia →</text>
        <text x={L + 6} y={24} fontSize="14" fill="var(--muted-foreground)">PSE</text>
        {pts.map(({ e, r, x }) => <g key={e.id}>
          <circle cx={X(x)} cy={Y(r)} r="9" fill={lightPaint[rpeLight(r)]} stroke="var(--foreground)" strokeWidth="1.5" />
          <text x={X(x) + 13} y={Y(r) + 5} fontSize="14" fill="var(--foreground)">{name(e).split(" ")[0]}</text>
        </g>)}
      </svg>}
  </section>;
}

export const GpsReport = forwardRef<HTMLDivElement, {
  session: { session_date: string; team: string; session_type: string; description: string | null };
  entries: GpsReportEntry[];
  isValid: (e: GpsReportEntry) => boolean;
  rpe: Record<string, { rpe: number; load: number | null }>;
}>(function GpsReport({ session, entries, isValid, rpe }, ref) {
  const clean = entries.filter(isValid);
  return <div ref={ref} className="report-sheet overflow-hidden border border-border bg-card text-card-foreground">
    <section data-report-page className="bg-card px-5 py-7 sm:px-8">
      <header className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div><p className="mb-2 text-sm font-semibold uppercase text-accent">Carga externa · GPS</p><h2 className="font-display text-4xl font-bold uppercase">Informe de sesión</h2><p className="mt-2 text-base">{session.session_date.split("-").reverse().join("/")} · {session.team} · {session.session_type}</p>{session.description && <p className="mt-1 break-words text-sm text-muted-foreground">{session.description}</p>}</div>
        <ClubBrand compact />
      </header>
      <div className="report-metrics grid grid-cols-2 gap-5 border-t border-border pt-5">
        {[["Jugadores", entries.length, ""], ["Distancia media", mean(entries, "distance_m"), "m"], ["Ritmo medio", mean(entries, "m_per_min"), "m/min"], ["Alta velocidad media", mean(entries, "hsd_m"), "m"]].map(([label, value, unit]) => <div key={String(label)}><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 font-display text-3xl font-bold">{fmt(typeof value === "number" ? value : null)} <span className="text-sm font-normal">{unit}</span></p></div>)}
      </div>
      <p className="mt-5 text-sm text-muted-foreground">Promedios de los valores guardados disponibles; incluyen ceros y no reemplazan datos faltantes.{clean.length !== entries.length && " Barras amarillas: registros pendientes de revisión, incluidos en los promedios."}</p>
    </section>
    <LightsTable entries={entries} rpe={rpe} />
    <LoadMatrix entries={entries} rpe={rpe} />
    {metrics.map(metric => <Ranking key={metric.key} entries={entries} metric={metric} isValid={isValid} />)}
    <section data-report-page className="border-t border-border bg-card px-5 py-6 sm:px-8">
      <h3 className="mb-5 font-display text-2xl font-bold uppercase">Detalle por jugador</h3>
      <div className="space-y-5">{entries.map(e => {
        const perception = e.player_id ? rpe[e.player_id] : undefined;
        return <article key={e.id} data-report-block className="border-b border-border pb-5">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2"><h4 className="text-lg font-semibold capitalize">{name(e)}</h4><span className="text-sm">PSE <b>{perception?.rpe ?? "—"}/10</b> · Carga interna <b>{fmt(perception?.load)}</b></span></div>
          <dl className="grid grid-cols-3 gap-x-4 gap-y-3">{detailMetrics.map(([key, label, unit]) => <div key={key}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="text-sm font-semibold tabular-nums">{fmt(e[key])} <span className="font-normal">{unit}</span></dd></div>)}</dl>
          {!isValid(e) && <p className="mt-3 text-sm text-warning">Valores atípicos: revisar el registro original.</p>}
        </article>;
      })}</div>
      <p className="mt-4 text-xs text-muted-foreground">PSE: esfuerzo percibido informado en el post-entreno del mismo día. «—»: dato no disponible.</p>
    </section>
  </div>;
});