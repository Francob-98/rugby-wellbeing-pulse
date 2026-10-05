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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRememberedPlayer } from "@/lib/use-remembered-player";
import { today } from "@/lib/metrics";
import { RPE_LABELS, TEAMS, SESSION_TYPES, type PainZones } from "@/lib/constants";

export const Route = createFileRoute("/post-entreno")({
  head: () => ({
    meta: [
      { title: "Post entreno · CBMM Rugby" },
      { name: "description", content: "Registrá esfuerzo percibido (RPE), duración, fatiga y dolores al terminar el entrenamiento." },
      { property: "og:title", content: "Post entreno · CBMM Rugby" },
      { property: "og:description", content: "Contale al staff cómo terminaste el entrenamiento." },
    ],
  }),
  component: PostPage,
});

function PostPage() {
  const [playerId, setPlayerId] = useRememberedPlayer();
  const [team, setTeam] = useState("");
  const [kind, setKind] = useState("");
  const [date, setDate] = useState(today());
  const [duration, setDuration] = useState("90");
  const [rpe, setRpe] = useState<number | null>(null);
  const [fatigue, setFatigue] = useState<number | null>(null);
  const [pain, setPain] = useState<PainZones>({});
  const [comments, setComments] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (): Promise<void> => {
    const d = Number(duration);
    if (!playerId) { toast.error("Elegí tu nombre"); return; }
    if (!team) { toast.error("Elegí el equipo en el que participaste"); return; }
    if (!kind) { toast.error("Elegí si fue entrenamiento o partido"); return; }
    if (!rpe || !fatigue) { toast.error("Completá RPE y fatiga"); return; }
    if (!Number.isInteger(d) || d < 1 || d > 300) { toast.error("Duración inválida (minutos)"); return; }
    setSending(true);
    const { error } = await supabase.from("session_entries").insert({
      player_id: playerId,
      entry_date: date,
      team,
      session_type: kind,
      duration_min: d,
      rpe,
      fatigue,
      pain_zones: pain,
      comments: comments.trim().slice(0, 1000) || null,
    });
    setSending(false);
    if (error) { toast.error("No se pudo enviar. Probá de nuevo."); return; }
    setDone(true);
  };

  if (done)
    return (
      <FormShell kicker="Post entreno" title="¿Cómo terminaste?">
        <SubmitDone message="Registro cargado. ¡A recuperar!" onAgain={() => { setRpe(null); setFatigue(null); setPain({}); setComments(""); setDone(false); }} />
      </FormShell>
    );

  return (
    <FormShell kicker="Post entreno" title="¿Cómo terminaste?">
      <div className="space-y-5">
        <Section title="Sesión">
          <PlayerPicker value={playerId} onChange={(id) => setPlayerId(id)} />
          <div className="space-y-1.5">
            <Label>Equipo en el que participaste</Label>
            <Select value={team} onValueChange={setTeam}>
              <SelectTrigger className="h-11 bg-card"><SelectValue placeholder="Elegí equipo" /></SelectTrigger>
              <SelectContent>{TEAMS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Tipo de sesión</Label>
            <Select value={kind} onValueChange={setKind}>
              <SelectTrigger className="h-11 bg-card"><SelectValue placeholder="¿Entrenamiento o partido?" /></SelectTrigger>
              <SelectContent>{SESSION_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Fecha</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-11 bg-card" />
            </div>
            <div className="space-y-1.5">
              <Label>Duración (min)</Label>
              <Input type="number" inputMode="numeric" min={1} max={300} value={duration} onChange={(e) => setDuration(e.target.value)} className="h-11 bg-card" />
            </div>
          </div>
        </Section>

        <Section title="Esfuerzo">
          <ScalePicker label="RPE" value={rpe} onChange={setRpe} min={1} max={10} lowLabel="Muy suave" highLabel="Máximo" hint={rpe ? RPE_LABELS[rpe] : undefined} />
          <ScalePicker label="Fatiga muscular" value={fatigue} onChange={setFatigue} lowLabel="Nada cansado" highLabel="Agotado" />
        </Section>

        <Section title="¿Dónde te duele?">
          <PainLegend />
          <BodyMap value={pain} onChange={setPain} />
        </Section>

        <Section title="Comentarios">
          <Textarea value={comments} onChange={(e) => setComments(e.target.value)} maxLength={1000} placeholder="Golpes, molestias, algo que el staff deba saber…" className="min-h-24 bg-card" />
        </Section>

        <Button size="lg" variant="destructive" className="h-14 w-full bg-accent font-display text-xl uppercase text-accent-foreground hover:bg-accent/90" onClick={submit} disabled={sending}>
          {sending ? "Enviando…" : "Enviar post entreno"}
        </Button>
      </div>
    </FormShell>
  );
}
