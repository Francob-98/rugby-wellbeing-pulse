import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PlayerPicker } from "@/components/PlayerPicker";

export const Route = createFileRoute("/_authenticated/jugador/")({
  head: () => ({
    meta: [
      { title: "Seguimiento individual · CBMM Rugby" },
      { name: "description", content: "Elegí un jugador para ver su wellness, carga y dolor." },
      { property: "og:title", content: "Seguimiento individual · CBMM Rugby" },
      { property: "og:description", content: "Datos individuales del plantel." },
    ],
  }),
  component: Pick,
});

function Pick() {
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-md space-y-4 py-10">
      <h1 className="font-display text-4xl font-bold uppercase">Seguimiento individual</h1>
      <p className="text-muted-foreground">Elegí un jugador.</p>
      <PlayerPicker value="" onlyActive={false} onChange={(id) => navigate({ to: "/jugador/$id", params: { id } })} />
    </div>
  );
}
