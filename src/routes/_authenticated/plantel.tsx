import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePlayers } from "@/components/PlayerPicker";
import { useMyRoles } from "@/lib/staff-data";
import { TEAMS } from "@/lib/constants";
import { Panel } from "@/components/staff/Widgets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/plantel")({
  head: () => ({
    meta: [
      { title: "Plantel · CBMM Rugby" },
      { name: "description", content: "Administrá jugadores, links de cuestionarios y accesos del staff." },
      { property: "og:title", content: "Plantel · CBMM Rugby" },
      { property: "og:description", content: "Gestión del plantel." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PlantelPage,
});

function TeamSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="bg-card"><SelectValue /></SelectTrigger>
      <SelectContent>{TEAMS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
    </Select>
  );
}

function PlantelPage() {
  const qc = useQueryClient();
  const { data: players = [] } = usePlayers();
  const { data: me } = useMyRoles();
  const [names, setNames] = useState("");
  const [filter, setFilter] = useState("");
  const refresh = () => qc.invalidateQueries({ queryKey: ["players"] });

  const add = async (): Promise<void> => {
    const list = names.split("\n").map((n) => n.trim()).filter(Boolean).slice(0, 100);
    if (!list.length) { toast.error("Escribí al menos un nombre"); return; }
    const { error } = await supabase.from("players").insert(list.map((full_name) => ({ full_name: full_name.slice(0, 100), team: "Sin asignar" })));
    if (error) { toast.error("No se pudo guardar"); return; }
    toast.success(`${list.length} jugador(es) agregados`);
    setNames("");
    refresh();
  };

  const update = async (id: string, patch: { team?: string; active?: boolean; position?: string | null }) => {
    const { error } = await supabase.from("players").update(patch).eq("id", id);
    if (error) toast.error("No se pudo actualizar");
    refresh();
  };

  const remove = async (id: string, name: string) => {
    if (!confirm(`¿Borrar a ${name} y todos sus registros?`)) return;
    const { error } = await supabase.from("players").delete().eq("id", id);
    if (error) toast.error("No se pudo borrar");
    refresh();
  };

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const copy = (path: string) => { navigator.clipboard.writeText(origin + path); toast.success("Link copiado"); };
  const shown = players.filter((p) => p.full_name.toLowerCase().includes(filter.toLowerCase()) || p.team.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="space-y-5">
      <h1 className="font-display text-4xl font-bold uppercase">Plantel</h1>

      <div className="grid gap-3 md:grid-cols-2">
        {[{ path: "/wellness", label: "Link wellness (pre-entreno)" }, { path: "/post-entreno", label: "Link post entreno" }].map((l) => (
          <div key={l.path} className="flex items-center justify-between gap-3 rounded-lg bg-pitch p-4 text-pitch-foreground">
            <div className="min-w-0">
              <div className="font-display text-sm uppercase tracking-widest text-accent">{l.label}</div>
              <div className="truncate text-sm opacity-80">{origin}{l.path}</div>
            </div>
            <Button size="sm" variant="secondary" onClick={() => copy(l.path)}><Copy className="size-4" />Copiar</Button>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        <Panel title="Agregar jugadores">
          <div className="space-y-3">
            <Textarea value={names} onChange={(e) => setNames(e.target.value)} placeholder={"Un nombre por línea\nJuan Pérez\nMartín Gómez"} className="min-h-32 bg-card" />
            <Button className="w-full" onClick={add}>Agregar</Button>
          </div>
        </Panel>

        <Panel title={`Jugadores (${players.length})`} action={<Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Buscar…" className="h-8 w-40" />}>
          <div className="max-h-[560px] overflow-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Equipo</TableHead><TableHead>Activo</TableHead><TableHead /></TableRow></TableHeader>
              <TableBody>
                {shown.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.full_name}</TableCell>
                    <TableCell className="w-48"><TeamSelect value={p.team} onChange={(t) => update(p.id, { team: t })} /></TableCell>
                    <TableCell><Switch checked={p.active} onCheckedChange={(v) => update(p.id, { active: v })} /></TableCell>
                    <TableCell><Button size="icon" variant="ghost" onClick={() => remove(p.id, p.full_name)}><Trash2 className="size-4" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Panel>
      </div>

      {me?.roles.includes("admin") && <StaffAdmin />}
    </div>
  );
}

function StaffAdmin() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["staff-admin"],
    queryFn: async () => {
      const [p, r] = await Promise.all([
        supabase.from("profiles").select("id, email, full_name").order("created_at"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      return (p.data ?? []).map((x) => ({ ...x, roles: (r.data ?? []).filter((y) => y.user_id === x.id).map((y) => y.role) }));
    },
  });
  const toggle = useMutation({
    mutationFn: async ({ id, approve }: { id: string; approve: boolean }) => {
      const { error } = approve
        ? await supabase.from("user_roles").insert({ user_id: id, role: "staff" })
        : await supabase.from("user_roles").delete().eq("user_id", id).eq("role", "staff");
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff-admin"] }),
    onError: () => toast.error("No se pudo actualizar"),
  });

  return (
    <Panel title="Accesos del staff">
      <Table>
        <TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Email</TableHead><TableHead>Rol</TableHead><TableHead /></TableRow></TableHeader>
        <TableBody>
          {(data ?? []).map((u) => {
            const isAdmin = u.roles.includes("admin");
            const isStaff = u.roles.includes("staff");
            return (
              <TableRow key={u.id}>
                <TableCell>{u.full_name ?? "—"}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>{isAdmin ? "Admin" : isStaff ? "Staff" : "Pendiente"}</TableCell>
                <TableCell className="text-right">
                  {!isAdmin && (
                    <Button size="sm" variant={isStaff ? "outline" : "default"} onClick={() => toggle.mutate({ id: u.id, approve: !isStaff })}>
                      {isStaff ? "Quitar acceso" : "Aprobar"}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Panel>
  );
}
