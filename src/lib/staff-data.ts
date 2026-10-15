import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { daysAgo, type SessionEntry, type WellnessEntry } from "./metrics";

export function useEntries(days: number, playerId?: string) {
  const since = daysAgo(Math.max(days, 28) - 1);
  return useQuery({
    queryKey: ["entries", since, playerId ?? "all"],
    queryFn: async () => {
      let w = supabase.from("wellness_entries").select("*").gte("entry_date", since).order("entry_date");
      let s = supabase.from("session_entries").select("*").gte("entry_date", since).order("entry_date");
      if (playerId) {
        w = w.eq("player_id", playerId);
        s = s.eq("player_id", playerId);
      }
      const [wr, sr] = await Promise.all([w.limit(5000), s.limit(5000)]);
      if (wr.error) throw wr.error;
      if (sr.error) throw sr.error;
      return { wellness: wr.data as unknown as WellnessEntry[], sessions: sr.data as unknown as SessionEntry[] };
    },
  });
}

export function useMyRoles() {
  return useQuery({
    queryKey: ["my-roles"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return { roles: [] as string[], email: "" };
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id);
      return { roles: (data ?? []).map((r) => r.role as string), email: u.user.email ?? "" };
    },
  });
}

export function useReportEntries(date: string) {
  return useQuery({
    queryKey: ["report-entries", date],
    queryFn: async () => {
      async function readAll(table: "wellness_entries" | "session_entries") {
        const entries = [];
        for (let offset = 0; ; offset += 500) {
          const result = await supabase.from(table).select("*").eq("entry_date", date)
            .order("created_at").order("id").range(offset, offset + 499);
          if (result.error) throw result.error;
          entries.push(...result.data);
          if (result.data.length < 500) return entries;
        }
      }
      const [wellness, sessions] = await Promise.all([readAll("wellness_entries"), readAll("session_entries")]);
      return { wellness: wellness as unknown as WellnessEntry[], sessions: sessions as unknown as SessionEntry[] };
    },
  });
}
