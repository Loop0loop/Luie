import { describe, expect, it } from "vitest";
import { buildMemoryLongformBenchmarkSeed } from "../../../../../src/main/services/features/memory/benchmark/memoryLongformBenchmarkSeed.js";
import { materializeMemoryLongformBenchmark } from "../../../../../src/main/services/features/memory/benchmark/memoryLongformBenchmarkMaterialize.js";
import {
  MEMORY_BENCHMARK_LATENCY_BUDGETS,
  runMemoryBenchmarkLatencyReport,
  summarizeMemoryBenchmarkLatencyFailures,
  type MemoryBenchmarkLatencyReport,
} from "../../../../../src/main/services/features/memory/benchmark/memoryBenchmarkLatencyRunner.js";

describe("memoryBenchmarkLatencyRunner", () => {
  it("reports writer-facing latency budgets for a materialized longform project", async () => {
    const manifest = buildMemoryLongformBenchmarkSeed({
      profileName: "ci-1000",
      seed: 42,
    });
    const projectId = "benchmark-latency-ci-1000-test";

    await materializeMemoryLongformBenchmark({
      manifest,
      projectId,
      nowIso: "2026-06-11T00:00:00.000Z",
    });

    const report = await runMemoryBenchmarkLatencyReport({
      projectId,
      profileName: "ci-1000",
      query: "검은 기사",
      repeatedIterations: 3,
      optimizationMode: "low-end",
    });

    expect(MEMORY_BENCHMARK_LATENCY_BUDGETS).toMatchObject({
      firstQueryAfterStartMs: 3000,
      repeatedQueryMs: 1000,
      evidenceSearchMs: 1000,
      complexMemoryQueryMs: 3000,
      maxRssMb: 512,
      maxHeapUsedMb: 256,
      editAfterIndexMode: "background",
      packageProgressRequired: true,
    });
    expect(report).toMatchObject({
      schemaVersion: 1,
      projectId,
      profileName: "ci-1000",
      query: "검은 기사",
      budgets: MEMORY_BENCHMARK_LATENCY_BUDGETS,
    });
    expect(report.measurements.firstChunkSearch.resultCount).toBeGreaterThan(0);
    expect(report.measurements.repeatedChunkSearch.iterations).toBe(3);
    expect(report.measurements.repeatedChunkSearch.resultCount).toBeGreaterThan(0);
    expect(report.measurements.memoryUsage).toMatchObject({
      unit: "MiB",
    });
    expect(report.measurements.memoryUsage.rssMb).toBeGreaterThan(0);
    expect(report.measurements.memoryUsage.heapUsedMb).toBeGreaterThan(0);
    expect(report.measurements.sqlitePageCache.pageCount).toBeGreaterThan(0);
    expect(report.measurements.sqlitePageCache.pageSizeBytes).toBeGreaterThan(0);
    expect(report.optimizationPolicy).toMatchObject({
      mode: "low-end",
      resultLimit: 20,
      candidateCap: 50,
      rrfTopK: 20,
    });
    expect(report.measurements.optimizationModeComparison.map((row) => row.mode)).toEqual([
      "low-end",
      "standard",
      "high-end",
      "quality",
    ]);
    expect(report.measurements.optimizationModeComparison).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          mode: "low-end",
          vectorSearchMode: "skip-when-lexical-hits",
          candidateCap: 50,
          contextBudgetChars: 6_144,
        }),
        expect.objectContaining({
          mode: "quality",
          vectorSearchMode: "enabled",
          contextBudgetChars: 16_384,
        }),
      ]),
    );
    expect(report.measurements.candidateCapComparison).toHaveLength(3);
    expect(report.measurements.candidateCapComparison.map((row) => row.candidateCap)).toEqual([
      20,
      40,
      50,
    ]);
    expect(
      report.measurements.candidateCapComparison.every(
        (row) =>
          row.durationMs >= 0 &&
          row.resultCount > 0 &&
          row.baselineOverlapRatio >= 0 &&
          row.baselineOverlapRatio <= 1,
      ),
    ).toBe(true);
    expect(report.measurements.cacheTtlMemoryComparison).toHaveLength(3);
    expect(report.measurements.ragSearchPath).toMatchObject({
      path: "searchMemoryChunksForRag",
      iterations: 3,
    });
    expect(report.measurements.ragSearchPath.resultCount).toBeGreaterThan(0);
    expect(report.measurements.ragSearchPath.p50Ms).toBeGreaterThanOrEqual(0);
    expect(report.measurements.ragSearchPath.p95Ms).toBeGreaterThanOrEqual(
      report.measurements.ragSearchPath.p50Ms,
    );
    expect(report.measurements.ragSearchPath.p99Ms).toBeGreaterThanOrEqual(
      report.measurements.ragSearchPath.p95Ms,
    );
    expect(report.measurements.ragSearchPath.maxMs).toBeGreaterThanOrEqual(
      report.measurements.ragSearchPath.p99Ms,
    );
    expect(report.measurements.ragSearchPath.coldStartMs).toBeGreaterThanOrEqual(
      0,
    );
    expect(report.measurements.ragSearchPath.warmIterations).toBe(2);
    expect(report.measurements.ragSearchPath.warmP50Ms).toBeGreaterThanOrEqual(0);
    expect(report.measurements.ragSearchPath.warmP95Ms).toBeGreaterThanOrEqual(
      report.measurements.ragSearchPath.warmP50Ms,
    );
    expect(report.measurements.ragSearchPath.warmP99Ms).toBeGreaterThanOrEqual(
      report.measurements.ragSearchPath.warmP95Ms,
    );
    expect(report.measurements.ragSearchPath.warmMaxMs).toBeGreaterThanOrEqual(
      report.measurements.ragSearchPath.warmP99Ms,
    );
    expect(
      report.measurements.ragSearchStageBreakdown.map((row) => row.stage),
    ).toEqual([
      "fts",
      "exactPhrase",
      "quoteToken",
      "shortToken",
      "vector",
      "rrf",
      "hydrate",
      "parentWindow",
    ]);
    expect(
      report.measurements.ragSearchStageBreakdown.every(
        (row) =>
          row.iterations === 3 &&
          row.p50Ms >= 0 &&
          row.p95Ms >= row.p50Ms &&
          row.p99Ms >= row.p95Ms &&
          row.maxMs >= row.p99Ms &&
          row.maxCandidateCount >= 0 &&
          (row.stage === "parentWindow" ||
            row.maxCandidateCount <= report.optimizationPolicy.candidateCap),
      ),
    ).toBe(true);
    expect(report.measurements.layer3EvidencePath).toMatchObject({
      path: "buildLayer3Evidence",
      iterations: 3,
    });
    expect(report.measurements.layer3EvidencePath.evidenceCount).toBeGreaterThan(
      0,
    );
    expect(report.measurements.layer3EvidencePath.p50Ms).toBeGreaterThanOrEqual(
      0,
    );
    expect(report.measurements.layer3EvidencePath.p95Ms).toBeGreaterThanOrEqual(
      report.measurements.layer3EvidencePath.p50Ms,
    );
    expect(report.measurements.layer3EvidencePath.p99Ms).toBeGreaterThanOrEqual(
      report.measurements.layer3EvidencePath.p95Ms,
    );
    expect(report.measurements.layer3EvidencePath.maxMs).toBeGreaterThanOrEqual(
      report.measurements.layer3EvidencePath.p99Ms,
    );
    expect(
      report.measurements.layer3EvidencePath.coldStartMs,
    ).toBeGreaterThanOrEqual(0);
    expect(report.measurements.layer3EvidencePath.warmIterations).toBe(2);
    expect(report.measurements.layer3EvidencePath.warmP50Ms).toBeGreaterThanOrEqual(
      0,
    );
    expect(
      report.measurements.cacheTtlMemoryComparison.map((row) => row.ttlMs),
    ).toEqual([60_000, 180_000, 300_000]);
    expect(
      report.measurements.cacheTtlMemoryComparison.every(
        (row) =>
          row.estimatedEntries > 0 &&
          row.estimatedMemoryMb > 0 &&
          row.estimatedMemoryMb <= report.regressionThresholds.heapUsedMb,
      ),
    ).toBe(true);
    expect(report.measurements.editAfterIndexPlan.mode).toBe("background");
    expect(report.measurements.packageProgressPlan.required).toBe(true);
    expect(["pass", "warn", "fail"]).toContain(
      report.assessment.firstChunkSearch.status,
    );
    expect(["pass", "warn", "fail"]).toContain(
      report.assessment.repeatedChunkSearch.status,
    );
    expect(["pass", "warn", "fail"]).toContain(
      report.assessment.memoryUsage.status,
    );
    expect(report.regressionThresholds).toMatchObject({
      firstChunkSearchMs: 3000,
      repeatedChunkSearchMs: 1000,
      rssMb: 512,
      heapUsedMb: 256,
    });
  });

  it("summarizes threshold failures for CI assertion mode", () => {
    const report = {
      assessment: {
        firstChunkSearch: {
          status: "fail",
          budgetMs: 3000,
          actualMs: 4500,
        },
        repeatedChunkSearch: {
          status: "warn",
          budgetMs: 1000,
          actualMs: 1200,
        },
        memoryUsage: {
          status: "fail",
          rssBudgetMb: 512,
          heapUsedBudgetMb: 256,
          rssActualMb: 800,
          heapUsedActualMb: 300,
        },
      },
    } as MemoryBenchmarkLatencyReport;

    expect(summarizeMemoryBenchmarkLatencyFailures(report)).toEqual([
      "firstChunkSearch 4500ms > 3000ms",
      "memoryUsage rss 800MiB > 512MiB or heap 300MiB > 256MiB",
    ]);
  });
});
