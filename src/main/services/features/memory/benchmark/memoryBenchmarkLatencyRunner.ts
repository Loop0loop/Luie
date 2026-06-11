import { performance } from "node:perf_hooks";
import { and, eq, like, sql } from "drizzle-orm";
import { db, memoryChunk } from "../../../../infra/database/index.js";
import {
  resolveSearchOptimizationPolicy,
  type SearchOptimizationMode,
  type SearchOptimizationPolicy,
} from "../../search/searchOptimizationPolicy.js";
import {
  searchMemoryChunksForRag,
  type RagSearchStageDiagnostic,
  type RagSearchStageName,
} from "../../rag/internal/contextAssembler.search.js";
import { buildLayer3Evidence } from "../../rag/internal/contextAssembler.layer3.js";
import type { MemoryLongformBenchmarkProfileName } from "./memoryLongformBenchmarkSeed.js";

export type MemoryBenchmarkLatencyStatus = "pass" | "warn" | "fail";

export type MemoryBenchmarkLatencyMeasurement = {
  durationMs: number;
  resultCount: number;
};

export type MemoryBenchmarkMemoryUsageMeasurement = {
  unit: "MiB";
  rssMb: number;
  heapTotalMb: number;
  heapUsedMb: number;
  externalMb: number;
  arrayBuffersMb: number;
};

export type MemoryBenchmarkSqlitePageCacheMeasurement = {
  pageCount: number;
  pageSizeBytes: number;
  estimatedDbSizeMb: number;
};

export type MemoryBenchmarkCandidateCapMeasurement = {
  candidateCap: number;
  durationMs: number;
  resultCount: number;
  baselineOverlapRatio: number;
};

export type MemoryBenchmarkCacheTtlMemoryMeasurement = {
  ttlMs: number;
  estimatedEntries: number;
  estimatedMemoryMb: number;
};

export type MemoryBenchmarkOptimizationModeMeasurement = {
  mode: SearchOptimizationMode;
  durationMs: number;
  resultCount: number;
  baselineOverlapRatio: number;
  candidateCap: number;
  contextBudgetChars: number;
  rerankCacheTtlMs: number;
  vectorSearchMode: SearchOptimizationPolicy["vectorSearchMode"];
};

export type MemoryBenchmarkRagPathMeasurement = {
  path: "searchMemoryChunksForRag";
  iterations: number;
  resultCount: number;
  p50Ms: number;
  p95Ms: number;
  maxMs: number;
};

export type MemoryBenchmarkRagStageMeasurement = {
  stage: RagSearchStageName;
  iterations: number;
  maxCandidateCount: number;
  skippedCount: number;
  p50Ms: number;
  p95Ms: number;
  maxMs: number;
};

export type MemoryBenchmarkLayer3PathMeasurement = {
  path: "buildLayer3Evidence";
  iterations: number;
  evidenceCount: number;
  p50Ms: number;
  p95Ms: number;
  maxMs: number;
};

