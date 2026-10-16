import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Textarea } from "@/components/ui/textarea";
import { useMemo, useRef, useState } from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Download, FileText } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { BodyMap, zoneLabel } from "@/components/BodyMap";
import { ClubBrand } from "@/components/ClubBrand";
import { usePlayers } from "@/components/PlayerPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { exportReport } from "@/lib/report-export";
import { daysAgo, today } from "@/lib/metrics";
import { PAIN_LEVELS } from "@/lib/constants";

export const Route = createFileRoute("/_authenticated/diferenciados")({
  head: () => ({
    meta: [
      { title: "Seguimiento diferenciado · CBMM Rugby" },
      { name: "description", content: "Seguimiento kinesiológico de jugadores en Diferenciados: semáforo, historial e informe." },
      { property: "og:title", content: "Seguimiento diferenciado · CBMM Rugby" },
      { property: "og:description", content: "Estado y evolución de jugadores en Diferenciados." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DiffPage,
});

interface DiffReport {
  id: string; player_id: string; entry_date: string; source: string; player_line: string | null;
  reason: string; zones: Record<string, number>; restriction: string; evolution: string; comment: string | null; kinesio_note: string | null; created_at: string;
}

type Light = "rojo" | "amarillo" | "verde";
function light(r: DiffReport): Light {
  const max = Math.max(0, ...Object.values(r.zones ?? {}));
  if (r.evolution === "Empeoró" || max >= 3) return "rojo";
  if (r.evolution === "Igual" || max === 2) return "amarillo";
  return "verde";
}
const LIGHT_TEXT: Record<Light, string> = { rojo: "No disponible · revisar", amarillo: "Disponible con restricciones", verde: "Evolución favorable" };
const LIGHT_FILL: Record<Light, string> = { rojo: "var(--destructive)", amarillo: "var(--warning)", verde: "var(--success)" };

function Semaforo({ value }: { value: Light }) {
  return (
    <div className="flex items-center gap-2">
      <svg width="54" height="20" viewBox="0 0 54 20" aria-hidden>
        {(["rojo", "amarillo", "verde"] as Light[]).map((l, i) => (
          <circle key={l} cx={9 + i * 18} cy="10" r="7" fill={l === value ? LIGHT_FILL[l] : "var(--muted)"} stroke="var(--border)" />
        ))}
      </svg>
      <span className="text-sm font-semibold">{LIGHT_TEXT[value]}</span>
    </div>
  );
}

const fmt = (d: string) => format(parseISO(d), "d MMM yyyy", { locale: es });
const levelName = (v: number) => PAIN_LEVELS.find((p) => p.value === v)?.label ?? "";

function DiffPage() {
  const [from, setFrom] = useState(daysAgo(13));
  const [to, setTo] = useState(today());
  const [status, setStatus] = useState<"all" | Light>("all");
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data: players = [] } = usePlayers();

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["diff-reports", from, to],
    queryFn: async () => {
      const all: DiffReport[] = [];
      for (let o = 0; ; o += 500) {
        const r = await supabase.from("differentiated_reports").select("*").gte("entry_date", from).lte("entry_date", to)
          .order("entry_date", { ascending: false }).order("created_at", { ascending: false }).range(o, o + 499);
        if (r.error) throw r.error;
        all.push(...(r.data as unknown as DiffReport[]));
        if (r.data.length < 500) return all;
      }
    },
  });

  const groups = useMemo(() => {
    const map = new Map<string, DiffReport[]>();
    for (const r of reports) map.set(r.player_id, [...(map.get(r.player_id) ?? []), r]);
    const order: Record<Light, number> = { rojo: 0, amarillo: 1, verde: 2 };
    return [...map.entries()]
      .map(([id, list]) => ({ id, name: players.find((p) => p.id === id)?.full_name ?? "Jugador", list, light: light(list[0]!) }))
      .filter((g) => status === "all" || g.light === status)
      .sort((a, b) => order[a.light] - order[b.light] || a.name.localeCompare(b.name));
  }, [reports, players, status]);

  const download = async (kind: "png" | "pdf") => {
    if (!ref.current || !groups.length) return;
    setBusy(true);
    try { await exportReport(ref.current, kind, `CBMM-diferenciados-${from}-a-${to}`); }
    catch { toast.error("No se pudo generar el informe"); }
    finally { setBusy(false); }
  };

  const counts = { rojo: 0, amarillo: 0, verde: 0 };
  for (const g of groups) counts[g.light]++;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-bold uppercase">Seguimiento diferenciado</h1>
        <p className="text-sm text-muted-foreground">Kinesiología · jugadores que entrenaron en Diferenciados.</p>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1"><Label>Desde</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" /></div>
        <div className="space-y-1"><Label>Hasta</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" /></div>
        <div className="space-y-1">
          <Label>Estado</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="rojo">Rojo · revisar</SelectItem>
              <SelectItem value="amarillo">Amarillo · con restricciones</SelectItem>
              <SelectItem value="verde">Verde · favorable</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" disabled={busy || !groups.length} onClick={() => download("png")}><Download className="size-4" />PNG</Button>
          <Button disabled={busy || !groups.length} onClick={() => download("pdf")}><FileText className="size-4" />PDF</Button>
        </div>
      </div>

      {isLoading ? <p className="text-muted-foreground">Cargando…</p> : !groups.length ? (
        <p className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">No hay registros de Diferenciados en este período.</p>
      ) : (
        <div ref={ref} className="mx-auto max-w-4xl space-y-4 bg-background">
          <div data-report-page className="bg-card p-6">
            <header className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-primary pb-4">
              <div>
                <p className="font-display text-sm font-semibold uppercase tracking-widest text-primary">Informe kinesiología</p>
                <h2 className="mt-1 font-display text-3xl font-bold uppercase leading-none">Seguimiento diferenciado</h2>
                <p className="mt-2 text-sm text-muted-foreground">{fmt(from)} al {fmt(to)}</p>
              </div>
              <ClubBrand compact className="text-foreground" />
            </header>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {(["rojo", "amarillo", "verde"] as Light[]).map((l) => (
                <div key={l} className="border-t-4 bg-muted/60 p-3" style={{ borderTopColor: LIGHT_FILL[l] }}>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">{LIGHT_TEXT[l]}</p>
                  <p className="font-display text-4xl font-bold">{counts[l]}</p>
                </div>
              ))}
            </div>
          </div>
          {groups.map((g) => {
            const last = g.list[0]!;
            return (
              <div key={g.id} data-report-page className="bg-card p-6">
                <div data-report-block className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
                  <div>
                    <h3 className="font-display text-2xl font-bold uppercase">{g.name}</h3>
                    <p className="text-sm text-muted-foreground">{last.player_line ?? "Línea sin dato"} · último registro {fmt(last.entry_date)} ({last.source})</p>
                  </div>
                  <Semaforo value={g.light} />
                </div>
                <div data-report-block className="mt-4 grid gap-4 sm:grid-cols-[1fr_220px]">
                  <dl className="grid grid-cols-2 gap-3 text-sm">
                    <div><dt className="text-xs uppercase text-muted-foreground">Motivo</dt><dd className="font-semibold">{last.reason}</dd></div>
                    <div><dt className="text-xs uppercase text-muted-foreground">Restricción</dt><dd className="font-semibold">{last.restriction}</dd></div>
                    <div><dt className="text-xs uppercase text-muted-foreground">Evolución</dt><dd className="font-semibold">{last.evolution || "—"}</dd></div>
                    <div><dt className="text-xs uppercase text-muted-foreground">Zona afectada</dt><dd className="font-semibold">{Object.entries(last.zones).map(([z, v]) => `${zoneLabel(z)} (${levelName(v)})`).join(", ") || "—"}</dd></div>
                    {last.comment && <div className="col-span-2"><dt className="text-xs uppercase text-muted-foreground">Observación del jugador</dt><dd className="italic">“{last.comment}”</dd></div>}
                    <div className="col-span-2"><dt className="text-xs uppercase text-muted-foreground">Nota del kinesiólogo</dt><dd><KinesioNote report={last} /></dd></div>
                  </dl>
                  <BodyMap value={last.zones} />
                </div>
                <div data-report-block className="mt-4">
                  <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Historial ({g.list.length})</p>
                  <ul className="divide-y divide-border text-sm">
                    {g.list.map((r) => (
                      <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                        <span className="inline-block size-3 rounded-full" style={{ background: LIGHT_FILL[light(r)] }} />
                        <span className="w-28 font-semibold">{fmt(r.entry_date)}</span>
                        <span className="text-muted-foreground">{r.source}</span>
                        <span>{r.reason} · {r.restriction}{r.evolution ? ` · ${r.evolution}` : ""}</span>
                        {r.comment && <span className="w-full pl-6 italic text-muted-foreground">“{r.comment}”</span>}
                        {r.kinesio_note && <span className="w-full pl-6"><strong>Kinesiólogo:</strong> {r.kinesio_note}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
          <p className="bg-card px-6 pb-4 text-xs text-muted-foreground">Semáforo orientativo según evolución declarada e intensidad del dolor. No reemplaza la evaluación del kinesiólogo.</p>
        </div>
      )}
    </div>
  );
}

function KinesioNote({ report }: { report: DiffReport }) {
  const qc = useQueryClient();
  const [value, setValue] = useState(report.kinesio_note ?? "");
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("differentiated_reports").update({ kinesio_note: value.trim().slice(0, 1000) || null }).eq("id", report.id);
    setSaving(false);
    if (error) { toast.error("No se pudo guardar la nota"); return; }
    toast.success("Nota guardada");
    qc.invalidateQueries({ queryKey: ["diff-reports"] });
  };
  return (
    <div className="space-y-2">
      <p className="hidden whitespace-pre-wrap" data-export-show>{report.kinesio_note || "Sin nota"}</p>
      <div data-export-hide className="space-y-2">
      <Textarea value={value} onChange={(e) => setValue(e.target.value)} maxLength={1000} placeholder="Indicación de carga, retorno, tratamiento…" className="min-h-16" />
      <Button size="sm" variant="outline" onClick={save} disabled={saving || value === (report.kinesio_note ?? "")}>{saving ? "Guardando…" : "Guardar nota"}</Button>
      </div>
    </div>
  );
}
