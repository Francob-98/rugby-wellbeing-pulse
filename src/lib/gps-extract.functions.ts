import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({ filename: z.string().max(200), base64: z.string().max(14_000_000) });

export type GpsRow = {
  gps_name: string; position: string | null;
  distance_m: number | null; m_per_min: number | null; hsd_m: number | null; hsd_per_min: number | null;
  sprint_per_min: number | null; accel_decel: number | null; accel_decel_per_min: number | null;
  max_speed: number | null; max_accel: number | null; max_decel: number | null; duration_min: number | null;
};
export type GpsExtract = { rows: GpsRow[]; activity: string } | { error: string };

const NUM = { type: ["number", "null"] };
const FIELDS = ["gps_name", "position", "distance_m", "m_per_min", "hsd_m", "hsd_per_min", "sprint_per_min", "accel_decel", "accel_decel_per_min", "max_speed", "max_accel", "max_decel", "duration_min"] as const;
const SCHEMA = {
  type: "object", additionalProperties: false, required: ["activity", "rows"],
  properties: {
    activity: { type: "string" },
    rows: { type: "array", items: { type: "object", additionalProperties: false, required: [...FIELDS],
      properties: {
        gps_name: { type: "string" }, position: { type: ["string", "null"] },
        distance_m: NUM, m_per_min: NUM, hsd_m: NUM, hsd_per_min: NUM, sprint_per_min: NUM, accel_decel: NUM,
        accel_decel_per_min: NUM, max_speed: NUM, max_accel: NUM, max_decel: NUM, duration_min: NUM,
      } } },
  },
};

const SYSTEM = `Extraés datos de un informe PDF de GPS deportivo (rugby). Devolvé UNA fila por atleta (sin la fila de promedios), con el nombre completo tal cual aparece (preferí la tabla "Athlete Breakdown").
Campos: distance_m = distancia total (m) (buscala en tablas de distancia por jugador si no está en el breakdown); m_per_min = Meterage Per Minute; hsd_m = High Speed Distance (m); hsd_per_min; sprint_per_min = Sprint Distance Per Minute; accel_decel = Accel&Decel Efforts; accel_decel_per_min; max_speed = velocidad máxima (km/h); max_accel; max_decel; duration_min = Duration convertida a minutos (h:mm:ss → minutos con 1 decimal).
Usá null si un dato no aparece. Nunca inventes valores. "activity": nombre/fecha de la actividad si figura.`;

export const extractGpsPdf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data, context }): Promise<GpsExtract> => {
    const { data: staff } = await context.supabase.rpc("is_staff", { _user_id: context.userId });
    if (!staff) return { error: "Sin permiso de staff." };
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { error: "Falta configurar la clave de IA." };

    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra", instructions: SYSTEM, stream: true, store: false,
        reasoning: { effort: "low", summary: "auto" }, include: ["reasoning.encrypted_content"],
        input: [{ role: "user", content: [
          { type: "input_file", filename: data.filename || "gps.pdf", file_data: `data:application/pdf;base64,${data.base64}` },
          { type: "input_text", text: "Extraé los datos por jugador de este informe GPS." },
        ] }],
        text: { format: { type: "json_schema", name: "gps", strict: true, schema: SCHEMA } },
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
          if (ev.type === "response.failed" || ev.type === "error") return { error: "No se pudo leer el PDF." };
        } catch {}
      }
    }
    try {
      const p = JSON.parse(text);
      const rows = (Array.isArray(p.rows) ? p.rows : []).filter((r: GpsRow) => r?.gps_name && !/^average/i.test(r.gps_name)).slice(0, 80);
      if (!rows.length) return { error: "No encontré datos de jugadores en el PDF." };
      return { rows, activity: String(p.activity ?? "") };
    } catch {
      return { error: "La lectura del PDF no devolvió datos válidos." };
    }
  });
