import type { Ref } from "react";
import { eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, parseISO, startOfMonth, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { BodyMap, PainLegend, zoneLabel } from "@/components/BodyMap";
import { ClubBrand } from "@/components/ClubBrand";
import { avg, painHeat, wellnessPct, type SessionEntry, type WellnessEntry } from "@/lib/metrics";
import type { Player } from "@/components/PlayerPicker";

interface DayData {
  wellness: WellnessEntry[];
  sessions: SessionEntry[];
}

function groupByDay(wellness: WellnessEntry[], sessions: SessionEntry[]) {
  const map = new Map<string, DayData>();
  const slot = (date: string) => {
    const existing = map.get(date);
    if (existing) return existing;
    const created: DayData = { wellness: [], sessions: [] };
    map.set(date, created);
    return created;
  };
  for (const entry of wellness) slot(entry.entry_date).wellness.push(entry);
  for (const entry of sessions) slot(entry.entry_date).sessions.push(entry);
  return map;
}

const maxPain = (day: DayData) =>
  Math.max(0, ...[...day.wellness, ...day.sessions].flatMap((entry) => Object.values(entry.pain_zones ?? {}).map(Number)));

const wellnessTone = (value: number | null) =>
  value == null ? "var(--muted)" : value >= 70 ? "var(--success)" : value >= 60 ? "var(--warning)" : "var(--destructive)";

function Tile({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section data-report-block className={`rounded-md border border-border bg-card p-4 ${className}`}>
      <h3 className="mb-3 font-display text-lg font-bold uppercase text-primary">{title}</h3>
      {children}
    </section>
  );
}

function MosaicHeader({ player, month }: { player: Player; month: string }) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-primary pb-5">
      <div>
        <p className="font-display text-sm font-semibold uppercase tracking-widest text-primary">Informe mensual · Ficha individual</p>
        <h2 className="mt-1 break-words font-display text-3xl font-bold uppercase leading-none">{player.full_name}</h2>
        <p className="mt-2 text-sm capitalize text-muted-foreground">{format(parseISO(`${month}-01`), "MMMM 'de' yyyy", { locale: es })}</p>
      </div>
      <ClubBrand compact className="text-foreground" />
    </header>
  );
}

function MosaicFooter() {
  return (
    <footer className="mt-7 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-[11px] text-muted-foreground">
      <span>CBMM Rugby · Control de cargas</span>
      <span>Datos subjetivos declarados por los jugadores</span>
    </footer>
  );
}

function WellnessBars({ days, byDay }: { days: Date[]; byDay: Map<string, DayData> }) {
  const width = 640;
  const height = 200;
  const top = 22;
  const bottom = 24;
  const chartH = height - top - bottom;
  const gap = 6;
  const barW = Math.max(6, (width - gap * (days.length - 1)) / days.length);
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Wellness diario del mes en barras verticales">
      {[0, 50, 100].map((tick) => (
        <g key={tick}>
          <line x1="0" x2={width} y1={top + chartH - (tick / 100) * chartH} y2={top + chartH - (tick / 100) * chartH} stroke="var(--border)" strokeWidth="1" />
          <text x="2" y={top + chartH - (tick / 100) * chartH - 3} fontSize="9" fill="var(--muted-foreground)">{tick}%</text>
        </g>
      ))}
      {days.map((day, index) => {
        const key = format(day, "yyyy-MM-dd");
        const entries = byDay.get(key)?.wellness ?? [];
        const value = entries.length ? avg(entries.map(wellnessPct)) : null;
        const x = index * (barW + gap);
        const barH = value == null ? 0 : (value / 100) * chartH;
        return (
          <g key={key}>
            {value != null && (
              <>
                <rect x={x} y={top + chartH - barH} width={barW} height={barH} rx="2" fill={wellnessTone(value)} />
                <text x={x + barW / 2} y={top + chartH - barH - 3} textAnchor="middle" fontSize="8.5" fontWeight="600" fill="var(--foreground)">{Math.round(value)}</text>
              </>
            )}
            <text x={x + barW / 2} y={height - 8} textAnchor="middle" fontSize="8.5" fill="var(--muted-foreground)">{format(day, "d")}</text>
          </g>
        );
      })}
    </svg>
  );
}

