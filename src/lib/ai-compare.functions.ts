import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({
  dateA: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dateB: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  playerId: z.string().uuid().nullable(),
  team: z.string().max(60).nullable(),
  question: z.string().max(600).nullable(),
});

export type CompareMetrics = {
  respuestasPre: number; respuestasPost: number;
  wellness: number | null; sueno: number | null; frescura: number | null; sinDolor: number | null;
  rpe: number | null; duracion: number | null; carga: number; zonasDolor: number;
};
export type CompareChange = { player: string; trend: "mejora" | "igual" | "empeora"; detail: string };
export type AiChart = {
  type: "barras" | "barras_horizontales" | "lineas" | "radar" | "dona";
  title: string; insight: string; labels: string[];
  series: { name: string; values: number[] }[];
};
export type CompareResult =
  | { a: CompareMetrics; b: CompareMetrics; summary: string; changes: CompareChange[]; recommendations: string[]; answer: string; charts: AiChart[] }
  | { error: string };

const SYSTEM = `Sos un asistente de un preparador físico de rugby. Comparás datos subjetivos del plantel entre dos fechas (A = anterior/referencia, B = a comparar).
Wellness pre-entreno: escalas 1-5 donde 5 es SIEMPRE lo mejor (sleep_quality, fatigue=frescura, soreness=sin dolor, stress=calma, mood). Post-entreno: rpe 1-10, fatigue 1-5 donde 5 es agotado, load = RPE×minutos. pain_zones: zona→1 leve, 2 moderado, 3 intenso.
Explicá la evolución de fatiga, dolor, sueño y carga entre A y B, con lenguaje simple para entrenadores. No hagas diagnósticos médicos. Si hay una pregunta del preparador, respondela en "answer" (si no, "answer" vacío).
"changes": jugadores con cambios relevantes (máx 15), trend mejora/igual/empeora. Español rioplatense, breve.
"charts": de 1 a 3 gráficos elegidos según lo que mejor responda al análisis o pregunta, con valores numéricos REALES tomados de los datos (nunca inventes):
- "radar": perfil de wellness (Sueño, Frescura, Sin dolor, Calma, Ánimo, escala 1-5) con una serie por fecha.
- "barras": comparar A vs B por métrica, o forwards vs backs; una serie por fecha o grupo.
- "barras_horizontales": rankings (zonas de dolor más frecuentes, PSE por jugador); una sola serie.
- "lineas": evolución por jugador o por métrica entre A y B (labels = ["Fecha A","Fecha B"]).
- "dona": proporciones del grupo (ej. RPE ≥8 vs resto, con dolor vs sin dolor); una sola serie.
Cada serie debe tener tantos valores como labels. Máx 12 labels. "insight": una frase simple que explique qué muestra.`;

const SCHEMA = {
  type: "object", additionalProperties: false,
  required: ["summary", "changes", "recommendations", "answer", "charts"],
  properties: {
    summary: { type: "string" },
    answer: { type: "string" },
    recommendations: { type: "array", items: { type: "string" } },
    changes: { type: "array", items: { type: "object", additionalProperties: false, required: ["player", "trend", "detail"],
      properties: { player: { type: "string" }, trend: { type: "string", enum: ["mejora", "igual", "empeora"] }, detail: { type: "string" } } } },
    charts: { type: "array", items: { type: "object", additionalProperties: false, required: ["type", "title", "insight", "labels", "series"],
      properties: {
        type: { type: "string", enum: ["barras", "barras_horizontales", "lineas", "radar", "dona"] },
        title: { type: "string" }, insight: { type: "string" },
        labels: { type: "array", items: { type: "string" } },
        series: { type: "array", items: { type: "object", additionalProperties: false, required: ["name", "values"],
          properties: { name: { type: "string" }, values: { type: "array", items: { type: "number" } } } } },
      } } },
  },
};

type W = { sleep_quality: number; sleep_hours: number; fatigue: number; soreness: number; stress: number; mood: number; pain_zones: unknown };
type S = { rpe: number; duration_min: number; load: number | null; pain_zones: unknown };
const mean = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null);
const zones = (p: unknown) => (p && typeof p === "object" ? Object.keys(p as object).length : 0);

