import { cn } from "@/lib/utils";
import type { PainZones } from "@/lib/constants";

type Shape =
  | { kind: "rect"; x: number; y: number; w: number; h: number; r?: number }
  | { kind: "ellipse"; cx: number; cy: number; rx: number; ry: number };

interface ZoneDef {
  id: string;
  label: string;
  view: "front" | "back";
  shape: Shape;
}

// Pairs: base definition on viewer-left side (x < 100), mirrored to the right.
const pair = (
  view: "front" | "back",
  key: string,
  label: string,
  shape: Shape,
): ZoneDef[] => {
  const mirror = (s: Shape): Shape =>
    s.kind === "rect" ? { ...s, x: 200 - s.x - s.w } : { ...s, cx: 200 - s.cx };
  // Front view: viewer-left is the player's right. Back view: viewer-left is player's left.
  const leftSide = view === "front" ? "der" : "izq";
  const rightSide = view === "front" ? "izq" : "der";
  const name = (s: string) => (s === "der" ? "derecho" : "izquierdo");
  return [
    { id: `${key}_${leftSide}`, label: `${label} ${name(leftSide)}`, view, shape },
    { id: `${key}_${rightSide}`, label: `${label} ${name(rightSide)}`, view, shape: mirror(shape) },
  ];
};

const FRONT: ZoneDef[] = [
  { id: "cabeza", label: "Cabeza", view: "front", shape: { kind: "ellipse", cx: 100, cy: 30, rx: 18, ry: 22 } },
  { id: "cuello", label: "Cuello", view: "front", shape: { kind: "rect", x: 91, y: 52, w: 18, h: 12, r: 3 } },
  ...pair("front", "hombro", "Hombro", { kind: "ellipse", cx: 68, cy: 76, rx: 13, ry: 11 }),
  { id: "pecho", label: "Pecho", view: "front", shape: { kind: "rect", x: 79, y: 66, w: 42, h: 38, r: 6 } },
  { id: "abdomen", label: "Abdomen", view: "front", shape: { kind: "rect", x: 81, y: 106, w: 38, h: 38, r: 6 } },
  ...pair("front", "biceps", "Brazo", { kind: "rect", x: 52, y: 89, w: 14, h: 42, r: 6 }),
  ...pair("front", "antebrazo", "Antebrazo", { kind: "rect", x: 48, y: 134, w: 13, h: 42, r: 6 }),
  ...pair("front", "mano", "Mano/muñeca", { kind: "ellipse", cx: 54, cy: 189, rx: 8, ry: 11 }),
  ...pair("front", "ingle", "Cadera/ingle", { kind: "rect", x: 79, y: 146, w: 20, h: 22, r: 6 }),
  ...pair("front", "cuadriceps", "Cuádriceps", { kind: "rect", x: 78, y: 170, w: 20, h: 68, r: 8 }),
  ...pair("front", "rodilla", "Rodilla", { kind: "ellipse", cx: 88, cy: 249, rx: 10, ry: 9 }),
  ...pair("front", "tibia", "Tibia", { kind: "rect", x: 81, y: 261, w: 15, h: 66, r: 7 }),
  ...pair("front", "tobillo", "Tobillo/pie", { kind: "ellipse", cx: 88, cy: 340, rx: 10, ry: 9 }),
];

const BACK: ZoneDef[] = [
  { id: "nuca", label: "Nuca", view: "back", shape: { kind: "ellipse", cx: 100, cy: 30, rx: 18, ry: 22 } },
  { id: "cervical", label: "Cervical", view: "back", shape: { kind: "rect", x: 91, y: 52, w: 18, h: 12, r: 3 } },
  ...pair("back", "trapecio", "Hombro post.", { kind: "ellipse", cx: 68, cy: 76, rx: 13, ry: 11 }),
  { id: "dorsal", label: "Espalda alta", view: "back", shape: { kind: "rect", x: 79, y: 66, w: 42, h: 38, r: 6 } },
  { id: "lumbar", label: "Zona lumbar", view: "back", shape: { kind: "rect", x: 81, y: 106, w: 38, h: 38, r: 6 } },
  ...pair("back", "triceps", "Tríceps", { kind: "rect", x: 52, y: 89, w: 14, h: 42, r: 6 }),
  ...pair("back", "codo", "Codo/antebrazo", { kind: "rect", x: 48, y: 134, w: 13, h: 42, r: 6 }),
  ...pair("back", "gluteo", "Glúteo", { kind: "rect", x: 79, y: 146, w: 20, h: 22, r: 6 }),
  ...pair("back", "isquio", "Isquiotibial", { kind: "rect", x: 78, y: 170, w: 20, h: 68, r: 8 }),
  ...pair("back", "hueco", "Hueco poplíteo", { kind: "ellipse", cx: 88, cy: 249, rx: 10, ry: 9 }),
  ...pair("back", "gemelo", "Gemelo", { kind: "rect", x: 81, y: 261, w: 15, h: 66, r: 7 }),
  ...pair("back", "aquiles", "Aquiles/talón", { kind: "ellipse", cx: 88, cy: 340, rx: 10, ry: 9 }),
];

