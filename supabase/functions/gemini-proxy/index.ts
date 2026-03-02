import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type GeminiProxyBody = {
  model?: unknown;
  prompt?: unknown;
  responseMimeType?: unknown;
  responseSchema?: unknown;
  temperature?: unknown;
  topP?: unknown;
  topK?: unknown;
  maxOutputTokens?: unknown;
};

const json = (status: number, payload: unknown): Response =>
  new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });

const unauthorized = (message: string): Response => json(401, { error: message });
const badRequest = (message: string): Response => json(400, { error: message });
const internalError = (message: string): Response => json(500, { error: message });

const toNumber = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

const extractGeminiText = (payload: unknown): string | null => {
  if (!isRecord(payload)) return null;
  const candidates = payload.candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) return null;
  const first = candidates[0];
  if (!isRecord(first)) return null;
  const content = first.content;
  if (!isRecord(content)) return null;
  const parts = content.parts;
  if (!Array.isArray(parts)) return null;

  const texts = parts
    .map((part) => (isRecord(part) && typeof part.text === "string" ? part.text : ""))
    .filter((item) => item.length > 0);
  if (texts.length === 0) return null;
  return texts.join("\n").trim();
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return unauthorized("Missing bearer token");
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey =
    Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SB_PUBLISHABLE_KEY");
  const geminiApiKey = Deno.env.get("GEMINI_API_KEY");

  if (!supabaseUrl || !supabaseAnonKey) {
    return internalError("Supabase runtime env is missing (SUPABASE_URL / SUPABASE_ANON_KEY)");
  }
  if (!geminiApiKey) {
    return internalError("GEMINI_API_KEY is not configured");
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return unauthorized("Unauthorized");
  }

  let body: GeminiProxyBody;
  try {
    const parsed = await req.json();
    if (!isRecord(parsed)) {
      return badRequest("Payload must be a JSON object");
    }
    body = parsed as GeminiProxyBody;
  } catch {
    return badRequest("Invalid JSON payload");
  }

  const model = typeof body.model === "string" ? body.model.trim() : "";
  const prompt = typeof body.prompt === "string" ? body.prompt : "";
  if (!model) {
    return badRequest("`model` must be a non-empty string");
  }
  if (!prompt) {
    return badRequest("`prompt` must be a non-empty string");
  }

  const generationConfig: Record<string, unknown> = {};
  if (body.responseMimeType === "text/plain" || body.responseMimeType === "application/json") {
    generationConfig.responseMimeType = body.responseMimeType;
  }
  if (isRecord(body.responseSchema)) {
    generationConfig.responseSchema = body.responseSchema;
  }
  const temperature = toNumber(body.temperature);
  const topP = toNumber(body.topP);
  const topK = toNumber(body.topK);
  const maxOutputTokens = toNumber(body.maxOutputTokens);
  if (temperature !== undefined) generationConfig.temperature = temperature;
  if (topP !== undefined) generationConfig.topP = topP;
  if (topK !== undefined) generationConfig.topK = topK;
  if (maxOutputTokens !== undefined) generationConfig.maxOutputTokens = maxOutputTokens;

  const geminiResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(geminiApiKey)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig,
      }),
    },
  );

  const responseText = await geminiResponse.text();
  let responseJson: unknown = null;
  try {
    responseJson = JSON.parse(responseText);
  } catch {
    responseJson = null;
  }

  if (!geminiResponse.ok) {
    return json(geminiResponse.status, {
      error: "Gemini API request failed",
      details: responseJson ?? responseText,
    });
  }

  const text = extractGeminiText(responseJson);
  return json(200, {
    text,
    candidates: isRecord(responseJson) ? responseJson.candidates : undefined,
    model,
  });
});
