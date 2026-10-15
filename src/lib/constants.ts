export const TEAMS = [
  "Primera",
  "Intermedia",
  "Pre intermedia A",
  "Pre intermedia B",
  "Pre intermedia C",
  "Pre intermedia D",
  "Diferenciados",
] as const;

export const PAIN_LEVELS = [
  { value: 1, label: "Leve" },
  { value: 2, label: "Moderado" },
  { value: 3, label: "Intenso" },
] as const;

export const RPE_LABELS: Record<number, string> = {
  1: "Muy muy suave",
  2: "Suave",
  3: "Moderado",
  4: "Algo duro",
  5: "Duro",
  6: "Duro +",
  7: "Muy duro",
  8: "Muy duro +",
  9: "Casi máximo",
  10: "Máximo",
};

export type PainZones = Record<string, number>;
export const SESSION_TYPES = ["Entrenamiento", "Partido"] as const;
export const PLAYER_LINES = ["Forwards", "Backs"] as const;
