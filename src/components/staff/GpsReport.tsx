import { forwardRef } from "react";
import { ClubBrand } from "@/components/ClubBrand";
import type { GpsRow } from "@/lib/gps-extract.functions";
import { gpsMean as mean } from "@/lib/gps-metrics";

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
