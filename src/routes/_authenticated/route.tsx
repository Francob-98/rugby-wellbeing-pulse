import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LayoutDashboard, User, Users, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMyRoles } from "@/lib/staff-data";
import { Button } from "@/components/ui/button";
import { ClubBrand } from "@/components/ClubBrand";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: StaffShell,
});

function StaffShell() {
  const { data, isLoading } = useMyRoles();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  if (isLoading) return <div className="p-10 text-muted-foreground">Cargando…</div>;

  if (!data?.roles.length)
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-sm rounded-lg border border-border bg-card p-6 text-center">
          <h1 className="font-display text-2xl font-bold uppercase">Cuenta pendiente</h1>
          <p className="mt-2 text-sm text-muted-foreground">El administrador del staff tiene que aprobar tu acceso ({data?.email}).</p>
          <Button variant="outline" className="mt-4" onClick={signOut}>Salir</Button>
        </div>
      </div>
    );

  const nav = [
    { to: "/panel", label: "General", icon: LayoutDashboard },
    { to: "/jugador", label: "Individual", icon: User },
    { to: "/plantel", label: "Plantel", icon: Users },
  ] as const;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-pitch text-pitch-foreground">
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3">
          <ClubBrand to="/panel" compact className="text-pitch-foreground" />
          <nav className="flex gap-1">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-pitch-foreground/70 hover:text-pitch-foreground"
                activeProps={{ className: "bg-sidebar-accent text-pitch-foreground" }}
              >
                <n.icon className="size-4" /><span className="hidden sm:inline">{n.label}</span>
              </Link>
            ))}
          </nav>
          <button onClick={signOut} className="ml-auto flex items-center gap-1.5 text-sm text-pitch-foreground/60 hover:text-pitch-foreground">
            <LogOut className="size-4" /><span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