function LoadBars({ days, byDay }: { days: Date[]; byDay: Map<string, DayData> }) {
  const width = 640;
  const height = 200;
  const top = 24;
  const bottom = 24;
  const chartH = height - top - bottom;
  const gap = 6;
  const barW = Math.max(6, (width - gap * (days.length - 1)) / days.length);
  const maxLoad = Math.max(1, ...days.map((day) => (byDay.get(format(day, "yyyy-MM-dd"))?.sessions ?? []).reduce((sum, s) => sum + s.load, 0)));
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Carga diaria del mes en barras verticales">
      {days.map((day, index) => {
        const key = format(day, "yyyy-MM-dd");
        const sessions = byDay.get(key)?.sessions ?? [];
        const load = sessions.reduce((sum, s) => sum + s.load, 0);
        const rpe = sessions.length ? Math.max(...sessions.map((s) => s.rpe)) : null;
        const x = index * (barW + gap);
        const barH = (load / maxLoad) * chartH;
        return (
          <g key={key}>
            {load > 0 && (
              <>
                <rect x={x} y={top + chartH - barH} width={barW} height={barH} rx="2" fill={rpe != null && rpe >= 8 ? "var(--destructive)" : "var(--primary)"} />
                <text x={x + barW / 2} y={top + chartH - barH - 12} textAnchor="middle" fontSize="8.5" fontWeight="600" fill="var(--foreground)">{load}</text>
                <text x={x + barW / 2} y={top + chartH - barH - 3} textAnchor="middle" fontSize="8" fill="var(--muted-foreground)">RPE {rpe}</text>
              </>
            )}
            <text x={x + barW / 2} y={height - 8} textAnchor="middle" fontSize="8.5" fill="var(--muted-foreground)">{format(day, "d")}</text>
          </g>
        );
      })}
    </svg>
  );
}

