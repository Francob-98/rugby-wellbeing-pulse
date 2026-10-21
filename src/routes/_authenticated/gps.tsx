import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { FileUp, FileText, Loader2, Trash2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePlayers } from "@/components/PlayerPicker";
import { TEAMS, SESSION_TYPES } from "@/lib/constants";
import { extractGpsPdf, type GpsRow } from "@/lib/gps-extract.functions";
import { Panel } from "@/components/staff/Widgets";
import { GpsReport } from "@/components/staff/GpsReport";
import { exportReport } from "@/lib/report-export";
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
  const exact = cands.find((p) => norm(p.full_name).split(" ").some((t) => firstTok && (t === firstTok || (firstTok.length <= 2 && t.startsWith(firstTok.charAt(0))))));
  return exact?.id ?? (cands.length === 1 ? cands[0]?.id ?? null : null);
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
    if (!file) { toast.error("Elegí el PDF del GPS."); return; }
    if (file.size > 10_000_000) { toast.error("El PDF supera 10 MB."); return; }
    setReading(true);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      let bin = "";
      for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      const r = await extract({ data: { filename: file.name, base64: btoa(bin) } });
      if ("error" in r) { toast.error(r.error); return; }
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

  const upd = (i: number, patch: Partial<Row>) => setRows((rs) => rs?.map((r, j) => (j === i ? { ...r, ...patch } : r)) ?? null);
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
    if (error) { toast.error("No se pudo eliminar."); return; }
    qc.invalidateQueries({ queryKey: ["gps"] });
  };

  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
      <Panel title="Historial">
        {!sessions.length && <p className="text-sm text-muted-foreground">Todavía no hay sesiones GPS.</p>}
        <ul className="space-y-1">
          {sessions.map((s) => (
            <li key={s.id} className="flex items-center gap-1">
              <Button variant="ghost" onClick={() => onSelect(s.id)} className={`h-auto min-w-0 flex-1 justify-start whitespace-normal px-2 py-1.5 text-left text-sm ${current?.id === s.id ? "bg-secondary font-medium" : "hover:bg-muted"}`}><span>
                {s.session_date} · {s.team}<span className="block text-xs text-muted-foreground">{s.session_type}{s.description ? ` · ${s.description}` : ""}</span>
              </span></Button>
              <Button size="icon" variant="ghost" onClick={() => del(s.id)}><Trash2 className="size-4" /></Button>
            </li>
          ))}
        </ul>
      </Panel>
      {current && <SessionDetail key={current.id} s={current} />}
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
  const reportRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const valid = (e: Entry) => warnings(e).length === 0;
  const download = async () => {
    if (!reportRef.current) return;
    setExporting(true);
    try {
      await exportReport(reportRef.current, "pdf", `CBMM-GPS-${s.session_date}-${s.team.replaceAll(" ", "-")}`);
      toast.success("PDF descargado");
    } catch {
      toast.error("No se pudo crear el PDF. Intentá nuevamente.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-bold uppercase">Informe para entrenadores</h2>
        <Button onClick={download} disabled={exporting || !entries.length}>
          {exporting ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}
          {exporting ? "Creando PDF…" : "Descargar PDF"}
        </Button>
      </div>
      {entries.length ? <GpsReport ref={reportRef} session={s} entries={entries} rpe={rpe} isValid={valid} /> : <p className="text-sm text-muted-foreground">Sin registros GPS disponibles.</p>}
    </div>
  );
}