export const ALL_ZONES = [...FRONT, ...BACK];
export const zoneLabel = (id: string) => ALL_ZONES.find((z) => z.id === id)?.label ?? id;

const levelFill = (v: number) =>
  v >= 3 ? "var(--pain-3)" : v === 2 ? "var(--pain-2)" : "var(--pain-1)";

function ShapeEl({ s, ...props }: { s: Shape } & React.SVGProps<SVGElement>) {
  if (s.kind === "rect")
    return <rect x={s.x} y={s.y} width={s.w} height={s.h} rx={s.r ?? 4} {...(props as React.SVGProps<SVGRectElement>)} />;
  return <ellipse cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} {...(props as React.SVGProps<SVGEllipseElement>)} />;
}

interface BodyMapProps {
  /** Input mode: zone -> level 1..3. */
  value?: PainZones;
  onChange?: (v: PainZones) => void;
  /** Heat mode: zone -> count; colored by relative intensity. */
  heat?: Record<string, number>;
  className?: string;
}

export function BodyMap({ value, onChange, heat, className }: BodyMapProps) {
  const heatMax = heat ? Math.max(1, ...Object.values(heat)) : 1;

  const toggle = (id: string) => {
    if (!onChange || !value) return;
    const next = { ...value };
    const cur = next[id] ?? 0;
    if (cur >= 3) delete next[id];
    else next[id] = cur + 1;
    onChange(next);
  };

  const renderView = (zones: ZoneDef[], title: string) => (
    <div className="flex flex-col items-center">
      <span className="mb-1 font-display text-xs uppercase tracking-widest text-muted-foreground">{title}</span>
      <svg viewBox="30 0 140 360" className="h-auto w-full max-w-[170px]">
        {zones.map((z) => {
          let fill = "var(--body-zone)";
          let opacity = 1;
          if (value && value[z.id]) fill = levelFill(value[z.id]);
          if (heat && heat[z.id]) {
            fill = "var(--pain-3)";
            opacity = 0.25 + 0.75 * (heat[z.id] / heatMax);
          }
          return (
            <ShapeEl
              key={z.id}
              s={z.shape}
              fill={fill}
              fillOpacity={opacity}
              stroke="var(--background)"
              strokeWidth={1.5}
              className={cn(onChange && "cursor-pointer transition-[fill] hover:brightness-95")}
              onClick={() => toggle(z.id)}
            >
              <title>{z.label + (heat?.[z.id] ? ` — ${heat[z.id]} reportes` : "")}</title>
            </ShapeEl>
          );
        })}
      </svg>
    </div>
  );

  return (
    <div className={cn("grid grid-cols-2 gap-4", className)}>
      {renderView(FRONT, "Frente")}
      {renderView(BACK, "Espalda")}
    </div>
  );
}

export function PainLegend({ heat }: { heat?: boolean }) {
  if (heat)
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Menos</span>
        <span className="h-2 w-24 rounded-full bg-gradient-to-r from-pain-3/25 to-pain-3" />
        <span>Más reportes</span>
      </div>
    );
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
      <span className="flex items-center gap-1"><span className="size-3 rounded-sm bg-pain-1" />Leve</span>
      <span className="flex items-center gap-1"><span className="size-3 rounded-sm bg-pain-2" />Moderado</span>
      <span className="flex items-center gap-1"><span className="size-3 rounded-sm bg-pain-3" />Intenso</span>
      <span>· Tocá la zona para subir la intensidad; un toque más la borra.</span>
    </div>
  );
}
