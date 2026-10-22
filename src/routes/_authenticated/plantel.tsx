import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, UserMinus, UserPlus, ShieldCheck, ShieldX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePlayers } from "@/components/PlayerPicker";
import { useMyRoles } from "@/lib/staff-data";
import { playerStatusPatch, staffActions, type StaffDecision } from "@/lib/roster-rules";
import { Panel } from "@/components/staff/Widgets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

function PlantelPage() {
  const qc = useQueryClient();
  const { data: players = [] } = usePlayers();
  const { data: me } = useMyRoles();
  const [names, setNames] = useState("");
  const [filter, setFilter] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);
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

  const setActive = async (id: string, name: string, active: boolean) => {
    if (!active && !confirm(`¿Marcar a ${name} como desafectado? Su historial se conserva.`)) return;
    setUpdating(id);
    try {
      const { error } = await supabase.from("players").update(playerStatusPatch(active)).eq("id", id).select("id").single();
      if (error) throw error;
      toast.success(active ? "Jugador reincorporado" : "Jugador desafectado; historial conservado");
      await refresh();
    } catch { toast.error("No se pudo actualizar el estado"); }
    finally { setUpdating(null); }
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
              <TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Estado</TableHead><TableHead /></TableRow></TableHeader>
              <TableBody>
                {shown.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.full_name}</TableCell>
                    <TableCell className={p.active ? "text-success" : "text-muted-foreground"}>{p.active ? "Activo" : "Desafectado"}</TableCell>
                    <TableCell className="text-right"><Button size="sm" variant="outline" disabled={updating !== null} onClick={() => setActive(p.id, p.full_name, !p.active)}>{p.active ? <UserMinus className="size-4" /> : <UserPlus className="size-4" />}{p.active ? "Desafectar" : "Reincorporar"}</Button></TableCell>
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
      const [p, r, decisions] = await Promise.all([
        supabase.from("profiles").select("id, email, full_name").order("created_at"),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("staff_access_decisions").select("user_id, status"),
      ]);
      if (p.error || r.error || decisions.error) throw p.error ?? r.error ?? decisions.error;
      return (p.data ?? []).map((x) => ({ ...x, status: decisions.data?.find((d) => d.user_id === x.id)?.status, roles: (r.data ?? []).filter((y) => y.user_id === x.id).map((y) => y.role) }));
    },
  });
  const toggle = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: StaffDecision }) => {
      const { error } = await supabase.rpc("decide_staff_access", { _user_id: id, _status: status });
      if (error) throw error;
    },
    onSuccess: async () => { toast.success("Acceso actualizado"); await qc.invalidateQueries({ queryKey: ["staff-admin"] }); },
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
                <TableCell>{isAdmin ? "Admin" : isStaff ? "Staff" : u.status === "rejected" ? "Rechazado" : u.status === "revoked" ? "Acceso retirado" : "Pendiente"}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">{staffActions(u.roles, u.status).map((status) => <Button key={status} size="sm" variant={status === "approved" ? "default" : "outline"} disabled={toggle.isPending} onClick={() => {
                    if (status !== "approved" && !confirm(`${status === "rejected" ? "¿Rechazar" : "¿Retirar"} el acceso de ${u.full_name || u.email}?`)) return;
                    toggle.mutate({ id: u.id, status });
                  }}>{status === "approved" ? <ShieldCheck className="size-4" /> : <ShieldX className="size-4" />}{status === "approved" ? "Aprobar" : status === "rejected" ? "Rechazar" : "Quitar acceso"}</Button>)}</div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Panel>
  );
}
