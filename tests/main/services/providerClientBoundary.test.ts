import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { ExternalApiProvider } from "../../../src/main/services/llm/providers/externalApiProvider.js";
import { GeminiProvider } from "../../../src/main/services/llm/providers/geminiProvider.js";

const providerSource = (relativePath: string): string =>
  readFileSync(resolve(process.cwd(), relativePath), "utf8");

describe("provider client dependency boundary", () => {
  it("keeps provider clients free of settings and sync token imports", () => {
    const externalApiProvider = providerSource(
      "src/main/services/llm/providers/externalApiProvider.ts",
    );
    const geminiProvider = providerSource(
      "src/main/services/llm/providers/geminiProvider.ts",
    );

    for (const source of [externalApiProvider, geminiProvider]) {
      expect(source).not.toContain("settingsManager");
      expect(source).not.toContain("ensureSyncAccessToken");
      expect(source).not.toContain("getSupabaseConfig");
      expect(source).not.toContain("isAppPackaged");
    }
  });

  it("marks Supabase proxy providers as buffered generation runtimes", () => {
    const supabaseProxy = async () => ({
      functionUrl: "https://example.supabase.co/functions/v1/llm-proxy",
      accessToken: "token",
    });

    expect(
      new ExternalApiProvider({
        baseUrl: "https://api.openai.com/v1",
        apiKey: "key",
        chatModel: "gpt-test",
        supabaseProxy,
      }).generationMode,
    ).toBe("buffered");
    expect(
      new ExternalApiProvider({
        baseUrl: "http://127.0.0.1:11434/v1",
        apiKey: "key",
        chatModel: "local-test",
        supabaseProxy,
      }).generationMode,
    ).toBe("streaming");
    expect(
      new GeminiProvider({
        apiKey: "key",
        model: "gemini-test",
        supabaseProxy,
      }).generationMode,
    ).toBe("buffered");
    expect(
      new GeminiProvider({
        apiKey: "key",
        model: "gemini-test",
      }).generationMode,
    ).toBe("streaming");
  });

  it("keeps RAG first-token timeout keyed by runtime generationMode", () => {
    const workerSource = providerSource("src/main/utility/rag/ragQaWorker.ts");

    expect(workerSource).toContain('runtime.generationMode === "buffered"');
    expect(workerSource).toContain("firstTokenTimeoutMs");
    expect(workerSource).toContain("RagQaWorker.TOTAL_GENERATION_TIMEOUT_MS");
  });

  it("keeps utility runtime materializer free of main sync proxy dependencies", () => {
    const materializerSource = providerSource("src/main/utility/llm/runtimeMaterializer.ts");

    expect(materializerSource).not.toContain("runtimeProxyConfig");
    expect(materializerSource).not.toContain("settingsManager");
    expect(materializerSource).not.toContain("ensureSyncAccessToken");
    expect(materializerSource).not.toContain("getSupabaseConfig");
    expect(materializerSource).toContain("proxyResolverForCandidate");
  });
});
