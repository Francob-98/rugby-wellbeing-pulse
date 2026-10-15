import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { FormShell, Section } from "@/components/FormShell";
import { PlayerPicker } from "@/components/PlayerPicker";
import { ScalePicker } from "@/components/ScalePicker";
import { BodyMap, PainLegend } from "@/components/BodyMap";
import { SubmitDone } from "@/components/SubmitDone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRememberedPlayer } from "@/lib/use-remembered-player";
import { today } from "@/lib/metrics";
import type { PainZones } from "@/lib/constants";

export const Route = createFileRoute("/wellness")({
  head: () => ({
    meta: [
      { title: "Wellness pre-entreno · CBMM Rugby" },
      { name: "description", content: "Cuestionario de wellness antes del entrenamiento: sueño, fatiga, dolor, estrés y ánimo." },
      { property: "og:title", content: "Wellness pre-entreno · CBMM Rugby" },
      { property: "og:description", content: "Contale al staff cómo llegás al entrenamiento." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: WellnessPage,
});

type Scores = { sleep_quality: number | null; fatigue: number | null; soreness: number | null; stress: number | null; mood: number | null };
const empty: Scores = { sleep_quality: null, fatigue: null, soreness: null, stress: null, mood: null };

function WellnessPage() {
  const [playerId, setPlayerId] = useRememberedPlayer();
  const [date, setDate] = useState(today());
  const [hours, setHours] = useState("8");
  const [s, setS] = useState<Scores>(empty);
  const [pain, setPain] = useState<PainZones>({});
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const set = (k: keyof Scores) => (v: number) => setS((p) => ({ ...p, [k]: v }));

  const submit = async (): Promise<void> => {
    const h = Number(hours);
    if (!playerId) { toast.error("Elegí tu nombre"); return; }
    if (Object.values(s).some((v) => v == null)) { toast.error("Completá todas las escalas"); return; }
    if (!Number.isFinite(h) || h < 0 || h > 16) { toast.error("Horas de sueño inválidas"); return; }
    setSending(true);
    const { error } = await supabase.from("wellness_entries").insert({
      player_id: playerId,
      entry_date: date,
      sleep_hours: h,
      pain_zones: pain,
      ...(s as Required<{ [K in keyof Scores]: number }>),
    });
    setSending(false);
    if (error) { toast.error("No se pudo enviar. Probá de nuevo."); return; }
    setDone(true);
  };

  if (done)
    return (
      <FormShell kicker="Pre-entreno" title="Wellness">
        <SubmitDone message="Tu wellness quedó registrado. ¡Buen entrenamiento!" onAgain={() => { setS(empty); setPain({}); setDone(false); }} />
      </FormShell>
    );

  return (
    <FormShell kicker="Pre-entreno" title="Wellness">
      <div className="space-y-5">
        <Section title="Jugador">
          <PlayerPicker value={playerId} onChange={(id) => setPlayerId(id)} />
          <div className="space-y-1.5">
            <Label>Fecha</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-11 bg-card" />
          </div>
        </Section>

        <Section title="Sueño">
          <ScalePicker label="Calidad del sueño" value={s.sleep_quality} onChange={set("sleep_quality")} lowLabel="Muy mala" highLabel="Excelente" />
          <div className="space-y-1.5">
            <Label>Horas dormidas</Label>
            <Input type="number" inputMode="decimal" step="0.5" min={0} max={16} value={hours} onChange={(e) => setHours(e.target.value)} className="h-11 bg-card" />
          </div>
        </Section>

        <Section title="Cuerpo">
          <ScalePicker label="Fatiga" value={s.fatigue} onChange={set("fatigue")} lowLabel="Muy cansado" highLabel="Muy fresco" />
          <ScalePicker label="Dolor muscular" value={s.soreness} onChange={set("soreness")} lowLabel="Mucho dolor" highLabel="Sin dolor" />
        </Section>

        <Section title="Cabeza">
          <ScalePicker label="Estrés" value={s.stress} onChange={set("stress")} lowLabel="Muy estresado" highLabel="Muy relajado" />
          <ScalePicker label="Ánimo" value={s.mood} onChange={set("mood")} lowLabel="Muy bajo" highLabel="Excelente" />
        </Section>

        <Section title="¿Dónde te duele?">
          <PainLegend />
          <BodyMap value={pain} onChange={setPain} />
        </Section>

        <Button size="lg" className="h-14 w-full font-display text-xl uppercase" onClick={submit} disabled={sending}>
          {sending ? "Enviando…" : "Enviar wellness"}
        </Button>
      </div>
    </FormShell>
  );
}
