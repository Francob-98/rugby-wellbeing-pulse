import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export function PlayerResponseDates({ playerId, phase, line, date, dateTo, onSelect }: {
  playerId: string;
  phase: string;
  line: string;
  date: string;
  dateTo: string;
  onSelect: (date: string) => void;
}) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["player-response-dates", playerId],
    enabled: Boolean(playerId),
    queryFn: async () => {
      async function readDates(table: "wellness_entries" | "session_entries") {
        const entries: { id: string; entry_date: string; player_line: string | null }[] = [];
        for (let offset = 0; ; offset += 500) {
          const result = await supabase.from(table).select("id, entry_date, player_line")
            .eq("player_id", playerId).order("entry_date", { ascending: false }).order("id")
            .range(offset, offset + 499);
          if (result.error) throw result.error;
          entries.push(...result.data);
          if (result.data.length < 500) return entries;
        }
      }
      const [pre, post] = await Promise.all([readDates("wellness_entries"), readDates("session_entries")]);
      return { pre, post };
    },
  });

  if (!playerId) return null;
  const dates = new Map<string, { pre: number; post: number }>();
  for (const kind of ["pre", "post"] as const) {
    if (phase !== "all" && phase !== kind) continue;
    for (const entry of data?.[kind] ?? []) {
      if (line !== "all" && entry.player_line !== line) continue;
      const counts = dates.get(entry.entry_date) ?? { pre: 0, post: 0 };
      counts[kind] += 1;
      dates.set(entry.entry_date, counts);
    }
  }

  return (
    <section aria-label="Respuestas guardadas" className="mt-5 border-y border-border py-4">
      <h2 className="mb-3 flex items-center gap-2 font-display text-xl font-semibold uppercase">
        <CalendarDays className="size-5 text-primary" /> Respuestas guardadas
      </h2>
      {isLoading ? <p className="text-sm text-muted-foreground">Cargando fechas…</p> : isError ? (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-destructive">No se pudieron cargar las respuestas.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>Reintentar</Button>
        </div>
      ) : dates.size === 0 ? <p className="text-sm text-muted-foreground">Sin respuestas para los filtros seleccionados.</p> : (
        <ul className="grid max-h-64 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
          {[...dates].sort(([a], [b]) => b.localeCompare(a)).map(([entryDate, counts]) => {
            const selected = date === entryDate && dateTo === entryDate;
            return (
              <li key={entryDate}>
                <Button variant={selected ? "default" : "outline"} aria-pressed={selected}
                  aria-label={`Ver respuestas del ${format(parseISO(entryDate), "dd/MM/yyyy")}`}
                  onClick={() => onSelect(entryDate)} className="h-auto w-full flex-col items-start gap-1 whitespace-normal px-3 py-2.5 text-left">
                  <span className="font-semibold">{format(parseISO(entryDate), "dd/MM/yyyy")}</span>
                  <span className="text-xs font-normal">
                    {counts.pre > 0 && `${counts.pre} pre-entreno`}
                    {counts.pre > 0 && counts.post > 0 && " · "}
                    {counts.post > 0 && `${counts.post} post-entreno`}
                  </span>
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}