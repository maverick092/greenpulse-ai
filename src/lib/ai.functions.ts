import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3.6-flash";

async function callGateway(body: unknown) {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("AI is not configured yet.");

  const response = await fetch(GATEWAY, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
    body: JSON.stringify(body),
  });

  if (response.status === 429) throw new Error("GreenBot is busy right now. Please retry in a moment.");
  if (response.status === 402) throw new Error("AI credits are exhausted. Please add credits to continue.");
  if (!response.ok) throw new Error(`AI request failed (${response.status}).`);

  const json = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return json.choices?.[0]?.message?.content ?? "";
}

const AnalyzeInput = z.object({
  category: z.string(),
  description: z.string().max(2000),
  location: z.string().max(300),
  severity: z.string(),
  imageDataUrl: z.string().optional(),
});

export type AiAnalysisResult = {
  detected_issue: string;
  confidence: number;
  severity: "low" | "medium" | "high";
  environmental_impact: "low" | "medium" | "high";
  estimated_water_loss: string;
  estimated_energy_loss: string;
  suggested_action: string;
  summary: string;
  water_saved_litres: number;
  co2_saved_kg: number;
  energy_saved_kwh: number;
};

export const analyzeReport = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => AnalyzeInput.parse(input))
  .handler(async ({ data }): Promise<AiAnalysisResult> => {
    const instruction = `You are GreenPulse AI, a campus sustainability analyst. Analyse the reported issue and return ONLY compact JSON with keys:
detected_issue (short title), confidence (number 60-99), severity (low|medium|high), environmental_impact (low|medium|high),
estimated_water_loss (e.g. "50 Litres/Day" or "Not applicable"), estimated_energy_loss (e.g. "3 kWh/Day" or "Not applicable"),
suggested_action (one actionable sentence), summary (two sentences of impact reasoning),
water_saved_litres (number, potential daily litres saved if fixed), co2_saved_kg (number, potential kg CO2 saved per week), energy_saved_kwh (number, potential kWh saved per week).`;

    const userText = `Category: ${data.category}\nLocation: ${data.location || "Not provided"}\nStudent severity: ${data.severity}\nDescription: ${data.description || "Not provided"}`;

    const content: unknown[] = [{ type: "text", text: userText }];
    if (data.imageDataUrl?.startsWith("data:image")) {
      content.push({ type: "image_url", image_url: { url: data.imageDataUrl } });
    }

    const raw = await callGateway({
      model: MODEL,
      messages: [
        { role: "system", content: instruction },
        { role: "user", content },
      ],
      response_format: { type: "json_object" },
    });

    let parsed: Partial<AiAnalysisResult> = {};
    try {
      parsed = JSON.parse(raw.replace(/```json|```/g, "").trim()) as Partial<AiAnalysisResult>;
    } catch {
      parsed = {};
    }

    const clampSeverity = (value: unknown): "low" | "medium" | "high" =>
      value === "low" || value === "high" ? value : "medium";

    return {
      detected_issue: String(parsed.detected_issue ?? data.category.replace(/_/g, " ")),
      confidence: Number(parsed.confidence ?? 88),
      severity: clampSeverity(parsed.severity ?? data.severity),
      environmental_impact: clampSeverity(parsed.environmental_impact),
      estimated_water_loss: String(parsed.estimated_water_loss ?? "Not applicable"),
      estimated_energy_loss: String(parsed.estimated_energy_loss ?? "Not applicable"),
      suggested_action: String(parsed.suggested_action ?? "Escalate to the campus facilities team for repair."),
      summary: String(parsed.summary ?? "This issue contributes to avoidable resource loss on campus."),
      water_saved_litres: Number(parsed.water_saved_litres ?? 0),
      co2_saved_kg: Number(parsed.co2_saved_kg ?? 0),
      energy_saved_kwh: Number(parsed.energy_saved_kwh ?? 0),
    };
  });

const ChatInput = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) }))
    .min(1)
    .max(30),
});

export const askGreenBot = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ChatInput.parse(input))
  .handler(async ({ data }) => {
    const reply = await callGateway({
      model: MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are GreenBot, the friendly sustainability assistant inside GreenPulse AI. Help students with sustainability tips, recycling guidance, waste management, energy saving and water conservation. Be warm, concrete and concise (max 150 words). Use short paragraphs or bullets, and always end with one practical next step.",
        },
        ...data.messages,
      ],
    });
    return { reply: reply || "I could not think of an answer just now — try rephrasing?" };
  });