function metrics(w: W[], s: S[]): CompareMetrics {
  return {
    respuestasPre: w.length, respuestasPost: s.length,
    wellness: mean(w.map((e) => ((e.sleep_quality + e.fatigue + e.soreness + e.stress + e.mood) / 25) * 100)),
    sueno: mean(w.map((e) => Number(e.sleep_hours))), frescura: mean(w.map((e) => e.fatigue)), sinDolor: mean(w.map((e) => e.soreness)),
    rpe: mean(s.map((e) => e.rpe)), duracion: mean(s.map((e) => e.duration_min)),
    carga: s.reduce((a, e) => a + (e.load ?? e.rpe * e.duration_min), 0),
    zonasDolor: [...w, ...s].reduce((a, e) => a + zones(e.pain_zones), 0),
  };
}

export const compareDates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data, context }): Promise<CompareResult> => {
    const { supabase, userId } = context;
    const { data: staff } = await supabase.rpc("is_staff", { _user_id: userId });
    if (!staff) return { error: "Sin permiso de staff." };

    const load = async (date: string) => {
      let wq = supabase.from("wellness_entries").select("sleep_quality,sleep_hours,fatigue,soreness,stress,mood,pain_zones,player_id,players!inner(full_name,team)").eq("entry_date", date).limit(500);
      let sq = supabase.from("session_entries").select("team,session_type,duration_min,rpe,fatigue,load,pain_zones,comments,player_id,players(full_name)").eq("entry_date", date).limit(500);
      if (data.playerId) { wq = wq.eq("player_id", data.playerId); sq = sq.eq("player_id", data.playerId); }
      if (data.team) { wq = wq.eq("players.team", data.team); sq = sq.eq("team", data.team); }
      const [w, s] = await Promise.all([wq, sq]);
      if (w.error || s.error) throw new Error("read");
      return { w: w.data ?? [], s: s.data ?? [] };
    };
    let A, B;
    try { [A, B] = await Promise.all([load(data.dateA), load(data.dateB)]); }
    catch { return { error: "No se pudieron leer las respuestas." }; }

    const a = metrics(A.w as W[], A.s as S[]);
    const b = metrics(B.w as W[], B.s as S[]);
    if (!A.w.length && !A.s.length && !B.w.length && !B.s.length) return { error: "No hay respuestas en ninguna de las dos fechas." };

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { error: "Falta configurar la clave de IA." };

    const input = JSON.stringify({
      alcance: data.playerId ? "individual" : data.team ? `equipo ${data.team}` : "plantel completo",
      pregunta: data.question || null,
      fecha_A: { fecha: data.dateA, resumen: a, pre: A.w, post: A.s },
      fecha_B: { fecha: data.dateB, resumen: b, pre: B.w, post: B.s },
    });

    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra", instructions: SYSTEM, input, stream: true, store: false,
        reasoning: { effort: "low", summary: "auto" }, include: ["reasoning.encrypted_content"],
        text: { format: { type: "json_schema", name: "comparacion", strict: true, schema: SCHEMA } },
      }),
    });
    if (!res.ok || !res.body) {
      let msg = "";
      try { msg = (await res.json())?.error?.message ?? ""; } catch {}
      if (res.status === 429) return { error: "Demasiadas solicitudes. Esperá un momento y probá de nuevo." };
      if (res.status === 402) return { error: msg || "Sin créditos de IA disponibles." };
      return { error: msg || `Error del servicio de IA (${res.status}).` };
    }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "", text = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const j = line.slice(5).trim();
        if (!j || j === "[DONE]") continue;
        try {
          const ev = JSON.parse(j);
          if (ev.type === "response.output_text.delta") text += ev.delta;
          if (ev.type === "response.failed" || ev.type === "error") return { error: "La IA no pudo completar la comparación." };
        } catch {}
      }
    }
    try {
      const p = JSON.parse(text);
      return { a, b, summary: String(p.summary ?? ""), changes: p.changes ?? [], recommendations: p.recommendations ?? [], answer: String(p.answer ?? "") };
    } catch {
      return { error: "La IA no devolvió una respuesta válida." };
    }
  });
