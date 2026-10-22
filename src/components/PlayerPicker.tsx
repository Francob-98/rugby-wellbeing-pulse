import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TEAMS } from "@/lib/constants";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface Player {
  id: string;
  full_name: string;
  team: string;
  position: string | null;
  active: boolean;
}

export function usePlayers() {
  return useQuery({
    queryKey: ["players"],
    queryFn: async () => {
      const { data, error } = await supabase.from("players").select("id, full_name, team, position, active").order("full_name");
      if (error) throw error;
      return data as Player[];
    },
  });
}

export function PlayerPicker({ value, onChange, onlyActive = true }: { value: string; onChange: (id: string, p?: Player) => void; onlyActive?: boolean }) {
  const { data = [], isLoading } = usePlayers();
  const list = onlyActive ? data.filter((p) => p.active) : data;
  useEffect(() => {
    if (!isLoading && onlyActive && value && !data.some((p) => p.id === value && p.active)) onChange("");
  }, [data, isLoading, onlyActive, value, onChange]);
  const groups = [...TEAMS, ...new Set(list.map((p) => p.team).filter((t) => !TEAMS.includes(t as never)))];
  return (
    <Select value={value} onValueChange={(id) => onChange(id, list.find((p) => p.id === id))}>
      <SelectTrigger className="h-12 bg-card text-base">
        <SelectValue placeholder={isLoading ? "Cargando plantel…" : "Elegí tu nombre"} />
      </SelectTrigger>
      <SelectContent>
        {groups.map((team) => {
          const ps = list.filter((p) => p.team === team);
          if (!ps.length) return null;
          return (
            <SelectGroup key={team}>
              <SelectLabel>{team}</SelectLabel>
              {ps.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.full_name}{!p.active ? " · Desafectado" : ""}</SelectItem>
              ))}
            </SelectGroup>
          );
        })}
      </SelectContent>
    </Select>
  );
}
