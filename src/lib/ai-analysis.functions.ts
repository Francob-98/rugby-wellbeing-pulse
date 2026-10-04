import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({
  wellnessIds: z.array(z.string().uuid()).max(200),
  sessionIds: z.array(z.string().uuid()).max(200),
});

export type AiFinding = { player: string; level: "alto" | "medio" | "bajo"; signals: string[]; recommendation: string };
export type AiResult = { summary: string; findings: AiFinding[] } | { error: string };

const SYSTEM = `Sos un asistente de un preparador físico de rugby. Analizás respuestas subjetivas de jugadores.
Wellness pre-entreno: escalas 1-5 donde 5 es SIEMPRE lo mejor (sueño, fatiga=frescura, dolor muscular=sin dolor, estrés=relajado, ánimo). Post-entreno: RPE 1-10, fatiga muscular 1-5 donde 5 es agotado, carga = RPE×minutos. pain_zones: zona→intensidad 1 leve, 2 moderado, 3 intenso.
Detectá señales de fatiga, dolor o riesgo que requieran seguimiento (dolor repetido o intenso en una zona, wellness bajo, poco sueño, RPE muy alto, caídas bruscas, comentarios preocupantes). No hagas diagnósticos médicos.
Respondé SOLO con JSON válido, sin markdown: {"summary": string, "findings": [{"player": string, "level": "alto"|"medio"|"bajo", "signals": string[], "recommendation": string}]}. Incluí solo jugadores que requieran seguimiento, ordenados por nivel. Español rioplatense, breve.`;

export const analyzeEntries = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data, context }): Promise<AiResult> => {
    const { supabase, userId } = context;
    const { data: staff } = await supabase.rpc("is_staff", { _user_id: userId });
    if (!staff) return { error: "Sin permiso de staff." };
    if (!data.wellnessIds.length && !data.sessionIds.length) return { error: "Seleccioná al menos una respuesta." };

    const [w, s] = await Promise.all([
      data.wellnessIds.length
        ? supabase.from("wellness_entries").select("entry_date,sleep_quality,sleep_hours,fatigue,soreness,stress,mood,pain_zones,players(full_name)").in("id", data.wellnessIds)
        : Promise.resolve({ data: [], error: null }),
      data.sessionIds.length
        ? supabase.from("session_entries").select("entry_date,team,duration_min,rpe,fatigue,load,pain_zones,comments,players(full_name)").in("id", data.sessionIds)
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (w.error || s.error) return { error: "No se pudieron leer las respuestas." };

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { error: "Falta configurar la clave de IA." };

    const payload = JSON.stringify({ pre_entreno: w.data, post_entreno: s.data });
    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        instructions: SYSTEM,
        input: payload,
        stream: true,
        store: false,
        reasoning: { effort: "low", summary: "auto" },
        include: ["reasoning.encrypted_content"],
      }),
    });
    if (!res.ok || !res.body) {
      let msg = "";
      try { msg = (await res.json())?.error?.message ?? ""; } catch {}
      if (res.status === 429) return { error: "Demasiadas solicitudes. Esperá un momento y probá de nuevo." };
      if (res.status === 402) return { error: msg || "Sin créditos de IA disponibles." };
      return { error: msg || `Error del servicio de IA (${res.status}).` };
    }

    // Consume SSE stream server-side
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
          if (ev.type === "response.failed" || ev.type === "error") return { error: "La IA no pudo completar el análisis." };
        } catch {}
      }
    }
    if (!text.trim()) return { error: "La IA no devolvió respuesta." };
    try {
      const m = text.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(m ? m[0] : text);
      return { summary: String(parsed.summary ?? ""), findings: Array.isArray(parsed.findings) ? parsed.findings : [] };
    } catch {
      return { summary: text, findings: [] };
    }
  });
