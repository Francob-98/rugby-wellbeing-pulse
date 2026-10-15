import { BodyMap, PainLegend, zoneLabel } from "@/components/BodyMap";
import { avg, painHeat, wellnessPct, type WellnessEntry, type SessionEntry } from "@/lib/metrics";
import type { Player } from "@/components/PlayerPicker";

export const wellnessStatus = (value: number | null) => value == null
  ? { tone: "none", label: "Sin respuestas" }
  : value < 60 ? { tone: "bad", label: "Revisar con el staff" }
  : value < 70 ? { tone: "warn", label: "Prestar atención" }
  : { tone: "good", label: "Buen bienestar declarado" };

export function TrafficLight({ value }: { value: number | null }) {
  const status = wellnessStatus(value);
  return <div className="flex items-center gap-3" data-tone={status.tone}>
    <div className="report-traffic flex shrink-0 gap-2 rounded-md bg-muted p-2" aria-hidden="true">
      <span className={`size-5 rounded-full ${status.tone === "bad" ? "bg-destructive" : "bg-destructive/15"}`} />
      <span className={`size-5 rounded-full ${status.tone === "warn" ? "bg-warning" : "bg-warning/15"}`} />
      <span className={`size-5 rounded-full ${status.tone === "good" ? "bg-success" : "bg-success/15"}`} />
    </div>
    <strong className="text-sm">{status.label}</strong>
  </div>;
}

export function WellnessGauge({ value }: { value: number | null }) {
  const angle = Math.PI * (1 - (value ?? 0) / 100);
  const x = 150 + 88 * Math.cos(angle);
  const y = 140 - 88 * Math.sin(angle);
  return <div className="text-center">
    <svg viewBox="0 0 300 205" className="mx-auto w-full max-w-80" role="img" aria-label={`Wellness general: ${value == null ? "sin respuestas" : `${Math.round(value)} por ciento`}`}>
      <path d="M 30 140 A 120 120 0 0 1 270 140" fill="none" strokeWidth="22" className="stroke-muted" />
      <path d="M 30 140 A 120 120 0 0 1 187.08 25.87" fill="none" strokeWidth="22" className="stroke-destructive" />
      <path d="M 187.08 25.87 A 120 120 0 0 1 220.53 42.92" fill="none" strokeWidth="22" className="stroke-warning" />
      <path d="M 220.53 42.92 A 120 120 0 0 1 270 140" fill="none" strokeWidth="22" className="stroke-success" />
      {value != null && <><line x1="150" y1="140" x2={x} y2={y} strokeWidth="4" className="stroke-foreground" /><circle cx="150" cy="140" r="6" className="fill-foreground" /></>}
      <text x="150" y="192" textAnchor="middle" className="fill-foreground font-display text-4xl font-bold">{value == null ? "—" : `${Math.round(value)}%`}</text>
      <text x="30" y="173" textAnchor="middle" className="fill-muted-foreground text-xs">0%</text>
      <text x="270" y="173" textAnchor="middle" className="fill-muted-foreground text-xs">100%</text>
    </svg>
    <p className="text-sm font-semibold">Wellness general</p>
    <p className="mt-1 text-xs text-muted-foreground">Rojo &lt;60% · Amarillo 60–69% · Verde ≥70%</p>
  </div>;
}

export function ReadableBar({ label, value, max = 5, suffix = "/5", effort = false }: { label: string; value: number | null; max?: number; suffix?: string; effort?: boolean }) {
  const tone = value == null ? "none" : effort ? value >= 8 ? "bad" : value >= 5 ? "warn" : "good" : value < 3 ? "bad" : value < 3.5 ? "warn" : "good";
  return <div className="space-y-1.5" data-report-block>
    <div className="flex justify-between gap-3 text-sm"><span>{label}</span><strong className="shrink-0">{value == null ? "—" : `${value.toFixed(1)}${suffix}`}</strong></div>
    <svg viewBox="0 0 400 14" preserveAspectRatio="none" className="h-3 w-full" role="img" aria-label={`${label}: ${value == null ? "sin respuestas" : `${value.toFixed(1)}${suffix}`}`}>
      <rect width="400" height="14" rx="3" className="fill-muted" />
      <rect width={400 * Math.min(1, Math.max(0, (value ?? 0) / max))} height="14" rx="3" className={tone === "bad" ? "fill-destructive" : tone === "warn" ? "fill-warning" : "fill-success"} />
    </svg>
  </div>;
}

