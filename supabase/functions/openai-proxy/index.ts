import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ProxyEndpoint = "responses" | "chat.completions";

type ProxyRequestBody = {
  endpoint?: ProxyEndpoint;
  model?: unknown;
  [key: string]: unknown;
};

const unauthorized = (message: string): Response =>
  new Response(JSON.stringify({ error: message }), {
    status: 401,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });

const badRequest = (message: string): Response =>
  new Response(JSON.stringify({ error: message }), {
    status: 400,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });

const internalError = (message: string): Response =>
  new Response(JSON.stringify({ error: message }), {
    status: 500,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });

const parseBody = (value: unknown): ProxyRequestBody | null => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as ProxyRequestBody;
  }
  return null;
};

const resolveEndpoint = (endpoint?: ProxyEndpoint): string => {
  if (endpoint === "chat.completions") {
    return "chat/completions";
  }
  return "responses";
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return unauthorized("Missing bearer token");
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey =
    Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SB_PUBLISHABLE_KEY");
  const openAiApiKey = Deno.env.get("OPENAI_API_KEY");

  if (!supabaseUrl || !supabaseAnonKey) {
    return internalError("Supabase runtime env is missing (SUPABASE_URL / SUPABASE_ANON_KEY)");
  }
  if (!openAiApiKey) {
    return internalError("OPENAI_API_KEY is not configured");
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

  let requestBody: ProxyRequestBody | null = null;
  try {
    requestBody = parseBody(await req.json());
  } catch {
    return badRequest("Invalid JSON payload");
  }

  if (!requestBody) {
    return badRequest("Payload must be a JSON object");
  }

  const endpoint = resolveEndpoint(requestBody.endpoint);
  const { endpoint: _ignoredEndpoint, ...openAiPayload } = requestBody;
  if (typeof openAiPayload.model !== "string" || openAiPayload.model.length === 0) {
    return badRequest("`model` must be a non-empty string");
  }

  const openAiResponse = await fetch(`https://api.openai.com/v1/${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openAiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(openAiPayload),
  });

  const responseText = await openAiResponse.text();

  return new Response(responseText, {
    status: openAiResponse.status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
});
