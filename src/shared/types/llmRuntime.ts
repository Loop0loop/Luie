export type RuntimeRouteProvider = "sidecar" | "openai" | "gemini" | "ollama";
export type RuntimeFallbackPolicy = "fail-closed" | "try-next";

export type RuntimeRouteSkip = {
  provider: RuntimeRouteProvider | "deterministic";
  code: string;
  message: string;
};

export type RuntimeRouteSupabaseProxy = {
  functionUrl: string;
  accessToken: string;
};

export type RuntimeRouteCandidate =
  | {
      kind: "sidecar";
      backend: "local-sidecar";
      modelPath: string;
      binaryPath: string;
      options: {
        gpuLayers?: number;
        contextSize?: number;
        cacheRamMiB?: number;
        cacheReuse?: number;
      };
    }
  | {
      kind: "openai";
      backend: "remote-http";
      baseUrl: "https://api.openai.com/v1";
      apiKey: string;
      model: string;
      embeddingModel?: string;
      supabaseProxy?: RuntimeRouteSupabaseProxy;
      supabaseProxyError?: string;
    }
  | {
      kind: "gemini";
      backend: "remote-http";
      apiKey: string;
      model: string;
      alternativeModel?: string;
      embeddingModel?: string;
      supabaseProxy?: RuntimeRouteSupabaseProxy;
      supabaseProxyError?: string;
    }
  | {
      kind: "ollama";
      backend: "remote-http";
      baseUrl: string;
      model: string;
      embeddingModel?: string;
      apiKey?: string;
    };

export type RuntimeRoutePlan = {
  requestedProvider: "auto" | RuntimeRouteProvider;
  fallbackPolicy: RuntimeFallbackPolicy;
  order: RuntimeRouteProvider[];
  candidates: RuntimeRouteCandidate[];
  skipped: RuntimeRouteSkip[];
};

export type UtilitySidecarStatus =
  | { status: "stopped"; lastError?: string; diagnostic?: string }
  | { status: "starting"; modelPath: string; lastError?: string }
  | { status: "running"; modelPath: string; baseUrl: string; lastError?: string }
  | { status: "stopping"; modelPath: string; lastError?: string }
  | {
      status: "crashed";
      modelPath?: string;
      lastError: string;
      failureCount?: number;
      diagnostic?: string;
    }
  | {
      status: "cooldown";
      modelPath?: string;
      cooldownUntil: number;
      lastError: string;
      failureCount?: number;
      diagnostic?: string;
    };

export type UtilitySidecarPurpose = "chat" | "embedding";

export type UtilitySidecarStatusEvent = {
  purpose: UtilitySidecarPurpose;
  status: UtilitySidecarStatus;
};