function MonthCalendar({ month, byDay }: { month: string; byDay: Map<string, DayData> }) {
  const first = startOfMonth(parseISO(`${month}-01`));
  const days = eachDayOfInterval({ start: startOfWeek(first, { weekStartsOn: 1 }), end: endOfWeek(endOfMonth(first), { weekStartsOn: 1 }) });
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  const cellStyle = (day: Date): { className: string; note: string } => {
    const data = byDay.get(format(day, "yyyy-MM-dd"));
    if (!data || (!data.wellness.length && !data.sessions.length)) return { className: "border-border bg-muted/40 text-muted-foreground", note: "" };
    const pain = maxPain(data);
    const highRpe = data.sessions.some((s) => s.rpe >= 8);
    if (pain >= 3 || highRpe) return { className: "border-destructive bg-destructive/15", note: pain >= 3 ? "Dolor intenso" : "RPE ≥8" };
    if (pain === 2) return { className: "border-pain-2 bg-pain-2/25", note: "Dolor moderado" };
    if (pain === 1) return { className: "border-pain-1 bg-pain-1/30", note: "Dolor leve" };
    return { className: "border-success bg-success/15", note: "Sin dolor" };
  };
  return (
    <div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase text-muted-foreground">
        {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => <span key={d}>{d}</span>)}
      </div>
      <div className="mt-1 space-y-1">
        {weeks.map((week, i) => (
          <div key={i} className="grid grid-cols-7 gap-1">
            {week.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const data = byDay.get(key);
              const { className, note } = cellStyle(day);
              const wValue = data?.wellness.length ? avg(data.wellness.map(wellnessPct)) : null;
              const load = data?.sessions.reduce((sum, s) => sum + s.load, 0) ?? 0;
              return (
                <div key={key} className={`min-h-16 rounded border p-1.5 text-xs ${className} ${isSameMonth(day, first) ? "" : "opacity-35"}`}>
                  <strong className="block">{format(day, "d")}</strong>
                  {note && <span className="block leading-tight">{note}</span>}
                  {wValue != null && <span className="block leading-tight">Wellness {Math.round(wValue)}%</span>}
                  {load > 0 && <span className="block leading-tight">{load} UA</span>}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <li><span className="mr-1 inline-block size-2.5 rounded-sm bg-success align-middle" /> Reportó sin dolor</li>
        <li><span className="mr-1 inline-block size-2.5 rounded-sm bg-pain-1 align-middle" /> Dolor leve</li>
        <li><span className="mr-1 inline-block size-2.5 rounded-sm bg-pain-2 align-middle" /> Dolor moderado</li>
        <li><span className="mr-1 inline-block size-2.5 rounded-sm bg-destructive align-middle" /> Dolor intenso o RPE ≥8</li>
        <li><span className="mr-1 inline-block size-2.5 rounded-sm bg-muted align-middle" /> Sin respuesta</li>
      </ul>
    </div>
  );
}

export function MonthlyMosaic({ ref, month, player, wellness, sessions, loading }: {
  ref: Ref<HTMLDivElement>;
  month: string;
  player: Player | undefined;
  wellness: WellnessEntry[];
  sessions: SessionEntry[];
  loading: boolean;
}) {
  if (!player) {
    return <div ref={ref} className="mx-auto mt-4 max-w-[920px] bg-card p-12 text-center text-muted-foreground">Elegí un jugador para crear su informe mensual.</div>;
  }
  const playerWellness = wellness.filter((entry) => entry.player_id === player.id);
  const playerSessions = sessions.filter((entry) => entry.player_id === player.id);
  const byDay = groupByDay(playerWellness, playerSessions);
  const first = startOfMonth(parseISO(`${month}-01`));
  const days = eachDayOfInterval({ start: first, end: endOfMonth(first) });
  const heat = painHeat([...playerWellness, ...playerSessions]);
  const heatEntries = Object.entries(heat).sort((a, b) => b[1] - a[1]);
  const wellnessAvg = avg(playerWellness.map(wellnessPct));
  const rpeAvg = avg(playerSessions.map((s) => s.rpe));
  const totalLoad = playerSessions.reduce((sum, s) => sum + s.load, 0);
  const totalMin = playerSessions.reduce((sum, s) => sum + s.duration_min, 0);
  const daysWithPain = days.filter((day) => {
    const data = byDay.get(format(day, "yyyy-MM-dd"));
    return data ? maxPain(data) > 0 : false;
  }).length;

  return (
    <div ref={ref} className="report-sheet mx-auto mt-4 w-full max-w-[920px] bg-card text-card-foreground">
      {loading ? <p className="p-12">Cargando datos…</p> : <>
        <div data-report-page className="bg-card p-6 sm:p-8">
          <MosaicHeader player={player} month={month} />
          <div className="report-metrics my-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              { label: "Respuestas pre", value: String(playerWellness.length) },
              { label: "Respuestas post", value: String(playerSessions.length) },
              { label: "Wellness medio", value: wellnessAvg == null ? "—" : `${Math.round(wellnessAvg)}%` },
              { label: "RPE medio", value: rpeAvg?.toFixed(1) ?? "—" },
              { label: "Carga total", value: `${totalLoad} UA` },
              { label: "Minutos", value: String(totalMin) },
            ].map((metric) => (
              <div key={metric.label} data-report-block className="border-t-4 border-border bg-muted/60 p-4">
                <p className="text-xs font-semibold uppercase text-muted-foreground">{metric.label}</p>
                <p className="mt-1 font-display text-3xl font-bold leading-none">{metric.value}</p>
              </div>
            ))}
          </div>
          <Tile title="Mapa de dolor del mes">
            <div className="report-columns grid items-start gap-6">
              <div>
                <BodyMap heat={heat} />
                <div className="mt-3 flex justify-center"><PainLegend heat /></div>
                <p className="mt-2 text-center text-xs text-muted-foreground">Color = cantidad de respuestas con dolor por zona</p>
              </div>
              <div className="min-w-0">
                {heatEntries.length ? (
                  <ul className="divide-y divide-border text-sm">
                    {heatEntries.map(([zone, count]) => (
                      <li key={zone} className="flex justify-between gap-3 py-2"><span>{zoneLabel(zone)}</span><strong>{count} {count === 1 ? "vez" : "veces"}</strong></li>
                    ))}
                  </ul>
                ) : <p className="py-4 text-sm text-muted-foreground">Sin zonas de dolor reportadas en el mes.</p>}
                <p className="mt-3 text-xs text-muted-foreground">{daysWithPain} {daysWithPain === 1 ? "día" : "días"} con dolor declarado en el mes.</p>
              </div>
            </div>
          </Tile>
          <MosaicFooter />
        </div>
        <div data-report-page className="bg-card p-6 sm:p-8">
          <MosaicHeader player={player} month={month} />
          <div className="mt-6 space-y-5">
            <Tile title="Wellness por día">
              {playerWellness.length ? <WellnessBars days={days} byDay={byDay} /> : <p className="text-sm text-muted-foreground">Sin respuestas de wellness en el mes.</p>}
              <p className="mt-2 text-xs text-muted-foreground">Verde ≥70% · Amarillo 60–69% · Rojo &lt;60%</p>
            </Tile>
            <Tile title="Carga por día (UA)">
              {playerSessions.length ? <LoadBars days={days} byDay={byDay} /> : <p className="text-sm text-muted-foreground">Sin sesiones cargadas en el mes.</p>}
              <p className="mt-2 text-xs text-muted-foreground">Sobre cada barra: carga en UA y RPE del día. Rojo = RPE ≥8.</p>
            </Tile>
          </div>
          <MosaicFooter />
        </div>
        <div data-report-page className="bg-card p-6 sm:p-8">
          <MosaicHeader player={player} month={month} />
          <div className="mt-6">
            <Tile title="Calendario del mes">
              <MonthCalendar month={month} byDay={byDay} />
            </Tile>
          </div>
          <MosaicFooter />
        </div>
      </>}
    </div>
  );
}