export type MemoryBenchmarkLatencyReport = {
  schemaVersion: 1;
  projectId: string;
  profileName: MemoryLongformBenchmarkProfileName;
  query: string;
  budgets: typeof MEMORY_BENCHMARK_LATENCY_BUDGETS;
  optimizationPolicy: SearchOptimizationPolicy;
  regressionThresholds: {
    firstChunkSearchMs: number;
    repeatedChunkSearchMs: number;
    rssMb: number;
    heapUsedMb: number;
  };
  measurements: {
    firstChunkSearch: MemoryBenchmarkLatencyMeasurement;
    repeatedChunkSearch: MemoryBenchmarkLatencyMeasurement & {
      iterations: number;
      maxDurationMs: number;
    };
    memoryUsage: MemoryBenchmarkMemoryUsageMeasurement;
    sqlitePageCache: MemoryBenchmarkSqlitePageCacheMeasurement;
    candidateCapComparison: MemoryBenchmarkCandidateCapMeasurement[];
    cacheTtlMemoryComparison: MemoryBenchmarkCacheTtlMemoryMeasurement[];
    optimizationModeComparison: MemoryBenchmarkOptimizationModeMeasurement[];
    ragSearchPath: MemoryBenchmarkRagPathMeasurement;
    ragSearchStageBreakdown: MemoryBenchmarkRagStageMeasurement[];
    layer3EvidencePath: MemoryBenchmarkLayer3PathMeasurement;
    editAfterIndexPlan: {
      mode: typeof MEMORY_BENCHMARK_LATENCY_BUDGETS.editAfterIndexMode;
      reason: string;
    };
    packageProgressPlan: {
      required: typeof MEMORY_BENCHMARK_LATENCY_BUDGETS.packageProgressRequired;
      reason: string;
    };
  };
  assessment: {
    firstChunkSearch: {
      status: MemoryBenchmarkLatencyStatus;
      budgetMs: number;
      actualMs: number;
    };
    repeatedChunkSearch: {
      status: MemoryBenchmarkLatencyStatus;
      budgetMs: number;
      actualMs: number;
    };
    memoryUsage: {
      status: MemoryBenchmarkLatencyStatus;
      rssBudgetMb: number;
      heapUsedBudgetMb: number;
      rssActualMb: number;
      heapUsedActualMb: number;
    };
  };
};

export const MEMORY_BENCHMARK_LATENCY_BUDGETS = {
  firstQueryAfterStartMs: 3000,
  repeatedQueryMs: 1000,
  evidenceSearchMs: 1000,
  complexMemoryQueryMs: 3000,
  maxRssMb: 512,
  maxHeapUsedMb: 256,
  editAfterIndexMode: "background",
  packageProgressRequired: true,
} as const;

