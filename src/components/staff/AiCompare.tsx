import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowDown, ArrowUp, GitCompare, Minus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { compareDates, type CompareMetrics, type CompareResult } from "@/lib/ai-compare.functions";
import { TEAMS } from "@/lib/constants";
import { daysAgo, today } from "@/lib/metrics";
import { Panel } from "@/components/staff/Widgets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { AiCharts } from "@/components/staff/AiCharts";

const ROWS: { key: keyof CompareMetrics; label: string; higherBetter: boolean | null; unit?: string }[] = [
  { key: "wellness", label: "Wellness general", higherBetter: true, unit: "%" },
  { key: "sueno", label: "Horas de sueño", higherBetter: true, unit: "h" },
  { key: "frescura", label: "Frescura (1-5)", higherBetter: true },
  { key: "sinDolor", label: "Sin dolor (1-5)", higherBetter: true },
  { key: "rpe", label: "PSE / RPE promedio", higherBetter: null },
  { key: "duracion", label: "Duración media", higherBetter: null, unit: "′" },
  { key: "carga", label: "Carga total", higherBetter: null },
  { key: "zonasDolor", label: "Zonas de dolor", higherBetter: false },
  { key: "respuestasPre", label: "Respuestas pre", higherBetter: null },
  { key: "respuestasPost", label: "Respuestas post", higherBetter: null },
];

export function AiCompare() {
  const [scope, setScope] = useState<"general" | "individual">("general");
  const [team, setTeam] = useState("all");
  const [playerId, setPlayerId] = useState("");
  const [dateA, setDateA] = useState(daysAgo(7));
  const [dateB, setDateB] = useState(today());
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CompareResult | null>(null);
  const compare = useServerFn(compareDates);
  const players = useQuery({
    queryKey: ["players-active-list"],
    queryFn: async () => (await supabase.from("players").select("id,full_name").eq("active", true).order("full_name")).data ?? [],
  });

  const run = async () => {
    setLoading(true); setResult(null);
    try {
      setResult(await compare({ data: {
        dateA, dateB,
        playerId: scope === "individual" && playerId ? playerId : null,
        team: scope === "general" && team !== "all" ? team : null,
        question: question.trim() || null,
      } }));
    } catch { setResult({ error: "No se pudo completar la comparación." }); }
    setLoading(false);
  };

  const canRun = dateA && dateB && (scope === "general" || playerId);

  return (
    <Panel title="Comparar fechas con IA" className="border-l-4 border-l-primary">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Alcance">
          <Select value={scope} onValueChange={(v) => setScope(v as "general" | "individual")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="general">General (plantel / equipo)</SelectItem><SelectItem value="individual">Individual (jugador)</SelectItem></SelectContent>
          </Select>
        </Field>
        {scope === "general" ? (
          <Field label="Equipo">
            <Select value={team} onValueChange={setTeam}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">Todos</SelectItem>{TEAMS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
        ) : (
          <Field label="Jugador">
            <Select value={playerId} onValueChange={setPlayerId}>
              <SelectTrigger><SelectValue placeholder="Elegí un jugador" /></SelectTrigger>
              <SelectContent>{(players.data ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
        )}
        <Field label="Fecha A (referencia)"><Input type="date" value={dateA} onChange={(e) => setDateA(e.target.value)} /></Field>
        <Field label="Fecha B (a comparar)"><Input type="date" value={dateB} onChange={(e) => setDateB(e.target.value)} /></Field>
      </div>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
        <Field label="Pregunta opcional para la IA" className="flex-1">
          <Textarea rows={2} maxLength={600} value={question} onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ej.: Mostrame en un radar el wellness, o un ranking de zonas de dolor" />
        </Field>
        <Button onClick={run} disabled={loading || !canRun}><GitCompare className="size-4" />{loading ? "Comparando…" : "Comparar"}</Button>
      </div>

      {result && ("error" in result ? <p className="mt-4 text-sm text-destructive">{result.error}</p> : (
        <div className="mt-5 space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border text-left text-xs uppercase tracking-widest text-muted-foreground">
                <th className="py-2">Dato</th><th>A</th><th>B</th><th>Cambio</th></tr></thead>
              <tbody>{ROWS.map((r) => <MetricRow key={r.key} row={r} a={result.a[r.key]} b={result.b[r.key]} />)}</tbody>
            </table>
          </div>
          <p className="text-sm">{result.summary}</p>
          <AiCharts charts={result.charts ?? []} />
          {result.answer && <div className="rounded-md bg-muted/50 p-3 text-sm"><span className="font-semibold">Respuesta: </span>{result.answer}</div>}
          {result.changes.length > 0 && (
            <ul className="space-y-2">{result.changes.map((c, i) => (
              <li key={i} className={cn("rounded-md border-l-4 bg-muted/40 p-3 text-sm",
                c.trend === "empeora" ? "border-destructive" : c.trend === "mejora" ? "border-success" : "border-muted-foreground")}>
                <div className="flex justify-between gap-2"><span className="font-display font-semibold uppercase">{c.player}</span>
                  <span className="text-xs uppercase tracking-widest text-muted-foreground">{c.trend}</span></div>
                <p className="text-muted-foreground">{c.detail}</p>
              </li>))}</ul>
          )}
          {result.recommendations.length > 0 && (
            <div><h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Recomendaciones</h4>
              <ul className="mt-1 list-disc pl-5 text-sm">{result.recommendations.map((r, i) => <li key={i}>{r}</li>)}</ul></div>
          )}
          <p className="text-xs text-muted-foreground">Orientativo: no reemplaza la evaluación del staff médico.</p>
        </div>
      ))}
    </Panel>
  );
}

function MetricRow({ row, a, b }: { row: (typeof ROWS)[number]; a: number | null; b: number | null }) {
  const fmt = (v: number | null) => (v == null ? "—" : `${v}${row.unit ?? ""}`);
  const d = a != null && b != null ? Math.round((b - a) * 10) / 10 : null;
  const good = d == null || d === 0 || row.higherBetter == null ? null : (d > 0) === row.higherBetter;
  const Icon = d == null || d === 0 ? Minus : d > 0 ? ArrowUp : ArrowDown;
  return (
    <tr className="border-b border-border/60">
      <td className="py-2">{row.label}</td><td>{fmt(a)}</td><td className="font-semibold">{fmt(b)}</td>
      <td className={cn("flex items-center gap-1 py-2", good === true && "text-success", good === false && "text-destructive", good == null && "text-muted-foreground")}>
        <Icon className="size-3.5" />{d == null ? "—" : `${d > 0 ? "+" : ""}${d}`}
      </td>
    </tr>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return <label className={cn("block space-y-1", className)}><span className="text-xs font-medium text-muted-foreground">{label}</span>{children}</label>;
}
