import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { ExternalApiProvider } from "../../../src/main/services/features/llm/providers/externalApiProvider.js";
import { GeminiProvider } from "../../../src/main/services/features/llm/providers/geminiProvider.js";

const providerSource = (relativePath: string): string =>
  readFileSync(resolve(process.cwd(), relativePath), "utf8");

describe("provider client dependency boundary", () => {
  it("keeps provider clients free of settings and sync token imports", () => {
    const externalApiProvider = providerSource(
      "src/main/services/features/llm/providers/externalApiProvider.ts",
    );
    const geminiProvider = providerSource(
      "src/main/services/features/llm/providers/geminiProvider.ts",
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
    const materializerSource = providerSource(
      "src/main/utility/llm/runtimeMaterializer.ts",
    );

    expect(materializerSource).not.toContain("runtimeProxyConfig");
    expect(materializerSource).not.toContain("settingsManager");
    expect(materializerSource).not.toContain("ensureSyncAccessToken");
    expect(materializerSource).not.toContain("getSupabaseConfig");
    expect(materializerSource).not.toContain(
      "../../services/features/llm/embeddingModelConstants",
    );
    expect(materializerSource).toContain("proxyResolverForCandidate");
  });

  it("keeps utility sidecar supervisor free of main LLM service constants", () => {
    const supervisorSource = providerSource(
      "src/main/utility/llm/sidecarSupervisor.ts",
    );

    expect(supervisorSource).not.toContain(
      "../../services/features/llm/embeddingModelConstants",
    );
    expect(supervisorSource).toContain("./embeddingModelConstants");
  });

  it("keeps utility RAG database imports off the main infra barrel", () => {
    const utilityMainSource = providerSource(
      "src/main/utility/process/utilityProcessMain.ts",
    );
    const contextAssemblerSource = providerSource(
      "src/main/services/features/rag/contextAssembler.ts",
    );
    const chunkSearchSource = providerSource(
      "src/main/services/features/search/chunkSearch.ts",
    );

    for (const source of [
      utilityMainSource,
      contextAssemblerSource,
      chunkSearchSource,
    ]) {
      expect(source).not.toContain("infra/database/index");
      expect(source).not.toContain("infra/database/cache");
    }
  });

  it("keeps utility RAG context assembly off main utilityProcessBridge imports", () => {
    const contextAssemblerSource = providerSource(
      "src/main/services/features/rag/contextAssembler.ts",
    );
    const contextAssemblerSearchSource = providerSource(
      "src/main/services/features/rag/internal/contextAssembler.search.ts",
    );
    const workerSource = providerSource("src/main/utility/rag/ragQaWorker.ts");

    expect(contextAssemblerSource).not.toContain("../searchService.js");
    expect(contextAssemblerSource).not.toContain("utilityProcessBridge");
    expect(contextAssemblerSearchSource).not.toContain("../../search/index.js");
    expect(contextAssemblerSearchSource).toContain("../../search/chunkSearch.js");
    expect(workerSource).toContain("embedTexts:");
    expect(workerSource).toContain("resolveUtilityEmbeddingRuntimeClient");
  });

  it("keeps world replica reads importable without the project service IPC graph", () => {
    const worldReplicaSource = providerSource(
      "src/main/services/features/worldReplica/worldReplicaService.ts",
    );

    expect(worldReplicaSource).not.toContain(
      'import { projectService } from "../project/projectService.js";',
    );
    expect(worldReplicaSource).toContain(
      'await import("../project/projectService.js")',
    );
  });
});