function roundDuration(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function percentile(sortedValues: number[], percentileValue: number): number {
  if (sortedValues.length === 0) return 0;
  const index = Math.min(
    sortedValues.length - 1,
    Math.ceil((percentileValue / 100) * sortedValues.length) - 1,
  );
  return sortedValues[index] ?? 0;
}

function summarizeDurations(durations: number[]): {
  p50Ms: number;
  p95Ms: number;
  maxMs: number;
} {
  const sorted = [...durations].sort((a, b) => a - b);
  return {
    p50Ms: roundDuration(percentile(sorted, 50)),
    p95Ms: roundDuration(percentile(sorted, 95)),
    maxMs: roundDuration(sorted.at(-1) ?? 0),
  };
}

function assessLatency(
  actualMs: number,
  budgetMs: number,
): MemoryBenchmarkLatencyStatus {
  if (actualMs <= budgetMs) {
    return "pass";
  }
  if (actualMs <= budgetMs * 1.5) {
    return "warn";
  }
  return "fail";
}

function assessMemoryUsage(input: {
  rssMb: number;
  heapUsedMb: number;
}): MemoryBenchmarkLatencyStatus {
  const rssBudget = MEMORY_BENCHMARK_LATENCY_BUDGETS.maxRssMb;
  const heapBudget = MEMORY_BENCHMARK_LATENCY_BUDGETS.maxHeapUsedMb;
  if (input.rssMb <= rssBudget && input.heapUsedMb <= heapBudget) {
    return "pass";
  }
  if (input.rssMb <= rssBudget * 1.5 && input.heapUsedMb <= heapBudget * 1.5) {
    return "warn";
  }
  return "fail";
}

function bytesToMiB(value: number): number {
  return Math.round((value / 1024 / 1024) * 1000) / 1000;
}

function measureProcessMemoryUsage(): MemoryBenchmarkMemoryUsageMeasurement {
  const usage = process.memoryUsage();
  return {
    unit: "MiB",
    rssMb: bytesToMiB(usage.rss),
    heapTotalMb: bytesToMiB(usage.heapTotal),
    heapUsedMb: bytesToMiB(usage.heapUsed),
    externalMb: bytesToMiB(usage.external),
    arrayBuffersMb: bytesToMiB(usage.arrayBuffers),
  };
}

async function measureSqlitePageCache(): Promise<MemoryBenchmarkSqlitePageCacheMeasurement> {
  const [pageCountRow] = await db
    .getClient()
    .all<{ page_count: number }>(sql`PRAGMA page_count`);
  const [pageSizeRow] = await db
    .getClient()
    .all<{ page_size: number }>(sql`PRAGMA page_size`);
  const pageCount = Number(pageCountRow?.page_count ?? 0);
  const pageSizeBytes = Number(pageSizeRow?.page_size ?? 0);
  return {
    pageCount,
    pageSizeBytes,
    estimatedDbSizeMb: bytesToMiB(pageCount * pageSizeBytes),
  };
}

async function measureChunkSearch(input: {
  projectId: string;
  query: string;
  limit: number;
}): Promise<MemoryBenchmarkLatencyMeasurement> {
  const startedAt = performance.now();
  const rows = await db
    .getClient()
    .select({ id: memoryChunk.id })
    .from(memoryChunk)
    .where(
      and(
        eq(memoryChunk.projectId, input.projectId),
        like(memoryChunk.indexText, `%${input.query}%`),
      ),
    )
    .limit(input.limit);
  return {
    durationMs: roundDuration(performance.now() - startedAt),
    resultCount: rows.length,
  };
}

async function measureCandidateCapSearch(input: {
  projectId: string;
  query: string;
  candidateCap: number;
}): Promise<{ durationMs: number; chunkIds: string[] }> {
  const startedAt = performance.now();
  const rows = await db
    .getClient()
    .select({ id: memoryChunk.id })
    .from(memoryChunk)
    .where(
      and(
        eq(memoryChunk.projectId, input.projectId),
        like(memoryChunk.indexText, `%${input.query}%`),
      ),
    )
    .orderBy(memoryChunk.chunkIndex)
    .limit(input.candidateCap);
  return {
    durationMs: roundDuration(performance.now() - startedAt),
    chunkIds: rows.map((row) => row.id),
  };
}

async function measureCandidateCapComparison(input: {
  projectId: string;
  query: string;
  baselineCap: number;
}): Promise<MemoryBenchmarkCandidateCapMeasurement[]> {
  const candidateCaps = Array.from(
    new Set([20, 40, input.baselineCap].filter((cap) => cap > 0)),
  ).sort((a, b) => a - b);
  const runs = await Promise.all(
    candidateCaps.map((candidateCap) =>
      measureCandidateCapSearch({
        projectId: input.projectId,
        query: input.query,
        candidateCap,
      }).then((measurement) => ({
        candidateCap,
        ...measurement,
      })),
    ),
  );
  const baseline =
    runs.find((run) => run.candidateCap === input.baselineCap) ??
    runs[runs.length - 1];
  const baselineIds = new Set(baseline?.chunkIds ?? []);

  return runs.map((run) => {
    const overlapCount = run.chunkIds.filter((id) => baselineIds.has(id)).length;
    const denominator = Math.max(1, Math.min(run.chunkIds.length, baselineIds.size));
    return {
      candidateCap: run.candidateCap,
      durationMs: run.durationMs,
      resultCount: run.chunkIds.length,
      baselineOverlapRatio: roundDuration(overlapCount / denominator),
    };
  });
}

function estimateCacheTtlMemoryComparison(input: {
  candidateCap: number;
  repeatedIterations: number;
}): MemoryBenchmarkCacheTtlMemoryMeasurement[] {
  const ttlMsValues = [60_000, 180_000, 300_000];
  const estimatedBytesPerEntry = 512;
  const estimatedQueriesPerMinute = Math.max(1, input.repeatedIterations);
  return ttlMsValues.map((ttlMs) => {
    const ttlMinutes = Math.max(1, Math.ceil(ttlMs / 60_000));
    const estimatedEntries =
      input.candidateCap * estimatedQueriesPerMinute * ttlMinutes;
    return {
      ttlMs,
      estimatedEntries,
      estimatedMemoryMb: bytesToMiB(estimatedEntries * estimatedBytesPerEntry),
    };
  });
}

async function measureOptimizationModeComparison(input: {
  projectId: string;
  query: string;
  requestedLimit?: number;
}): Promise<MemoryBenchmarkOptimizationModeMeasurement[]> {
  const modes: SearchOptimizationMode[] = [
    "low-end",
    "standard",
    "high-end",
    "quality",
  ];
  const runs = await Promise.all(
    modes.map(async (mode) => {
      const policy = resolveSearchOptimizationPolicy({
        mode,
        requestedLimit: input.requestedLimit,
      });
      const measurement = await measureCandidateCapSearch({
        projectId: input.projectId,
        query: input.query,
        candidateCap: policy.candidateCap,
      });
      return {
        mode,
        policy,
        ...measurement,
      };
    }),
  );
  const baseline = runs.find((run) => run.mode === "quality") ?? runs.at(-1);
  const baselineIds = new Set(baseline?.chunkIds ?? []);

  return runs.map((run) => {
    const overlapCount = run.chunkIds.filter((id) => baselineIds.has(id)).length;
    const denominator = Math.max(1, Math.min(run.chunkIds.length, baselineIds.size));
    return {
      mode: run.mode,
      durationMs: run.durationMs,
      resultCount: run.chunkIds.length,
      baselineOverlapRatio: roundDuration(overlapCount / denominator),
      candidateCap: run.policy.candidateCap,
      contextBudgetChars: run.policy.contextBudgetChars,
      rerankCacheTtlMs: run.policy.rerankCacheTtlMs,
      vectorSearchMode: run.policy.vectorSearchMode,
    };
  });
}

async function measureRagSearchPath(input: {
  projectId: string;
  query: string;
  limit: number;
  iterations: number;
}): Promise<{
  path: MemoryBenchmarkRagPathMeasurement;
  stages: MemoryBenchmarkRagStageMeasurement[];
}> {
  const durations: number[] = [];
  const stageDiagnostics: RagSearchStageDiagnostic[] = [];
  let resultCount = 0;
  for (let index = 0; index < input.iterations; index += 1) {
    const startedAt = performance.now();
    // 순차 반복 질의의 warm latency 분포를 측정해야 하므로 병렬 실행하지 않는다.
    // eslint-disable-next-line no-await-in-loop
    const rows = await searchMemoryChunksForRag({
      projectId: input.projectId,
      query: input.query,
      limit: input.limit,
      parentWindow: { before: 1, after: 1 },
      diagnostics: { stages: stageDiagnostics },
    });
    durations.push(performance.now() - startedAt);
    resultCount = Math.max(resultCount, rows.length);
  }
  return {
    path: {
      path: "searchMemoryChunksForRag",
      iterations: input.iterations,
      resultCount,
      ...summarizeDurations(durations),
    },
    stages: summarizeRagStageDiagnostics(stageDiagnostics),
  };
}

const RAG_SEARCH_STAGE_ORDER: RagSearchStageName[] = [
  "fts",
  "exactPhrase",
  "quoteToken",
  "shortToken",
  "vector",
  "rrf",
  "hydrate",
  "parentWindow",
];

function summarizeRagStageDiagnostics(
  diagnostics: RagSearchStageDiagnostic[],
): MemoryBenchmarkRagStageMeasurement[] {
  return RAG_SEARCH_STAGE_ORDER.map((stage) => {
    const rows = diagnostics.filter((row) => row.stage === stage);
    return {
      stage,
      iterations: rows.length,
      maxCandidateCount: rows.reduce(
        (max, row) => Math.max(max, row.candidateCount),
        0,
      ),
      skippedCount: rows.filter((row) => row.skipped).length,
      ...summarizeDurations(rows.map((row) => row.durationMs)),
    };
  });
}

async function measureLayer3EvidencePath(input: {
  projectId: string;
  query: string;
  iterations: number;
}): Promise<MemoryBenchmarkLayer3PathMeasurement> {
  const durations: number[] = [];
  let evidenceCount = 0;
  for (let index = 0; index < input.iterations; index += 1) {
    const startedAt = performance.now();
    // 순차 반복 질의의 warm latency 분포를 측정해야 하므로 병렬 실행하지 않는다.
    // eslint-disable-next-line no-await-in-loop
    const result = await buildLayer3Evidence(input.projectId, input.query);
    durations.push(performance.now() - startedAt);
    evidenceCount = Math.max(evidenceCount, result.evidence.length);
  }
  return {
    path: "buildLayer3Evidence",
    iterations: input.iterations,
    evidenceCount,
    ...summarizeDurations(durations),
  };
}

export async function runMemoryBenchmarkLatencyReport(input: {
  projectId: string;
  profileName: MemoryLongformBenchmarkProfileName;
  query?: string;
  repeatedIterations?: number;
  limit?: number;
  optimizationMode?: SearchOptimizationMode;
}): Promise<MemoryBenchmarkLatencyReport> {
  const query = input.query ?? "검은 기사";
  const repeatedIterations = input.repeatedIterations ?? 5;
  const optimizationPolicy = resolveSearchOptimizationPolicy({
    mode: input.optimizationMode,
    requestedLimit: input.limit,
  });
  const previousOptimizationMode = process.env.LUIE_SEARCH_OPTIMIZATION_MODE;
  process.env.LUIE_SEARCH_OPTIMIZATION_MODE = optimizationPolicy.mode;
  const limit = optimizationPolicy.resultLimit;
  const normalizedRepeatedIterations = Math.max(1, repeatedIterations);
  try {
    const firstChunkSearch = await measureChunkSearch({
      projectId: input.projectId,
      query,
      limit,
    });
    const repeatedRuns = await Promise.all(
      Array.from({ length: normalizedRepeatedIterations }, () =>
        measureChunkSearch({
          projectId: input.projectId,
          query,
          limit,
        }),
      ),
    );
    const repeatedDurationTotal = repeatedRuns.reduce(
      (sum, item) => sum + item.durationMs,
      0,
    );
    const repeatedChunkSearch = {
      durationMs: roundDuration(repeatedDurationTotal / repeatedRuns.length),
      resultCount: repeatedRuns.reduce(
        (max, item) => Math.max(max, item.resultCount),
        0,
      ),
      iterations: normalizedRepeatedIterations,
      maxDurationMs: roundDuration(
        Math.max(...repeatedRuns.map((item) => item.durationMs)),
      ),
    };
    const memoryUsage = measureProcessMemoryUsage();
    const sqlitePageCache = await measureSqlitePageCache();
    const candidateCapComparison = await measureCandidateCapComparison({
      projectId: input.projectId,
      query,
      baselineCap: optimizationPolicy.candidateCap,
    });
    const cacheTtlMemoryComparison = estimateCacheTtlMemoryComparison({
      candidateCap: optimizationPolicy.candidateCap,
      repeatedIterations: normalizedRepeatedIterations,
    });
    const optimizationModeComparison = await measureOptimizationModeComparison({
      projectId: input.projectId,
      query,
      requestedLimit: input.limit,
    });
    const ragSearchMeasurement = await measureRagSearchPath({
      projectId: input.projectId,
      query,
      limit,
      iterations: normalizedRepeatedIterations,
    });
    const layer3EvidencePath = await measureLayer3EvidencePath({
      projectId: input.projectId,
      query,
      iterations: normalizedRepeatedIterations,
    });
    const memoryStatus = assessMemoryUsage(memoryUsage);

    return {
      schemaVersion: 1,
      projectId: input.projectId,
      profileName: input.profileName,
      query,
      budgets: MEMORY_BENCHMARK_LATENCY_BUDGETS,
      optimizationPolicy,
      regressionThresholds: {
        firstChunkSearchMs:
          MEMORY_BENCHMARK_LATENCY_BUDGETS.firstQueryAfterStartMs,
        repeatedChunkSearchMs: MEMORY_BENCHMARK_LATENCY_BUDGETS.repeatedQueryMs,
        rssMb: MEMORY_BENCHMARK_LATENCY_BUDGETS.maxRssMb,
        heapUsedMb: MEMORY_BENCHMARK_LATENCY_BUDGETS.maxHeapUsedMb,
      },
      measurements: {
        firstChunkSearch,
        repeatedChunkSearch,
        memoryUsage,
        sqlitePageCache,
        candidateCapComparison,
        cacheTtlMemoryComparison,
        optimizationModeComparison,
        ragSearchPath: ragSearchMeasurement.path,
        ragSearchStageBreakdown: ragSearchMeasurement.stages,
        layer3EvidencePath,
        editAfterIndexPlan: {
          mode: MEMORY_BENCHMARK_LATENCY_BUDGETS.editAfterIndexMode,
          reason: "집필 중 수정 이후 재색인은 전면 차단 작업이 아니라 백그라운드 작업이어야 한다.",
        },
        packageProgressPlan: {
          required: MEMORY_BENCHMARK_LATENCY_BUDGETS.packageProgressRequired,
          reason: "대형 세계관 패키지 import/export는 진행률을 보여줘야 작가가 멈춤으로 오해하지 않는다.",
        },
      },
      assessment: {
        firstChunkSearch: {
          status: assessLatency(
            firstChunkSearch.durationMs,
            MEMORY_BENCHMARK_LATENCY_BUDGETS.firstQueryAfterStartMs,
          ),
          budgetMs: MEMORY_BENCHMARK_LATENCY_BUDGETS.firstQueryAfterStartMs,
          actualMs: firstChunkSearch.durationMs,
        },
        repeatedChunkSearch: {
          status: assessLatency(
            repeatedChunkSearch.durationMs,
            MEMORY_BENCHMARK_LATENCY_BUDGETS.repeatedQueryMs,
          ),
          budgetMs: MEMORY_BENCHMARK_LATENCY_BUDGETS.repeatedQueryMs,
          actualMs: repeatedChunkSearch.durationMs,
        },
        memoryUsage: {
          status: memoryStatus,
          rssBudgetMb: MEMORY_BENCHMARK_LATENCY_BUDGETS.maxRssMb,
          heapUsedBudgetMb: MEMORY_BENCHMARK_LATENCY_BUDGETS.maxHeapUsedMb,
          rssActualMb: memoryUsage.rssMb,
          heapUsedActualMb: memoryUsage.heapUsedMb,
        },
      },
    };
  } finally {
    if (previousOptimizationMode === undefined) {
      delete process.env.LUIE_SEARCH_OPTIMIZATION_MODE;
    } else {
      process.env.LUIE_SEARCH_OPTIMIZATION_MODE = previousOptimizationMode;
    }
  }
}

export function summarizeMemoryBenchmarkLatencyFailures(
  report: MemoryBenchmarkLatencyReport,
): string[] {
  const failures: string[] = [];
  if (report.assessment.firstChunkSearch.status === "fail") {
    failures.push(
      `firstChunkSearch ${report.assessment.firstChunkSearch.actualMs}ms > ${report.assessment.firstChunkSearch.budgetMs}ms`,
    );
  }
  if (report.assessment.repeatedChunkSearch.status === "fail") {
    failures.push(
      `repeatedChunkSearch ${report.assessment.repeatedChunkSearch.actualMs}ms > ${report.assessment.repeatedChunkSearch.budgetMs}ms`,
    );
  }
  if (report.assessment.memoryUsage.status === "fail") {
    failures.push(
      `memoryUsage rss ${report.assessment.memoryUsage.rssActualMb}MiB > ${report.assessment.memoryUsage.rssBudgetMb}MiB or heap ${report.assessment.memoryUsage.heapUsedActualMb}MiB > ${report.assessment.memoryUsage.heapUsedBudgetMb}MiB`,
    );
  }
  return failures;
}