export function WellnessOverview({ entries }: { entries: WellnessEntry[] }) {
  const value = avg(entries.map(wellnessPct));
  return <>
    <TrafficLight value={value} />
    <div className="report-columns mt-5 grid items-center gap-6">
      <WellnessGauge value={value} />
      <div className="space-y-4">
        <ReadableBar label="Calidad del sueño" value={avg(entries.map(e => e.sleep_quality))} />
        <ReadableBar label="Frescura muscular" value={avg(entries.map(e => e.fatigue))} />
        <ReadableBar label="Ausencia de dolor muscular" value={avg(entries.map(e => e.soreness))} />
        <ReadableBar label="Calma / estrés" value={avg(entries.map(e => e.stress))} />
        <ReadableBar label="Ánimo" value={avg(entries.map(e => e.mood))} />
        <p className="text-xs text-muted-foreground">5 = mejor estado · Sueño medio: {avg(entries.map(e => e.sleep_hours))?.toFixed(1) ?? "—"} h</p>
      </div>
    </div>
    <p className="mt-5 border-l-2 border-border pl-3 text-xs text-muted-foreground">Promedios de respuestas, no autorización médica para entrenar. Un promedio favorable no descarta molestias individuales.</p>
  </>;
}

export function ReportPain({ entries, players }: { entries: (WellnessEntry | SessionEntry)[]; players: Player[] }) {
  const heat = painHeat(entries);
  const affected = entries.filter(e => Object.keys(e.pain_zones ?? {}).length || ("soreness" in e && e.soreness < 5));
  return <div className="report-columns mt-4 grid items-start gap-6">
    <div><BodyMap heat={heat} /><div className="mt-3 flex justify-center"><PainLegend heat /></div><p className="mt-2 text-center text-xs text-muted-foreground">Color = cantidad de respuestas con dolor por zona</p></div>
    <div className="min-w-0">
      <h4 className="mb-2 text-sm font-semibold">Quién presenta molestias</h4>
      {affected.length ? <ul className="divide-y divide-border">{affected.map(entry => <li key={entry.id} className="py-3 text-sm" data-report-block>
        <strong className="block break-words">{players.find(p => p.id === entry.player_id)?.full_name ?? "Jugador no disponible"}</strong>
        <span className="text-xs text-muted-foreground">Respuesta {new Date(entry.created_at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}</span>
        <p className="mt-1 break-words text-destructive">{Object.entries(entry.pain_zones ?? {}).map(([zone, level]) => `${zoneLabel(zone)} · ${["", "leve", "moderado", "intenso"][level] ?? level}`).join("; ") || "Dolor muscular declarado, sin zona marcada."}</p>
      </li>)}</ul> : <p className="py-4 text-sm text-muted-foreground">Sin molestias declaradas.</p>}
    </div>
  </div>;
}

export function PostResponse({ entry, player }: { entry: SessionEntry; player: Player | undefined }) {
  return <div className="border-t border-border py-4" data-report-block>
    <ReadableBar label={player?.full_name ?? "Jugador no disponible"} value={entry.rpe} max={10} suffix="/10" effort />
    <p className="mt-2 text-xs text-muted-foreground">{entry.duration_min} min · {entry.session_type ?? "Entrenamiento"} · {entry.team} · {entry.load} UA · {new Date(entry.created_at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}</p>
    {entry.rpe >= 8 && <p className="mt-1 text-sm font-semibold text-destructive">PSE ≥8: requiere seguimiento</p>}
    <p className="mt-2 whitespace-pre-wrap break-words text-sm"><strong>Comentario: </strong>{entry.comments?.trim() || "Sin comentarios."}</p>
  </div>;
}