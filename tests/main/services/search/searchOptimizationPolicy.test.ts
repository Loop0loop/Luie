import { describe, expect, it } from "vitest";
import {
  DEFAULT_SEARCH_OPTIMIZATION_MODE,
  resolveSearchOptimizationPolicy,
} from "../../../../src/main/services/features/search/searchOptimizationPolicy.js";

describe("searchOptimizationPolicy", () => {
  it("caps candidates and context budget for low-end writer devices", () => {
    const policy = resolveSearchOptimizationPolicy({
      mode: "low-end",
      requestedLimit: 120,
      requestedContextBudget: 20_000,
    });

    expect(policy).toMatchObject({
      mode: "low-end",
      resultLimit: 40,
      candidateCap: 50,
      rrfTopK: 40,
      contextBudgetChars: 6_144,
      rerankCacheTtlMs: 300_000,
      vectorSearchMode: "skip-when-lexical-hits",
      staleEmbeddingMode: "skip",
    });
  });

  it("keeps the default mode bounded for repeated RAG search", () => {
    const policy = resolveSearchOptimizationPolicy({
      requestedLimit: 20,
      requestedContextBudget: 12_000,
    });

    expect(DEFAULT_SEARCH_OPTIMIZATION_MODE).toBe("standard");
    expect(policy).toMatchObject({
      mode: "standard",
      resultLimit: 20,
      candidateCap: 60,
      rrfTopK: 20,
      contextBudgetChars: 8_192,
      rerankCacheTtlMs: 180_000,
      vectorSearchMode: "enabled",
      staleEmbeddingMode: "skip",
    });
  });
});
