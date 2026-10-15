import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, Sun, Flag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEntries } from "@/lib/staff-data";
import { shortDate, wellnessPct } from "@/lib/metrics";
import { analyzeEntries, type AiResult } from "@/lib/ai-analysis.functions";
import { Panel, RangeSelect } from "@/components/staff/Widgets";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { AiCompare } from "@/components/staff/AiCompare";

export const Route = createFileRoute("/_authenticated/analisis")({
  head: () => ({
    meta: [
      { title: "Análisis IA · CBMM Rugby" },
      { name: "description", content: "Detectá señales de fatiga o dolor en las respuestas pre y post entreno con IA." },
      { property: "og:title", content: "Análisis IA · CBMM Rugby" },
      { property: "og:description", content: "Señales de fatiga y dolor que requieren seguimiento." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AnalisisPage,
});

function AnalisisPage() {
  const [days, setDays] = useState(7);
  const { data, isLoading } = useEntries(days);
  const players = useQuery({
    queryKey: ["players-all"],
    queryFn: async () => (await supabase.from("players").select("id,full_name")).data ?? [],
  });
  const names = useMemo(() => Object.fromEntries((players.data ?? []).map((p) => [p.id, p.full_name])), [players.data]);
  const [selW, setSelW] = useState<Set<string>>(new Set());
  const [selS, setSelS] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<AiResult | null>(null);
  const [loading, setLoading] = useState(false);
  const analyze = useServerFn(analyzeEntries);

  const cutoff = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);
  const wellness = (data?.wellness ?? []).filter((e) => e.entry_date >= cutoff).reverse();
  const sessions = (data?.sessions ?? []).filter((e) => e.entry_date >= cutoff).reverse();

  const toggle = (set: Set<string>, fn: (s: Set<string>) => void, id: string) => {
    const n = new Set(set); n.has(id) ? n.delete(id) : n.add(id); fn(n);
  };

  const run = async () => {
    setLoading(true); setResult(null);
    try {
      setResult(await analyze({ data: { wellnessIds: [...selW], sessionIds: [...selS] } }));
    } catch {
      setResult({ error: "No se pudo completar el análisis." });
    }
    setLoading(false);
  };

  const total = selW.size + selS.size;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold uppercase">Análisis IA</h1>
          <p className="text-sm text-muted-foreground">Seleccioná respuestas y detectá señales de fatiga o dolor que requieran seguimiento.</p>
        </div>
        <div className="flex items-center gap-2">
          <RangeSelect value={days} onChange={setDays} />
          <Button onClick={run} disabled={loading || total === 0 || total > 400}>
            <Sparkles className="size-4" />{loading ? "Analizando…" : `Analizar (${total})`}
          </Button>
        </div>
      </div>

      <AiCompare />

      {result && (
        <Panel title="Resultado">
          {"error" in result ? (
            <p className="text-sm text-destructive">{result.error}</p>
          ) : (
            <div className="space-y-3">
              <p className="text-sm">{result.summary}</p>
              {result.findings.length === 0 && <p className="text-sm text-muted-foreground">Sin señales que requieran seguimiento.</p>}
              {result.findings.map((f, i) => (
                <div key={i} className={cn("rounded-md border-l-4 bg-muted/40 p-3",
                  f.level === "alto" ? "border-destructive" : f.level === "medio" ? "border-warning" : "border-muted-foreground")}>
                  <div className="flex items-center justify-between">
                    <span className="font-display text-lg font-semibold uppercase">{f.player}</span>
                    <span className="text-xs uppercase tracking-widest text-muted-foreground">Prioridad {f.level}</span>
                  </div>
                  <ul className="mt-1 list-disc pl-5 text-sm">{f.signals?.map((s, j) => <li key={j}>{s}</li>)}</ul>
                  <p className="mt-1 text-sm text-muted-foreground">{f.recommendation}</p>
                </div>
              ))}
              <p className="text-xs text-muted-foreground">Orientativo: no reemplaza la evaluación del staff médico.</p>
            </div>
          )}
        </Panel>
      )}

      {isLoading ? <p className="text-muted-foreground">Cargando…</p> : (
        <div className="grid gap-5 lg:grid-cols-2">
          <EntryList title="Pre-entreno" icon={<Sun className="size-4" />} accent="border-l-primary"
            items={wellness.map((e) => ({ id: e.id, name: names[e.player_id] ?? "—", date: e.entry_date,
              detail: `Wellness ${wellnessPct(e)}% · ${e.sleep_hours}h sueño · ${Object.keys(e.pain_zones ?? {}).length} zonas dolor` }))}
            sel={selW} onToggle={(id) => toggle(selW, setSelW, id)} onAll={(ids) => setSelW(new Set(ids))} />
          <EntryList title="Post-entreno" icon={<Flag className="size-4" />} accent="border-l-accent"
            items={sessions.map((e) => ({ id: e.id, name: names[e.player_id] ?? "—", date: e.entry_date,
              detail: `RPE ${e.rpe} · ${e.duration_min}′ · fatiga ${e.fatigue}/5 · ${Object.keys(e.pain_zones ?? {}).length} zonas dolor` }))}
            sel={selS} onToggle={(id) => toggle(selS, setSelS, id)} onAll={(ids) => setSelS(new Set(ids))} />
        </div>
      )}
    </div>
  );
}

function EntryList({ title, icon, accent, items, sel, onToggle, onAll }: {
  title: string; icon: React.ReactNode; accent: string;
  items: { id: string; name: string; date: string; detail: string }[];
  sel: Set<string>; onToggle: (id: string) => void; onAll: (ids: string[]) => void;
}) {
  const all = items.length > 0 && items.every((i) => sel.has(i.id));
  return (
    <Panel title={title} className={cn("border-l-4", accent)}
      action={<div className="flex items-center gap-2 text-muted-foreground">{icon}
        <Button size="sm" variant="ghost" onClick={() => onAll(all ? [] : items.map((i) => i.id))}>{all ? "Ninguna" : "Todas"}</Button></div>}>
      {items.length === 0 ? <p className="text-sm text-muted-foreground">Sin respuestas en el período.</p> : (
        <ul className="max-h-[480px] divide-y divide-border overflow-y-auto">
          {items.map((i) => (
            <li key={i.id}>
              <label className="flex cursor-pointer items-center gap-3 py-2">
                <Checkbox checked={sel.has(i.id)} onCheckedChange={() => onToggle(i.id)} />
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between gap-2 text-sm font-medium"><span className="truncate">{i.name}</span><span className="text-muted-foreground">{shortDate(i.date)}</span></div>
                  <div className="truncate text-xs text-muted-foreground">{i.detail}</div>
                </div>
              </label>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
