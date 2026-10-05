import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Flag, Sun } from "lucide-react";
import { format, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { usePlayers } from "@/components/PlayerPicker";
import { BodyMap, PainLegend, zoneLabel } from "@/components/BodyMap";
import { Panel } from "@/components/staff/Widgets";
import { wellnessPct, type SessionEntry, type WellnessEntry } from "@/lib/metrics";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/jugador_/$id/respuestas")({
  head: () => ({
    meta: [
      { title: "Respuestas del jugador · CBMM Rugby" },
      { name: "description", content: "Historial completo de wellness y post entreno de un jugador con mapa de dolor." },
      { property: "og:title", content: "Respuestas del jugador · CBMM Rugby" },
      { property: "og:description", content: "Todas las respuestas pre y post entreno con mapa de dolor frente y espalda." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RespuestasPage,
});

type Item =
  | { kind: "w"; id: string; date: string; created: string; e: WellnessEntry }
  | { kind: "s"; id: string; date: string; created: string; e: SessionEntry };

const LEVEL = ["", "Leve", "Moderado", "Intenso"];

function RespuestasPage() {
  const { id } = Route.useParams();
  const { data: players = [] } = usePlayers();
  const player = players.find((p) => p.id === id);
  const [filter, setFilter] = useState<"all" | "w" | "s">("all");
  const [selId, setSelId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["player-all-entries", id],
    queryFn: async () => {
      const [w, s] = await Promise.all([
        supabase.from("wellness_entries").select("*").eq("player_id", id).order("entry_date", { ascending: false }).limit(1000),
        supabase.from("session_entries").select("*").eq("player_id", id).order("entry_date", { ascending: false }).limit(1000),
      ]);
      if (w.error) throw w.error;
      if (s.error) throw s.error;
      return { w: w.data as unknown as WellnessEntry[], s: s.data as unknown as SessionEntry[] };
    },
  });

  const items = useMemo<Item[]>(() => {
    const all: Item[] = [
      ...(data?.w ?? []).map((e) => ({ kind: "w" as const, id: e.id, date: e.entry_date, created: e.created_at, e })),
      ...(data?.s ?? []).map((e) => ({ kind: "s" as const, id: e.id, date: e.entry_date, created: e.created_at, e })),
    ];
    return all
      .filter((i) => filter === "all" || i.kind === filter)
      .sort((a, b) => (b.date + b.created).localeCompare(a.date + a.created));
  }, [data, filter]);

  const sel = items.find((i) => i.id === selId) ?? items[0];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link to="/jugador/$id" params={{ id }} className="mb-1 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> Volver a la ficha
          </Link>
          <p className="font-display text-sm uppercase tracking-widest text-accent">Todas las respuestas</p>
          <h1 className="font-display text-4xl font-bold uppercase">{player?.full_name ?? "…"}</h1>
        </div>
        <div className="flex gap-1 rounded-md border border-border bg-card p-1">
          {([["all", "Todas"], ["w", "Pre-entreno"], ["s", "Post-entreno"]] as const).map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k)}
              className={cn("rounded px-3 py-1.5 text-sm", filter === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>{l}</button>
          ))}
        </div>
      </div>

      {isLoading ? <p className="text-muted-foreground">Cargando…</p> : !items.length ? (
        <p className="text-muted-foreground">Este jugador todavía no tiene respuestas.</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
          <Panel title={`Historial (${items.length})`}>
            <ul className="max-h-[640px] space-y-2 overflow-y-auto pr-1">
              {items.map((i) => {
                const pains = Object.keys(i.e.pain_zones ?? {}).length;
                return (
                  <li key={i.id}>
                    <button onClick={() => setSelId(i.id)}
                      className={cn("w-full rounded-md border-l-4 border border-border p-2.5 text-left transition-colors",
                        i.kind === "w" ? "border-l-primary" : "border-l-accent",
                        sel?.id === i.id ? "bg-muted" : "bg-card hover:bg-muted/50")}>
                      <div className="flex items-center justify-between text-sm font-medium">
                        <span className="flex items-center gap-1.5">
                          {i.kind === "w" ? <Sun className="size-4 text-primary" /> : <Flag className="size-4 text-accent" />}
                          {i.kind === "w" ? "Pre-entreno" : (i.e as SessionEntry).session_type ?? "Post-entreno"}
                        </span>
                        <span className="text-muted-foreground">{format(parseISO(i.date), "dd/MM/yyyy")}</span>
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {i.kind === "w"
                          ? `Wellness ${wellnessPct(i.e)}% · ${i.e.sleep_hours} h sueño`
                          : `${i.e.team} · RPE ${i.e.rpe} · ${i.e.duration_min}′ · ${i.e.load} UA`}
                        {pains ? ` · ${pains} zona${pains > 1 ? "s" : ""} con dolor` : ""}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Panel>

          {sel && <Detail item={sel} />}
        </div>
      )}
    </div>
  );
}

function Detail({ item }: { item: Item }) {
  const pain = item.e.pain_zones ?? {};
  const rows: [string, string][] = item.kind === "w"
    ? [
        ["Wellness total", `${wellnessPct(item.e)}%`],
        ["Calidad del sueño", `${item.e.sleep_quality}/5`],
        ["Horas dormidas", `${item.e.sleep_hours} h`],
        ["Fatiga (5 = fresco)", `${item.e.fatigue}/5`],
        ["Dolor muscular (5 = sin dolor)", `${item.e.soreness}/5`],
        ["Estrés (5 = relajado)", `${item.e.stress}/5`],
        ["Ánimo", `${item.e.mood}/5`],
      ]
    : [
        ["Tipo de sesión", item.e.session_type ?? "Entrenamiento"],
        ["Equipo", item.e.team],
        ["Duración", `${item.e.duration_min} min`],
        ["RPE", `${item.e.rpe}/10`],
        ["Carga", `${item.e.load} UA`],
        ["Fatiga muscular (5 = agotado)", `${item.e.fatigue}/5`],
      ];

  return (
    <Panel title={`${item.kind === "w" ? "Pre-entreno" : "Post-entreno"} · ${format(parseISO(item.date), "dd/MM/yyyy")}`}
      className={cn("border-l-4", item.kind === "w" ? "border-l-primary" : "border-l-accent")}>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <dl className="divide-y divide-border text-sm">
            {rows.map(([k, v]) => (
              <div key={k} className="flex justify-between py-1.5"><dt className="text-muted-foreground">{k}</dt><dd className="font-medium">{v}</dd></div>
            ))}
          </dl>
          {item.kind === "s" && item.e.comments && (
            <div className="border-l-2 border-accent pl-3 text-sm">{item.e.comments}</div>
          )}
          <div>
            <h3 className="mb-1 font-display text-xs uppercase tracking-widest text-muted-foreground">Zonas con dolor</h3>
            {Object.keys(pain).length ? (
              <ul className="space-y-1 text-sm">
                {Object.entries(pain).map(([z, l]) => (
                  <li key={z} className="flex justify-between"><span>{zoneLabel(z)}</span><span>{LEVEL[l]}</span></li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted-foreground">Sin dolor reportado.</p>}
          </div>
        </div>
        <div>
          <BodyMap value={pain} />
          <div className="mt-3"><PainLegend /></div>
        </div>
      </div>
    </Panel>
  );
}
