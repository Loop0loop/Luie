import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("main embedding runtime boundary", () => {
  it("does not materialize the local embedding sidecar from modelRuntimeFactory", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/main/services/llm/modelRuntimeFactory.ts"),
      "utf8",
    );

    expect(source).not.toContain("resolveEmbeddingRuntimeClient");
    expect(source).not.toContain("resolveModelRuntimeClient");
    expect(source).not.toContain("embeddingSidecarManager");
    expect(source).not.toContain("sidecarManager");
    expect(source).not.toContain("ensureStarted(");
  });

  it("does not expose the removed main embedding sidecar manager", () => {
    expect(existsSync(resolve(process.cwd(), "src/main/services/llm/embeddingSidecarManager.ts"))).toBe(false);

    const barrelSource = readFileSync(resolve(process.cwd(), "src/main/services/llm/index.ts"), "utf8");
    const analysisDomainSource = readFileSync(resolve(process.cwd(), "src/main/domains/analysis/index.ts"), "utf8");

    expect(barrelSource).not.toContain("embeddingSidecarManager");
    expect(analysisDomainSource).not.toContain("resolveEmbeddingRuntimeClient");
    expect(analysisDomainSource).not.toContain("resolveModelRuntimeClient");
  });

  it("keeps background summary generation behind the utility process bridge", () => {
    const projectorSource = readFileSync(
      resolve(process.cwd(), "src/main/services/features/memory/chapterSummaryProjector.ts"),
      "utf8",
    );

    expect(projectorSource).not.toContain("modelRuntimeFactory");
    expect(projectorSource).not.toContain("resolveModelRuntimeClient");
    expect(projectorSource).toContain("utilityProcessBridge.generateText");
  });

  it("keeps LLM episode extraction wired through a gated derived worker path", () => {
    const workerSource = readFileSync(
      resolve(process.cwd(), "src/main/services/features/derivedJobWorker.ts"),
      "utf8",
    );

    expect(workerSource).toContain("listProjectsWithPendingEpisodeExtractionJobs");
    expect(workerSource).toContain("processPendingLlmEpisodeExtractionJobs");
    expect(workerSource).toContain("episodeQueued");
    expect(workerSource).toContain("episodeProcessed");
  });

  it("keeps LLM temporal fact extraction wired through a gated derived worker path", () => {
    const workerSource = readFileSync(
      resolve(process.cwd(), "src/main/services/features/derivedJobWorker.ts"),
      "utf8",
    );

    expect(workerSource).toContain("listProjectsWithPendingTemporalFactEvidence");
    expect(workerSource).toContain("processPendingLlmTemporalFactExtraction");
    expect(workerSource).toContain("temporalFactProcessed");
  });

  it("keeps utility LLM logs aligned with route backend implementation terminology", () => {
    const materializerSource = readFileSync(
      resolve(process.cwd(), "src/main/utility/llm/runtimeMaterializer.ts"),
      "utf8",
    );
    const ragWorkerSource = readFileSync(
      resolve(process.cwd(), "src/main/utility/rag/ragQaWorker.ts"),
      "utf8",
    );
    const sidecarSource = readFileSync(
      resolve(process.cwd(), "src/main/utility/llm/sidecarSupervisor.ts"),
      "utf8",
    );

    for (const source of [materializerSource, ragWorkerSource, sidecarSource]) {
      expect(source).toContain("route");
      expect(source).toContain("backend");
      expect(source).toContain("implementation");
    }
    expect(sidecarSource).toContain("pathLabel(binaryPath)");
    expect(sidecarSource).toContain("pathLabel(modelPath)");
  });
});
