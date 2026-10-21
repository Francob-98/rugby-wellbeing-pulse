import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { GpsLine, GpsTargets } from "@/lib/gps-metrics";

const lines: GpsLine[] = ["Backs", "Forwards"];
const activities = ["Entrenamiento", "Partido"];
export function useGpsReferences() {
  return useQuery({ queryKey: ["gps", "references"], queryFn: async () => {
    const { data, error } = await supabase.from("gps_distance_references").select("*");
    if (error) throw error;
    return data;
  } });
}
export function referenceTargets(rows: { player_line: string; session_type: string; distance_m: number }[], activity: string): GpsTargets {
  const targets: GpsTargets = {};
  rows.filter(row => row.session_type === activity).forEach(row => {
    if (row.player_line === "Backs" || row.player_line === "Forwards") targets[row.player_line] = row.distance_m;
  });
  return targets;
}
function parse(value: string): number | null {
  if (!value.trim()) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0 || n >= 1000000) throw new Error("Ingresá metros mayores a cero y menores a 1.000.000.");
  return n;
}
export function GpsBaseReferences() {
  const { data = [], isPending, isError } = useGpsReferences();
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Record<string, string>>({});
  const save = useMutation({ mutationFn: async () => {
    const changes = Object.entries(draft).map(([key, value]) => {
      const [player_line = "", session_type = ""] = key.split(":");
      return { player_line, session_type, distance_m: parse(value) };
    });
    for (const row of changes) {
      const result = row.distance_m == null
        ? await supabase.from("gps_distance_references").delete().eq("player_line", row.player_line).eq("session_type", row.session_type)
        : await supabase.from("gps_distance_references").upsert({ ...row, distance_m: row.distance_m });
      if (result.error) throw result.error;
    }
  }, onSuccess: async () => { await qc.invalidateQueries({ queryKey: ["gps", "references"] }); setDraft({}); toast.success("Referencias habituales guardadas."); }, onError: (e) => toast.error(e.message) });
  return <section className="space-y-3 border-t border-border pt-4">
    <h2 className="font-display text-xl font-bold uppercase">Distancia objetivo habitual</h2>
    {isError && <p className="text-sm text-destructive">No se pudieron cargar las referencias.</p>}
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{activities.flatMap(activity => lines.map(line => {
      const key = `${line}:${activity}`;
      const existing = data.find(row => row.player_line === line && row.session_type === activity)?.distance_m;
      return <label key={key} className="text-sm">{line} · {activity} (m)<Input aria-label={`${line} ${activity} objetivo habitual`} type="number" min="1" step="any" disabled={isPending || isError || save.isPending} placeholder="Sin referencia" value={draft[key] ?? existing ?? ""} onChange={e => setDraft({ ...draft, [key]: e.target.value })} /></label>;
    }))}</div>
    <Button variant="outline" onClick={() => save.mutate()} disabled={!Object.keys(draft).length || save.isPending || isError}><Save className="size-4" />Guardar referencias</Button>
  </section>;
}
export function GpsSessionReferences({ session, base }: { session: { id: string; backs_target_m: number | null; forwards_target_m: number | null }; base: GpsTargets }) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Partial<Record<GpsLine, string>>>({});
  const save = useMutation({ mutationFn: async () => {
    const backs_target_m = parse(draft.Backs ?? String(session.backs_target_m ?? ""));
    const forwards_target_m = parse(draft.Forwards ?? String(session.forwards_target_m ?? ""));
    const { error } = await supabase.from("gps_sessions").update({ backs_target_m, forwards_target_m }).eq("id", session.id);
    if (error) throw error;
  }, onSuccess: async () => { await qc.invalidateQueries({ queryKey: ["gps", "sessions"] }); setDraft({}); toast.success("Objetivos de la sesión guardados."); }, onError: e => toast.error(e.message) });
  return <section className="space-y-3 border-t border-border pt-4"><h3 className="font-display text-xl font-bold uppercase">Objetivo para esta sesión</h3>
    <div className="grid gap-3 sm:grid-cols-2">{lines.map(line => <label key={line} className="text-sm">{line} (m)<Input aria-label={`${line} objetivo sesión`} type="number" min="1" step="any" disabled={save.isPending} value={draft[line] ?? (line === "Backs" ? session.backs_target_m : session.forwards_target_m) ?? ""} placeholder={base[line] ? `Habitual: ${base[line]} m` : "Sin referencia habitual"} onChange={e => setDraft({ ...draft, [line]: e.target.value })} /></label>)}</div>
    <Button variant="outline" disabled={!Object.keys(draft).length || save.isPending} onClick={() => save.mutate()}><Save className="size-4" />Guardar objetivos de sesión</Button>
  </section>;
}