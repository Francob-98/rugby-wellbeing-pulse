import { BodyMap, PainLegend } from "@/components/BodyMap";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { PainZones } from "@/lib/constants";

export const DIFF_REASONS = ["Dolor muscular", "Golpe", "Rehabilitación", "Retorno progresivo", "Preventivo"] as const;
export const DIFF_RESTRICTIONS = ["Sin contacto", "Sin carrera máxima", "Volumen reducido", "Trabajo de gimnasio", "Recuperación"] as const;
export const DIFF_EVOLUTIONS = ["Mejoró", "Igual", "Empeoró"] as const;

export interface DiffData { reason: string; zones: PainZones; restriction: string; evolution: string; comment: string }
export const emptyDiff: DiffData = { reason: "", zones: {}, restriction: "", evolution: "", comment: "" };

export type DiffVariant = "pre" | "post";

export function diffError(d: DiffData, variant: DiffVariant) {
  if (!d.reason) return "Indicá el motivo del diferenciado";
  if (!Object.keys(d.zones).length) return "Marcá la zona afectada en el mapa";
  if (variant === "post") {
    if (!d.restriction) return "Indicá la restricción";
    if (!d.evolution) return "Indicá cómo evolucionaste";
  }
  return null;
}

function Pick({ label, value, options, onChange, placeholder }: { label: string; value: string; options: readonly string[]; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-11 bg-card"><SelectValue placeholder={placeholder} /></SelectTrigger>
        <SelectContent>{options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}

export function DifferentiatedFields({ value, onChange, variant }: { value: DiffData; onChange: (v: DiffData) => void; variant: DiffVariant }) {
  const set = <K extends keyof DiffData>(k: K) => (v: DiffData[K]) => onChange({ ...value, [k]: v });
  const isPre = variant === "pre";
  return (
    <div className="space-y-4 rounded-lg border-l-4 border-accent bg-accent/5 p-4">
      <p className="text-sm text-muted-foreground">
        {isPre ? "Rápido: elegí el motivo y marcá la zona en el mapa." : "Esta información la ve el kinesiólogo para tu seguimiento."}
      </p>
      <Pick label="Motivo de la adaptación" value={value.reason} options={DIFF_REASONS} onChange={set("reason")} placeholder="¿Por qué estás en diferenciado?" />
      <div className="space-y-2">
        <Label>Zona afectada</Label>
        <PainLegend />
        <BodyMap value={value.zones} onChange={set("zones")} />
      </div>
      {!isPre && <Pick label="Restricción indicada" value={value.restriction} options={DIFF_RESTRICTIONS} onChange={set("restriction")} placeholder="Elegí restricción" />}
      {!isPre && <Pick label="Evolución respecto de la última sesión" value={value.evolution} options={DIFF_EVOLUTIONS} onChange={set("evolution")} placeholder="¿Cómo venís?" />}
      <div className="space-y-1.5">
        <Label>{isPre ? "Observación breve (opcional)" : "¿Cómo te sentiste?"}</Label>
        <Textarea
          value={value.comment}
          onChange={(e) => set("comment")(e.target.value)}
          maxLength={1000}
          placeholder={isPre ? "Algo que el kinesiólogo deba saber antes de empezar…" : "Cómo respondió el cuerpo, qué te molestó, cómo terminaste…"}
          className={isPre ? "min-h-16 bg-card" : "min-h-24 bg-card"}
        />
      </div>
    </div>
  );
}
