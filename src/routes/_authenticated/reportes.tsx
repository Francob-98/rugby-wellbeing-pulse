import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState, type Ref } from "react";
import { exportReport } from "@/lib/report-export";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarDays, Download, FileText, UserRound, Users } from "lucide-react";
import { toast } from "sonner";
import { BodyMap, PainLegend, zoneLabel } from "@/components/BodyMap";
import { ClubBrand } from "@/components/ClubBrand";
import { PostResponse, ReadableBar, ReportPain, TrafficLight, WellnessOverview } from "@/components/staff/ReportVisuals";
import { PlayerPicker, usePlayers, type Player } from "@/components/PlayerPicker";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TEAMS, PLAYER_LINES } from "@/lib/constants";
import { useReportEntries } from "@/lib/staff-data";
import { avg, today, wellnessPct, type SessionEntry, type WellnessEntry } from "@/lib/metrics";

export const Route = createFileRoute("/_authenticated/reportes")({
  head: () => ({
    meta: [
      { title: "Informes para entrenadores · CBMM Rugby" },
      { name: "description", content: "Informes visuales diarios del plantel y de cada jugador, listos para compartir." },
      { property: "og:title", content: "Informes para entrenadores · CBMM Rugby" },
      { property: "og:description", content: "Resumen visual diario de wellness, carga y dolor del CBMM." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReportsPage,
});

type ReportMode = "team" | "player";

function ReportsPage() {
  const [mode, setMode] = useState<ReportMode>("team");
  const [date, setDate] = useState(today());
  const [dateToRaw, setDateTo] = useState(today());
  const [team, setTeam] = useState("all");
  const [playerId, setPlayerId] = useState("");
  const [phase, setPhase] = useState("all");
  const [line, setLine] = useState("all");
  const [exporting, setExporting] = useState<"png" | "pdf" | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);
  const dateTo = mode === "player" && dateToRaw > date ? dateToRaw : date;
  const { data: players = [], isLoading: loadingPlayers } = usePlayers();
  const { data, isLoading: loadingEntries } = useReportEntries(date, dateTo);
  const inRange = (d: string) => d >= date && d <= dateTo;

  const dayWellness = useMemo(
    () => phase === "post" ? [] : (data?.wellness ?? []).filter((entry) => inRange(entry.entry_date) && (line === "all" || entry.player_line === line)),
    [data, date, dateTo, phase, line],
  );
  const daySessions = useMemo(
    () => phase === "pre" ? [] : (data?.sessions ?? []).filter((entry) => inRange(entry.entry_date) && (line === "all" || entry.player_line === line)),
    [data, date, dateTo, phase, line],
  );
  const selectedPlayer = players.find((player) => player.id === playerId);

  const download = async (format: "png" | "pdf") => {
    const node = reportRef.current;
    if (!node) return;
    setExporting(format);
    try {
      const subject = mode === "team" ? (team === "all" ? "plantel" : team) : selectedPlayer?.full_name ?? "jugador";
      await exportReport(node, format, `CBMM-${subject.replaceAll(" ", "-")}-${date}${dateTo !== date ? `_a_${dateTo}` : ""}-${phase}${line === "all" ? "" : `-${line}`}`);
      toast.success(`${format.toUpperCase()} descargado`);
    } catch {
      toast.error("No se pudo crear el informe. Intentá nuevamente.");
    } finally {
      setExporting(null);
    }
  };

  const loading = loadingPlayers || loadingEntries;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-display text-sm uppercase tracking-widest text-accent">Listo para compartir</p>
          <h1 className="font-display text-4xl font-bold uppercase">Informes visuales</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => download("png")} disabled={loading || Boolean(exporting) || (mode === "player" && !selectedPlayer)}>
            <Download /> {exporting === "png" ? "Creando PNG…" : "Descargar PNG"}
          </Button>
          <Button onClick={() => download("pdf")} disabled={loading || Boolean(exporting) || (mode === "player" && !selectedPlayer)}>
            <FileText /> {exporting === "pdf" ? "Creando PDF…" : "Descargar PDF"}
          </Button>
        </div>
      </div>

      <Tabs value={mode} onValueChange={(value) => setMode(value as ReportMode)}>
        <TabsList className="h-auto w-full justify-start rounded-md sm:w-auto">
          <TabsTrigger value="team" className="gap-2"><Users /> Resumen general</TabsTrigger>
          <TabsTrigger value="player" className="gap-2"><UserRound /> Ficha individual</TabsTrigger>
        </TabsList>

        <div className="mt-4 flex flex-wrap gap-2 rounded-md border border-border bg-card p-3">
          <Select value={phase} onValueChange={setPhase}>
            <SelectTrigger className="min-w-52 flex-1 bg-background" aria-label="Momento del informe"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Pre y post-entreno</SelectItem>
              <SelectItem value="pre">Antes · Pre-entreno</SelectItem>
              <SelectItem value="post">Después · Post-entreno</SelectItem>
            </SelectContent>
          </Select>
          <Select value={line} onValueChange={setLine}>
            <SelectTrigger className="min-w-44 flex-1 bg-background" aria-label="Forwards o backs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Forwards y backs</SelectItem>
              {PLAYER_LINES.map((l) => <SelectItem key={l} value={l}>Solo {l.toLowerCase()}</SelectItem>)}
            </SelectContent>
          </Select>
          <label className="flex min-w-48 flex-1 items-center gap-2 rounded-md border border-input bg-background px-3">
            <CalendarDays className="size-4 text-muted-foreground" />
            {mode === "player" ? <span className="text-xs text-muted-foreground">Desde</span> : <span className="sr-only">Fecha del informe</span>}
            <input type="date" value={date} max={today()} onChange={(event) => setDate(event.target.value)} className="h-10 w-full bg-transparent text-sm outline-none" />
          </label>
          {mode === "player" && (
            <label className="flex min-w-48 flex-1 items-center gap-2 rounded-md border border-input bg-background px-3">
              <CalendarDays className="size-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Hasta</span>
              <input type="date" value={dateTo} min={date} max={today()} onChange={(event) => setDateTo(event.target.value)} className="h-10 w-full bg-transparent text-sm outline-none" />
            </label>
          )}
          {mode === "team" ? (
            <Select value={team} onValueChange={setTeam}>
              <SelectTrigger className="min-w-52 flex-1 bg-background"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todo el plantel</SelectItem>
                {TEAMS.map((name) => <SelectItem key={name} value={name}>{name}</SelectItem>)}
              </SelectContent>
            </Select>
          ) : (
            <div className="min-w-60 flex-1"><PlayerPicker value={playerId} onChange={setPlayerId} onlyActive={false} /></div>
          )}
        </div>

        <TabsContent value="team">
          <TeamReport ref={reportRef} date={date} team={team} phase={phase} players={players} wellness={dayWellness} sessions={daySessions} loading={loading} />
        </TabsContent>
        <TabsContent value="player">
          <PlayerReport ref={reportRef} date={date} dateTo={dateTo} player={selectedPlayer} wellness={dayWellness} sessions={daySessions} loading={loading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ReportHeader({ title, date, eyebrow }: { title: string; date: string; eyebrow: string }) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-primary pb-5">
      <div>
        <p className="font-display text-sm font-semibold uppercase tracking-widest text-primary">{eyebrow}</p>
        <h2 className="mt-1 break-words font-display text-3xl font-bold uppercase leading-none">{title}</h2>
        <p className="mt-2 text-sm capitalize text-muted-foreground">{format(parseISO(date), "EEEE d 'de' MMMM 'de' yyyy", { locale: es })}</p>
      </div>
      <ClubBrand compact className="text-foreground" />
    </header>
  );
}

function Metric({ label, value, note, tone = "default" }: { label: string; value: string; note?: string; tone?: "default" | "good" | "warn" | "bad" }) {
  return (
    <div className="border-t-4 border-border bg-muted/60 p-4 data-[tone=good]:border-success data-[tone=warn]:border-warning data-[tone=bad]:border-destructive" data-tone={tone}>
      <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-4xl font-bold leading-none">{value}</p>
      {note && <p className="mt-2 text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}

function ScoreBar({ label, value, inverse = false }: { label: string; value: number | null; inverse?: boolean }) {
  const display = value == null ? "—" : value.toFixed(1);
  const healthy = value == null ? false : inverse ? value <= 2 : value >= 4;
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm"><span>{label}</span><strong>{display}</strong></div>
      <progress value={value ?? 0} max={5} className={healthy ? "h-2 w-full accent-success" : "h-2 w-full accent-primary"} />
    </div>
  );
}

const TeamReport = function TeamReport({ ref, date, team, phase, players, wellness, sessions, loading }: {
  ref: Ref<HTMLDivElement>;
  date: string;
  team: string;
  phase: string;
  players: Player[];
  wellness: WellnessEntry[];
  sessions: SessionEntry[];
  loading: boolean;
}) {
  const roster = players.filter((player) => player.active && (team === "all" || player.team === team));
  const rosterIds = new Set(roster.map((player) => player.id));
  const selectedWellness = wellness.filter((entry) => rosterIds.has(entry.player_id));
  const selectedSessions = sessions.filter((entry) => team === "all" || entry.team === team);
  const title = team === "all" ? "Estado del plantel" : team;
  const rpe = avg(selectedSessions.map(entry => entry.rpe));
  const minutes = selectedSessions.reduce((sum, entry) => sum + entry.duration_min, 0);
  const load = selectedSessions.reduce((sum, entry) => sum + entry.load, 0);
  const chunks = <T,>(entries: T[], size: number): T[][] => Array.from({ length: Math.ceil(entries.length / size) }, (_, index) => entries.slice(index * size, (index + 1) * size));
  const preAttention = selectedWellness.filter(entry => wellnessPct(entry) < 70 || entry.soreness < 5 || Object.keys(entry.pain_zones ?? {}).length > 0);
  return (
    <div ref={ref} className="report-sheet mx-auto mt-4 w-full max-w-[920px] bg-card text-card-foreground">
      {loading ? <p className="p-12 text-center">Cargando datos…</p> : <>
        {phase !== "post" && <>
          <div data-report-page className="bg-card p-6 sm:p-8">
            <ReportHeader title={title} date={date} eyebrow="Antes del entrenamiento · Wellness" />
            <p className="my-5 text-sm"><strong>{selectedWellness.length} respuestas</strong> de {new Set(selectedWellness.map(e => e.player_id)).size} jugadores · {roster.length} jugadores activos</p>
            <WellnessOverview entries={selectedWellness} />
            <ReportFooter />
          </div>
          <div data-report-page className="bg-card p-6 sm:p-8">
            <ReportHeader title="Molestias pre-entreno" date={date} eyebrow={title} />
            <ReportPain entries={selectedWellness} players={players} />
            <ReportFooter />
          </div>
          {chunks(preAttention, 8).map((group, index) => <div key={`pre-${index}`} data-report-page className="bg-card p-6 sm:p-8">
            <ReportHeader title="Seguimiento pre-entreno" date={date} eyebrow={`${title} · ${index + 1}`} />
            <ul className="mt-4 divide-y divide-border">{group.map(entry => <li key={entry.id} data-report-block className="space-y-2 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3"><strong>{players.find(p => p.id === entry.player_id)?.full_name ?? "Jugador no disponible"}</strong><strong>{wellnessPct(entry)}%</strong></div>
              <TrafficLight value={wellnessPct(entry)} />
              <p className="text-sm text-muted-foreground">Sueño {entry.sleep_quality}/5 · Frescura {entry.fatigue}/5 · Sin dolor {entry.soreness}/5 · Calma {entry.stress}/5 · Ánimo {entry.mood}/5 · {entry.sleep_hours} h dormidas</p>
              {(entry.soreness < 5 || Object.keys(entry.pain_zones ?? {}).length > 0) && <p className="text-sm font-semibold text-destructive">Dolor muscular informado · revisar molestias aunque el promedio sea favorable.</p>}
            </li>)}</ul><ReportFooter />
          </div>)}
        </>}
        {phase !== "pre" && <>
          <div data-report-page className="bg-card p-6 sm:p-8">
            <ReportHeader title={title} date={date} eyebrow="Después del entrenamiento · PSE y carga" />
            <div className="report-metrics my-6 grid grid-cols-2 gap-3">
              <Metric label="Respuestas post" value={String(selectedSessions.length)} note={`${new Set(selectedSessions.map(e => e.player_id)).size} jugadores`} />
              <Metric label="PSE promedio" value={rpe?.toFixed(1) ?? "—"} note="esfuerzo percibido · sobre 10" tone={rpe != null && rpe >= 8 ? "bad" : "default"} />
              <Metric label="Duración media" value={selectedSessions.length ? String(Math.round(minutes / selectedSessions.length)) : "—"} note="minutos por respuesta" />
              <Metric label="Carga total" value={String(load)} note="UA · PSE × minutos" />
            </div>
            <ReadableBar label="PSE promedio del grupo" value={rpe} max={10} suffix="/10" effort />
            <p className="mt-3 text-xs text-muted-foreground">1–4: menor esfuerzo · 5–7: esfuerzo elevado · 8–10: seguimiento prioritario</p>
            <div className="mt-6 space-y-4">
              <ReadableBar label="Entrenamiento · PSE promedio" value={avg(selectedSessions.filter(e => e.session_type !== "Partido").map(e => e.rpe))} max={10} suffix="/10" effort />
              <ReadableBar label="Partido · PSE promedio" value={avg(selectedSessions.filter(e => e.session_type === "Partido").map(e => e.rpe))} max={10} suffix="/10" effort />
            </div>
            <p className="mt-6 border-l-4 border-destructive pl-3 text-sm"><strong>{new Set(selectedSessions.filter(e => e.rpe >= 8).map(e => e.player_id)).size} jugadores con PSE ≥8</strong> · {new Set(selectedSessions.filter(e => Object.keys(e.pain_zones ?? {}).length).map(e => e.player_id)).size} con zonas de dolor informadas.</p>
            {!selectedSessions.length && <EmptyText text="Sin respuestas post-entreno para esta fecha." />}
            <ReportFooter />
          </div>
          <div data-report-page className="bg-card p-6 sm:p-8">
            <ReportHeader title="Dolor post-entreno" date={date} eyebrow={title} />
            <ReportPain entries={selectedSessions} players={players} />
            <ReportFooter />
          </div>
          {chunks(selectedSessions, 6).map((group, index) => <div key={`post-${index}`} data-report-page className="bg-card p-6 sm:p-8">
            <ReportHeader title="PSE por jugador" date={date} eyebrow={`${title} · Duración y comentarios · ${index + 1}`} />
            <div className="mt-5">{group.map(entry => <PostResponse key={entry.id} entry={entry} player={players.find(p => p.id === entry.player_id)} />)}</div>
            <ReportFooter />
          </div>)}
        </>}
      </>}
    </div>
  );
};

const PlayerReport = function PlayerReport({ ref, date, dateTo, player, wellness, sessions, loading }: {
  ref: Ref<HTMLDivElement>;
  date: string;
  dateTo: string;
  player: Player | undefined;
  wellness: WellnessEntry[];
  sessions: SessionEntry[];
  loading: boolean;
}) {
  const playerWellness = wellness.filter((entry) => entry.player_id === player?.id);
  const playerSessions = sessions.filter((entry) => entry.player_id === player?.id);
  if (!player) return <div ref={ref} className="mx-auto mt-4 max-w-[920px] bg-card p-12 text-center text-muted-foreground">Elegí un jugador para crear su ficha diaria.</div>;
  const allEntries = [
    ...playerWellness.map((entry) => ({ kind: "pre" as const, entry })),
    ...playerSessions.map((entry) => ({ kind: "post" as const, entry })),
  ].sort((a, b) => a.entry.entry_date.localeCompare(b.entry.entry_date) || (a.kind === b.kind ? a.entry.created_at.localeCompare(b.entry.created_at) : a.kind === "pre" ? -1 : 1));
  return (
    <div ref={ref} className="report-sheet mx-auto mt-4 w-full max-w-[920px] bg-card text-card-foreground">
      {loading ? <p className="p-12">Cargando datos…</p> : allEntries.length ? allEntries.map((item, index) => (
        <div key={item.entry.id} data-report-page className="bg-card p-6 sm:p-8">
          <ReportHeader title={player.full_name} date={item.entry.entry_date} eyebrow={`${player.team} · Respuesta ${index + 1} de ${allEntries.length}${dateTo !== date ? ` · Período ${format(parseISO(date), "dd/MM/yyyy")} al ${format(parseISO(dateTo), "dd/MM/yyyy")}` : ""}`} />
          <h3 className="mt-6 font-display text-2xl font-bold uppercase text-primary">{item.kind === "pre" ? "Pre-entreno · Wellness" : "Post-entreno"}</h3>
          <p className="mt-1 text-sm text-muted-foreground">Registrada: {format(parseISO(item.entry.created_at), "dd/MM/yyyy HH:mm")}</p>
          {item.kind === "pre" ? (
            <div className="mt-5 space-y-3">
              <WellnessOverview entries={[item.entry]} />
              <ReportRow label="Horas dormidas" value={`${item.entry.sleep_hours} h`} />
              <ScoreBar label="Calidad del sueño" value={item.entry.sleep_quality} />
              <ScoreBar label="Frescura muscular (5 = fresco)" value={item.entry.fatigue} />
              <ScoreBar label="Dolor muscular (5 = sin dolor)" value={item.entry.soreness} />
              <ScoreBar label="Estrés (5 = relajado)" value={item.entry.stress} />
              <ScoreBar label="Ánimo" value={item.entry.mood} />
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              <ReadableBar label="PSE · Esfuerzo percibido" value={item.entry.rpe} max={10} suffix="/10" effort /><div className="grid grid-cols-2 gap-3"><Metric label="PSE (RPE)" value={`${item.entry.rpe}/10`} tone={item.entry.rpe >= 8 ? "bad" : "default"} /><Metric label="Carga" value={`${item.entry.load} UA`} /></div>
              <ReportRow label="Tipo de sesión" value={item.entry.session_type ?? "Entrenamiento"} />
              <ReportRow label="Equipo" value={item.entry.team} />
              <ReportRow label="Duración" value={`${item.entry.duration_min} min`} />
              <ReportRow label="Fatiga muscular (5 = agotado)" value={`${item.entry.fatigue}/5`} />
              <div className="border-l-2 border-accent pl-3 text-sm"><strong>Comentarios</strong><p className="mt-1 whitespace-pre-wrap break-words">{item.entry.comments || "Sin comentarios."}</p></div>
            </div>
          )}
          {((item.kind === "post" && item.entry.rpe >= 8) || Object.keys(item.entry.pain_zones ?? {}).length > 0 || (item.kind === "pre" && item.entry.soreness < 5)) && <p className="mt-5 border-l-4 border-destructive bg-destructive/10 p-3 font-semibold text-destructive">Requiere seguimiento: {item.kind === "post" && item.entry.rpe >= 8 ? `RPE ${item.entry.rpe} · ` : ""}dolor muscular o esfuerzo alto reportado.</p>}
          <section className="mt-6 border-t border-border pt-4">
            <h3 className="mb-4 font-display text-2xl font-bold uppercase">Mapa de dolor · {item.kind === "pre" ? "Pre-entreno" : "Post-entreno"}</h3>
            <div className="grid items-center gap-5 sm:grid-cols-2">
              <BodyMap value={item.entry.pain_zones ?? {}} />
              <div>
                <div className="flex flex-wrap gap-3 text-xs"><span className="text-pain-1">Leve</span><span className="text-pain-2">Moderado</span><span className="text-pain-3">Intenso</span></div>
                <ul className="mt-4 divide-y divide-border text-sm">{Object.entries(item.entry.pain_zones ?? {}).map(([zone, level]) => <li key={zone} className="flex justify-between gap-3 py-2"><span>{zoneLabel(zone)}</span><strong>{["", "Leve", "Moderado", "Intenso"][level] ?? level}</strong></li>)}</ul>
                {!Object.keys(item.entry.pain_zones ?? {}).length && <p className="mt-3 text-sm text-muted-foreground">Sin zonas de dolor reportadas.</p>}
              </div>
            </div>
          </section>
          <ReportFooter />
        </div>
      )) : <div data-report-page className="bg-card p-8"><ReportHeader title={player.full_name} date={date} eyebrow="Ficha individual" /><p className="py-8">Sin respuestas para esta fecha.</p><ReportFooter /></div>}
    </div>
  );
};

function ReportRow({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-4 border-b border-border pb-2"><span className="text-muted-foreground">{label}</span><strong className="text-right">{value}</strong></div>;
}

function EmptyText({ text }: { text: string }) {
  return <p className="rounded-md border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground">{text}</p>;
}

function ReportFooter() {
  return (
    <footer className="mt-7 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-[11px] text-muted-foreground">
      <span>CBMM Rugby · Control de cargas</span>
      <span>Datos subjetivos declarados por los jugadores</span>
    </footer>
  );
}