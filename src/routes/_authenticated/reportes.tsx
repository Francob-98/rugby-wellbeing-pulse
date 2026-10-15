import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState, type Ref } from "react";
import { exportReport } from "@/lib/report-export";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Activity, CalendarDays, Download, FileText, Flag, Sun, UserRound, Users } from "lucide-react";
import { toast } from "sonner";
import { BodyMap, PainLegend, zoneLabel } from "@/components/BodyMap";
import { ClubBrand } from "@/components/ClubBrand";
import { PlayerPicker, usePlayers, type Player } from "@/components/PlayerPicker";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TEAMS } from "@/lib/constants";
import { useReportEntries } from "@/lib/staff-data";
import { avg, painHeat, today, wellnessPct, type SessionEntry, type WellnessEntry } from "@/lib/metrics";

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
  const [team, setTeam] = useState("all");
  const [playerId, setPlayerId] = useState("");
  const [phase, setPhase] = useState("all");
  const [exporting, setExporting] = useState<"png" | "pdf" | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);
  const { data: players = [], isLoading: loadingPlayers } = usePlayers();
  const { data, isLoading: loadingEntries } = useReportEntries(date);

  const dayWellness = useMemo(
    () => phase === "post" ? [] : (data?.wellness ?? []).filter((entry) => entry.entry_date === date),
    [data, date, phase],
  );
  const daySessions = useMemo(
    () => phase === "pre" ? [] : (data?.sessions ?? []).filter((entry) => entry.entry_date === date),
    [data, date, phase],
  );
  const selectedPlayer = players.find((player) => player.id === playerId);

  const download = async (format: "png" | "pdf") => {
    const node = reportRef.current;
    if (!node) return;
    setExporting(format);
    try {
      const subject = mode === "team" ? (team === "all" ? "plantel" : team) : selectedPlayer?.full_name ?? "jugador";
      await exportReport(node, format, `CBMM-${subject.replaceAll(" ", "-")}-${date}-${phase}`);
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
          <label className="flex min-w-48 flex-1 items-center gap-2 rounded-md border border-input bg-background px-3">
            <CalendarDays className="size-4 text-muted-foreground" />
            <span className="sr-only">Fecha del informe</span>
            <input type="date" value={date} max={today()} onChange={(event) => setDate(event.target.value)} className="h-10 w-full bg-transparent text-sm outline-none" />
          </label>
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
          <PlayerReport ref={reportRef} date={date} player={selectedPlayer} wellness={dayWellness} sessions={daySessions} loading={loading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ReportHeader({ title, date, eyebrow }: { title: string; date: string; eyebrow: string }) {
  return (
    <header className="flex items-start justify-between gap-6 border-b-2 border-primary pb-5">
      <div>
        <p className="font-display text-sm font-semibold uppercase tracking-widest text-primary">{eyebrow}</p>
        <h2 className="mt-1 font-display text-4xl font-bold uppercase leading-none">{title}</h2>
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
  const reportPlayerIds = new Set([...selectedWellness.map((entry) => entry.player_id), ...selectedSessions.map((entry) => entry.player_id)]);
  const relevantPlayers = players.filter((player) => reportPlayerIds.has(player.id));
  const wellnessAverage = avg(selectedWellness.map(wellnessPct));
  const rpeAverage = avg(selectedSessions.map((entry) => entry.rpe));
  const totalLoad = selectedSessions.reduce((sum, entry) => sum + entry.load, 0);
  const totalMinutes = selectedSessions.reduce((sum, entry) => sum + entry.duration_min, 0);
  const pain = painHeat([...selectedWellness, ...selectedSessions]);
  const topPain = Object.entries(pain).sort((a, b) => b[1] - a[1]).slice(0, 4);
  const flagged = relevantPlayers.map((player) => {
    const playerWellness = selectedWellness.filter((entry) => entry.player_id === player.id);
    const playerSessions = selectedSessions.filter((entry) => entry.player_id === player.id);
    const highRpe = playerSessions.reduce((highest, entry) => Math.max(highest, entry.rpe), 0);
    const prePain = [...new Set(playerWellness.flatMap((entry) => Object.keys(entry.pain_zones ?? {})))];
    const postPain = [...new Set(playerSessions.flatMap((entry) => Object.keys(entry.pain_zones ?? {})))];
    const reasons = [
      highRpe >= 8 ? `RPE ${highRpe}` : null,
      prePain.length ? `dolor pre: ${prePain.map(zoneLabel).join(", ")}` : playerWellness.some((entry) => entry.soreness < 5) ? "dolor muscular pre" : null,
      postPain.length ? `dolor post: ${postPain.map(zoneLabel).join(", ")}` : null,
    ].filter((reason): reason is string => Boolean(reason));
    return { player, reasons };
  }).filter((item) => item.reasons.length);
  const sleep = avg(selectedWellness.map((entry) => entry.sleep_quality));
  const fatigue = avg(selectedWellness.map((entry) => entry.fatigue));
  const soreness = avg(selectedWellness.map((entry) => entry.soreness));
  const mood = avg(selectedWellness.map((entry) => entry.mood));

  return (
    <div ref={ref} className="mx-auto mt-4 w-full max-w-[920px] bg-card p-6 text-card-foreground sm:p-8">
      <ReportHeader title={team === "all" ? "Estado del plantel" : team} date={date} eyebrow={`Informe general · ${phase === "pre" ? "Antes del entrenamiento" : phase === "post" ? "Después del entrenamiento" : "Pre y post-entreno"}`} />
      {loading ? <p className="py-20 text-center text-muted-foreground">Cargando datos…</p> : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Metric label="Respuestas pre" value={`${selectedWellness.length}/${roster.length}`} note="jugadores" />
            <Metric label="Wellness medio" value={wellnessAverage == null ? "—" : `${Math.round(wellnessAverage)}%`} tone={wellnessAverage == null ? "default" : wellnessAverage < 60 ? "bad" : wellnessAverage < 70 ? "warn" : "good"} />
            <Metric label="RPE medio" value={rpeAverage == null ? "—" : rpeAverage.toFixed(1)} note={`${selectedSessions.length} respuestas post`} tone={rpeAverage != null && rpeAverage >= 8 ? "warn" : "default"} />
            <Metric label="Carga total" value={totalLoad ? `${totalLoad}` : "—"} note={`${totalMinutes || 0} minutos · UA`} />
          </div>

          <div className="mt-6 grid gap-6 sm:grid-cols-[1.25fr_0.75fr]">
            <section className="border-l-4 border-primary pl-5">
              <div className="mb-4 flex items-center gap-2"><Sun className="text-primary" /><h3 className="font-display text-xl font-bold uppercase">Estado pre-entreno</h3></div>
              {selectedWellness.length ? (
                <div className="space-y-4">
                  <ScoreBar label="Calidad del sueño" value={sleep} />
                  <ScoreBar label="Frescura muscular" value={fatigue} />
                  <ScoreBar label="Sin dolor muscular" value={soreness} />
                  <ScoreBar label="Ánimo" value={mood} />
                </div>
              ) : <EmptyText text="Sin respuestas pre-entreno para esta fecha." />}
            </section>
            <section className="border-l-4 border-accent pl-5">
              <div className="mb-4 flex items-center gap-2"><Flag className="text-accent" /><h3 className="font-display text-xl font-bold uppercase">Carga post-entreno</h3></div>
              {selectedSessions.length ? (
                <div className="space-y-3 text-sm">
                  <ReportRow label="Entrenamientos" value={String(selectedSessions.filter((entry) => entry.session_type !== "Partido").length)} />
                  <ReportRow label="Partidos" value={String(selectedSessions.filter((entry) => entry.session_type === "Partido").length)} />
                  <ReportRow label="Duración media" value={`${Math.round(totalMinutes / selectedSessions.length)} min`} />
                  <ReportRow label="Carga media" value={`${Math.round(totalLoad / selectedSessions.length)} UA`} />
                </div>
              ) : <EmptyText text="Sin respuestas post-entreno para esta fecha." />}
            </section>
          </div>

          <div className="mt-7 grid gap-6 sm:grid-cols-[1fr_1fr]">
            <section className="border-t border-border pt-5">
               <div className="mb-3 flex items-center gap-2"><Activity className="text-primary" /><h3 className="font-display text-xl font-bold uppercase">Seguimiento prioritario</h3></div>
              {flagged.length ? (
                <ul className="divide-y divide-border">
                  {flagged.map(({ player, reasons }) => (
                    <li key={player.id} className="flex items-start justify-between gap-3 py-2.5 text-sm">
                       <span className="font-semibold">{player.full_name}</span><span className="max-w-[62%] text-right text-destructive">{reasons.join(" · ")}</span>
                    </li>
                  ))}
                </ul>
               ) : <EmptyText text="Sin jugadores con RPE 8 o más ni dolor muscular reportado." />}
            </section>
            <section className="border-t border-border pt-5">
              <h3 className="mb-3 font-display text-xl font-bold uppercase">Dolor reportado</h3>
              <div className="grid grid-cols-[1.25fr_0.75fr] items-center gap-3">
                <BodyMap heat={pain} className="gap-1" />
                <div>
                  <PainLegend heat />
                  <ul className="mt-3 space-y-1 text-xs">
                    {topPain.map(([zone, count]) => <li key={zone} className="flex justify-between gap-2"><span>{zoneLabel(zone)}</span><strong>{count}</strong></li>)}
                    {!topPain.length && <li className="text-muted-foreground">Sin dolor reportado.</li>}
                  </ul>
                </div>
              </div>
            </section>
          </div>
        </>
      )}
      <ReportFooter />
    </div>
  );
};

const PlayerReport = function PlayerReport({ ref, date, player, wellness, sessions, loading }: {
  ref: Ref<HTMLDivElement>;
  date: string;
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
  ];
  return (
    <div ref={ref} className="mx-auto mt-4 w-full max-w-[920px] bg-card text-card-foreground">
      {loading ? <p className="p-12">Cargando datos…</p> : allEntries.length ? allEntries.map((item, index) => (
        <div key={item.entry.id} data-report-page className="bg-card p-6 sm:p-8">
          <ReportHeader title={player.full_name} date={date} eyebrow={`${player.team} · Respuesta ${index + 1} de ${allEntries.length}`} />
          <h3 className="mt-6 font-display text-2xl font-bold uppercase text-primary">{item.kind === "pre" ? "Pre-entreno · Wellness" : "Post-entreno"}</h3>
          <p className="mt-1 text-sm text-muted-foreground">Registrada: {format(parseISO(item.entry.created_at), "dd/MM/yyyy HH:mm")}</p>
          {item.kind === "pre" ? (
            <div className="mt-5 space-y-3">
              <Metric label="Wellness" value={`${wellnessPct(item.entry)}%`} />
              <ReportRow label="Horas dormidas" value={`${item.entry.sleep_hours} h`} />
              <ScoreBar label="Calidad del sueño" value={item.entry.sleep_quality} />
              <ScoreBar label="Frescura muscular (5 = fresco)" value={item.entry.fatigue} />
              <ScoreBar label="Dolor muscular (5 = sin dolor)" value={item.entry.soreness} />
              <ScoreBar label="Estrés (5 = relajado)" value={item.entry.stress} />
              <ScoreBar label="Ánimo" value={item.entry.mood} />
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              <div className="grid grid-cols-2 gap-3"><Metric label="RPE" value={`${item.entry.rpe}/10`} tone={item.entry.rpe >= 8 ? "bad" : "default"} /><Metric label="Carga" value={`${item.entry.load} UA`} /></div>
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
    <footer className="mt-7 flex items-center justify-between border-t border-border pt-3 text-[11px] text-muted-foreground">
      <span>CBMM Rugby · Control de cargas</span>
      <span>Datos subjetivos declarados por los jugadores</span>
    </footer>
  );
}