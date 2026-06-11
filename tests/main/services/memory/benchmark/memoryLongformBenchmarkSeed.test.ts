import { describe, expect, it } from "vitest";
import {
  buildMemoryLongformBenchmarkSeed,
  MEMORY_LONGFORM_BENCHMARK_PROFILES,
} from "../../../../../src/main/services/features/memory/benchmark/memoryLongformBenchmarkSeed.js";

describe("memoryLongformBenchmarkSeed", () => {
  it("defines CI and manual longform profiles for phase 4 benchmarks", () => {
    expect(MEMORY_LONGFORM_BENCHMARK_PROFILES["ci-1000"]).toMatchObject({
      chapterCount: 100,
      chunkCount: 1000,
      hardwareMode: "low-end",
    });
    expect(MEMORY_LONGFORM_BENCHMARK_PROFILES["manual-10000"]).toMatchObject({
      chapterCount: 500,
      chunkCount: 10000,
      targetCharacterCount: 3_000_000,
    });
  });

  it("generates a deterministic web-novel shaped benchmark manifest", () => {
    const first = buildMemoryLongformBenchmarkSeed({
      profileName: "ci-1000",
      seed: 42,
    });
    const second = buildMemoryLongformBenchmarkSeed({
      profileName: "ci-1000",
      seed: 42,
    });

    expect(first).toEqual(second);
    expect(first.chapters).toHaveLength(100);
    expect(first.chunks).toHaveLength(1000);
    expect(first.summary.totalCharacters).toBe(1_000_000);
    expect(first.bottlenecks).toEqual(
      expect.arrayContaining([
        "alias-repeat",
        "chapter-reorder",
        "mid-series-rewrite",
        "stale-embedding",
        "summary-refresh",
        "review-backlog",
        "renderer-list",
      ]),
    );
    expect(first.scenarios.editAfterIndex.chapterOrders.length).toBeGreaterThan(0);
    expect(first.scenarios.importExport.packageRowEstimate).toBeGreaterThan(
      first.chunks.length,
    );
  });
});
