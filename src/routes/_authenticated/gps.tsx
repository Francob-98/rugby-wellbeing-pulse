import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { FileUp, Loader2, Trash2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePlayers } from "@/components/PlayerPicker";
import { TEAMS, SESSION_TYPES } from "@/lib/constants";
import { extractGpsPdf, type GpsRow } from "@/lib/gps-extract.functions";
import { Panel, Kpi } from "@/components/staff/Widgets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/gps")({
  head: () => ({
    meta: [
      { title: "GPS · CBMM Control" },
      { name: "description", content: "Carga y análisis de datos GPS del plantel del CBMM." },
      { property: "og:title", content: "GPS · CBMM Control" },
      { property: "og:description", content: "Carga externa por jugador cruzada con wellness y PSE." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GpsPage,
});

type Row = GpsRow & { player_id: string | null };
const NUMS: { k: keyof GpsRow; label: string }[] = [
  { k: "distance_m", label: "Dist. (m)" }, { k: "m_per_min", label: "m/min" }, { k: "hsd_m", label: "Alta vel. (m)" },
  { k: "sprint_per_min", label: "Sprint/min" }, { k: "accel_decel", label: "Acel+desac" }, { k: "max_speed", label: "Vel. máx" },
  { k: "max_accel", label: "Acel. máx" }, { k: "max_decel", label: "Desac. máx" }, { k: "duration_min", label: "Min" },
];
const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z ,]/g, "").trim();

function matchPlayer(gpsName: string, players: { id: string; full_name: string }[]) {
  const [last = "", first = ""] = norm(gpsName).split(",").map((x) => x.trim());
  const firstTok = first.split(" ")[0] ?? "";
  const cands = players.filter((p) => norm(p.full_name).split(" ").includes(last.split(" ")[0] ?? ""));
  const exact = cands.find((p) => norm(p.full_name).split(" ").some((t) => firstTok && (t === firstTok || (firstTok.length <= 2 && t.startsWith(firstTok[0]!)))));
  return exact?.id ?? (cands.length === 1 ? cands[0]!.id : null);
}

function warnings(r: GpsRow) {
  const w: string[] = [];
  if ((r.max_speed ?? 0) > 40) w.push("velocidad máx. improbable");
  if ((r.duration_min ?? 0) > 180) w.push("duración muy larga");
  if ((r.max_accel ?? 0) > 8 || (r.max_decel ?? 0) > 8) w.push("acel./desac. improbable");
  return w;
}

function GpsPage() {
  const { data: players = [] } = usePlayers();
  const qc = useQueryClient();
  const extract = useServerFn(extractGpsPdf);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [team, setTeam] = useState<string>(TEAMS[0]);
  const [type, setType] = useState<string>("Entrenamiento");
  const [desc, setDesc] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [reading, setReading] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const read = async () => {
    if (!file) return toast.error("Elegí el PDF del GPS.");
    if (file.size > 10_000_000) return toast.error("El PDF supera 10 MB.");
    setReading(true);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      let bin = "";
      for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      const r = await extract({ data: { filename: file.name, base64: btoa(bin) } });
      if ("error" in r) return toast.error(r.error);
      setRows(r.rows.map((x) => ({ ...x, player_id: matchPlayer(x.gps_name, players) })));
      if (!desc && r.activity) setDesc(r.activity);
    } catch { toast.error("No se pudo leer el PDF."); }
    finally { setReading(false); }
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!rows?.length) throw new Error("Sin datos");
      const { data: s, error } = await supabase.from("gps_sessions")
        .insert({ session_date: date, team, session_type: type, description: desc || null, source_file: file?.name ?? null }).select("id").single();
      if (error) throw error;
      const { error: e2 } = await supabase.from("gps_entries").insert(rows.map((r) => ({ ...r, session_id: s.id, accel_decel: r.accel_decel == null ? null : Math.round(r.accel_decel) })));
      if (e2) { await supabase.from("gps_sessions").delete().eq("id", s.id); throw e2; }
      return s.id;
    },
    onSuccess: (id) => { toast.success("Sesión GPS guardada."); setRows(null); setFile(null); setDesc(""); setSelected(id); qc.invalidateQueries({ queryKey: ["gps"] }); },
    onError: () => toast.error("No se pudo guardar la sesión."),
  });

  const upd = (i: number, patch: Partial<Row>) => setRows((rs) => rs!.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const unmatched = rows?.filter((r) => !r.player_id).length ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold uppercase">GPS</h1>
        <p className="text-sm text-muted-foreground">Cargá el PDF del GPS, revisá los datos y guardalos para analizarlos junto al wellness y el PSE.</p>
      </div>

      <Panel title="1 · Cargar informe PDF">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="text-sm">Fecha<Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
          <label className="text-sm">Equipo
            <Select value={team} onValueChange={setTeam}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TEAMS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
          </label>
          <label className="text-sm">Tipo
            <Select value={type} onValueChange={setType}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{SESSION_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
          </label>
          <label className="text-sm lg:col-span-2">Descripción<Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Ej: MD-3, contacto" /></label>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Input type="file" accept="application/pdf" className="max-w-xs" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setRows(null); }} />
          <Button onClick={read} disabled={!file || reading}>
            {reading ? <Loader2 className="size-4 animate-spin" /> : <FileUp className="size-4" />} {reading ? "Leyendo PDF…" : "Leer PDF"}
          </Button>
        </div>
      </Panel>

      {rows && (
        <Panel title={`2 · Revisar antes de guardar (${rows.length} jugadores)`}
          action={<Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "Guardando…" : "Guardar sesión"}</Button>}>
          {unmatched > 0 && <p className="mb-2 text-sm text-warning">{unmatched} jugador(es) sin vincular al plantel: elegilos en la columna "Jugador".</p>}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Nombre GPS</TableHead><TableHead>Jugador</TableHead>{NUMS.map((n) => <TableHead key={n.k}>{n.label}</TableHead>)}<TableHead /></TableRow></TableHeader>
              <TableBody>
                {rows.map((r, i) => {
                  const w = warnings(r);
                  return (
                    <TableRow key={i}>
                      <TableCell className="whitespace-nowrap text-sm">{r.gps_name}{w.length > 0 && <span title={w.join(", ")} className="ml-1 inline-flex text-warning"><AlertTriangle className="size-3.5" /></span>}</TableCell>
                      <TableCell className="min-w-44">
                        <Select value={r.player_id ?? "none"} onValueChange={(v) => upd(i, { player_id: v === "none" ? null : v })}>
                          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="none">— Sin vincular —</SelectItem>{players.map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}</SelectContent>
                        </Select>
                      </TableCell>
                      {NUMS.map((n) => (
                        <TableCell key={n.k}>
                          <Input className="h-8 w-20" type="number" step="any" value={r[n.k] ?? ""}
                            onChange={(e) => upd(i, { [n.k]: e.target.value === "" ? null : Number(e.target.value) } as Partial<Row>)} />
                        </TableCell>
                      ))}
                      <TableCell><Button size="icon" variant="ghost" onClick={() => setRows(rows.filter((_, j) => j !== i))}><Trash2 className="size-4" /></Button></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">El triángulo marca valores atípicos para revisar (por ejemplo velocidades o duraciones fuera de rango).</p>
        </Panel>
      )}

      <History selected={selected} onSelect={setSelected} />
    </div>
  );
}

type Sess = { id: string; session_date: string; team: string; session_type: string; description: string | null };
type Entry = GpsRow & { id: string; player_id: string | null; players: { full_name: string } | null };

function History({ selected, onSelect }: { selected: string | null; onSelect: (id: string) => void }) {
  const qc = useQueryClient();
  const { data: sessions = [] } = useQuery({
    queryKey: ["gps", "sessions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("gps_sessions").select("id,session_date,team,session_type,description").order("session_date", { ascending: false }).limit(200);
      if (error) throw error;
      return data as Sess[];
    },
  });
  const current = sessions.find((s) => s.id === selected) ?? sessions[0];
  const del = async (id: string) => {
    if (!confirm("¿Eliminar esta sesión GPS?")) return;
    const { error } = await supabase.from("gps_sessions").delete().eq("id", id);
    if (error) return toast.error("No se pudo eliminar.");
    qc.invalidateQueries({ queryKey: ["gps"] });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      <Panel title="Historial">
        {!sessions.length && <p className="text-sm text-muted-foreground">Todavía no hay sesiones GPS.</p>}
        <ul className="space-y-1">
          {sessions.map((s) => (
            <li key={s.id} className="flex items-center gap-1">
              <button onClick={() => onSelect(s.id)} className={`flex-1 rounded-md px-2 py-1.5 text-left text-sm ${current?.id === s.id ? "bg-secondary font-medium" : "hover:bg-muted"}`}>
                {s.session_date} · {s.team}<span className="block text-xs text-muted-foreground">{s.session_type}{s.description ? ` · ${s.description}` : ""}</span>
              </button>
              <Button size="icon" variant="ghost" onClick={() => del(s.id)}><Trash2 className="size-4" /></Button>
            </li>
          ))}
        </ul>
      </Panel>
      {current && <SessionDetail s={current} />}
    </div>
  );
}

function SessionDetail({ s }: { s: Sess }) {
  const { data: entries = [] } = useQuery({
    queryKey: ["gps", "entries", s.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("gps_entries").select("*, players(full_name)").eq("session_id", s.id);
      if (error) throw error;
      return data as unknown as Entry[];
    },
  });
  const ids = entries.map((e) => e.player_id).filter(Boolean) as string[];
  const { data: rpe = {} } = useQuery({
    queryKey: ["gps", "rpe", s.id, ids.join()],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("session_entries").select("player_id,rpe,load").eq("entry_date", s.session_date).in("player_id", ids);
      const m: Record<string, { rpe: number; load: number | null }> = {};
      (data ?? []).forEach((r) => { m[r.player_id] = { rpe: r.rpe, load: r.load }; });
      return m;
    },
  });
  const [metric, setMetric] = useState<keyof GpsRow>("distance_m");
  const valid = (e: Entry) => warnings(e).length === 0;
  const avg = (k: keyof GpsRow) => {
    const xs = entries.filter(valid).map((e) => Number(e[k])).filter((x) => Number.isFinite(x) && x > 0);
    return xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : "—";
  };
  const sorted = useMemo(() => [...entries].sort((a, b) => Number(b[metric] ?? 0) - Number(a[metric] ?? 0)), [entries, metric]);
  const max = Math.max(1, ...entries.filter(valid).map((e) => Number(e[metric] ?? 0)));
  const label = NUMS.find((n) => n.k === metric)?.label ?? "";
  const name = (e: Entry) => e.players?.full_name ?? e.gps_name;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <Kpi label="Jugadores" value={entries.length} />
        <Kpi label="Distancia media (m)" value={avg("distance_m")} />
        <Kpi label="m/min medio" value={avg("m_per_min")} />
        <Kpi label="Alta velocidad media (m)" value={avg("hsd_m")} />
      </div>

      <Panel title={`Ranking · ${label}`} action={
        <Select value={metric} onValueChange={(v) => setMetric(v as keyof GpsRow)}>
          <SelectTrigger className="h-8 w-40"><SelectValue /></SelectTrigger>
          <SelectContent>{NUMS.map((n) => <SelectItem key={n.k} value={n.k}>{n.label}</SelectItem>)}</SelectContent>
        </Select>}>
        <div className="space-y-1.5">
          {sorted.map((e) => {
            const v = Number(e[metric] ?? 0);
            const odd = !valid(e);
            return (
              <div key={e.id} className="grid grid-cols-[150px_1fr_60px] items-center gap-2 text-sm">
                <span className="truncate">{name(e)}</span>
                <div className="h-3 rounded bg-muted"><div className={`h-3 rounded ${odd ? "bg-warning" : "bg-primary"}`} style={{ width: `${Math.min(100, (v / max) * 100)}%` }} /></div>
                <span className="text-right tabular-nums">{v || "—"}</span>
              </div>
            );
          })}
        </div>
        {entries.some((e) => !valid(e)) && <p className="mt-2 text-xs text-muted-foreground">En amarillo: valores atípicos, excluidos de los promedios.</p>}
      </Panel>

      <Panel title="Carga externa vs. percepción (PSE del mismo día)">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Jugador</TableHead><TableHead>Dist. (m)</TableHead><TableHead>m/min</TableHead><TableHead>Alta vel.</TableHead><TableHead>PSE</TableHead><TableHead>Carga</TableHead><TableHead>Lectura</TableHead></TableRow></TableHeader>
            <TableBody>
              {sorted.map((e) => {
                const r = e.player_id ? rpe[e.player_id] : undefined;
                const d = Number(e.distance_m ?? 0); const da = Number(avg("distance_m")) || 0;
                let note = "—";
                if (r && da) {
                  if (r.rpe >= 8 && d < da * 0.8) note = "PSE alto con poco volumen: revisar";
                  else if (r.rpe <= 4 && d > da * 1.2) note = "Mucho volumen, baja percepción";
                  else note = "Acorde";
                }
                return (
                  <TableRow key={e.id}>
                    <TableCell>{name(e)}{!e.player_id && <span className="ml-1 text-xs text-muted-foreground">(sin vincular)</span>}</TableCell>
                    <TableCell>{e.distance_m ?? "—"}</TableCell><TableCell>{e.m_per_min ?? "—"}</TableCell><TableCell>{e.hsd_m ?? "—"}</TableCell>
                    <TableCell>{r?.rpe ?? "—"}</TableCell><TableCell>{r?.load ?? "—"}</TableCell>
                    <TableCell className={note.includes("revisar") ? "text-destructive" : "text-muted-foreground"}>{note}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Panel>
    </div>
  );
}
