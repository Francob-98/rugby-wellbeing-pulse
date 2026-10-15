import { createFileRoute, Link } from "@tanstack/react-router";
import { Sun, Flag, LineChart } from "lucide-react";
import { ClubBrand } from "@/components/ClubBrand";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CBMM Rugby · Wellness y control de cargas" },
      { name: "description", content: "Cuestionarios de wellness pre y post entrenamiento para el plantel del Club Biblioteca Mariano Moreno." },
      { property: "og:title", content: "CBMM Rugby · Wellness y control de cargas" },
      { property: "og:description", content: "Contanos cómo llegás y cómo terminás cada entrenamiento." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="stripe-bg flex min-h-screen flex-col bg-pitch text-pitch-foreground">
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col px-6 py-10">
        <ClubBrand className="text-pitch-foreground" />
        <p className="mt-8 font-display text-sm font-semibold uppercase tracking-[0.2em] text-pitch-foreground/60">Club Biblioteca Mariano Moreno</p>
        <h1 className="mt-4 font-display text-6xl font-bold uppercase leading-[0.9]">
          Cómo<br />llegás.<br /><span className="text-primary">Cómo</span><br /><span className="text-primary">terminás.</span>
        </h1>
        <p className="mt-6 max-w-sm text-pitch-foreground/75">Dos minutos antes y después de cada entrenamiento para cuidar tu carga.</p>

        <div className="mt-10 space-y-3">
          <Link to="/wellness" className="group flex items-center gap-4 rounded-lg bg-card p-5 text-card-foreground transition-transform hover:-translate-y-0.5">
            <Sun className="size-8 text-accent" />
            <div>
              <div className="font-display text-2xl font-bold uppercase">Wellness</div>
              <div className="text-sm text-muted-foreground">Antes del entrenamiento</div>
            </div>
          </Link>
          <Link to="/post-entreno" className="group flex items-center gap-4 rounded-lg bg-accent p-5 text-accent-foreground transition-transform hover:-translate-y-0.5">
            <Flag className="size-8" />
            <div>
              <div className="font-display text-2xl font-bold uppercase">Post entreno</div>
              <div className="text-sm opacity-85">Esfuerzo, fatiga y dolores</div>
            </div>
          </Link>
        </div>

        <Link to="/panel" className="mt-auto flex items-center gap-2 pt-12 text-sm text-pitch-foreground/60 hover:text-pitch-foreground">
          <LineChart className="size-4" /> Acceso staff
        </Link>
      </div>
    </div>
  );
}
