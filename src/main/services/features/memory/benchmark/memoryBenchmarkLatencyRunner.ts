import {
  resolveSearchOptimizationPolicy,
  type SearchOptimizationMode,
} from "../../search/searchOptimizationPolicy.js";
import {
  estimateCacheTtlMemoryComparison,
  measureCandidateCapComparison,
  measureChunkSearch,
  measureOptimizationModeComparison,
  measureRerankCacheProbe,
} from "./latency/chunkSearchMeasurements.js";
import {
  assessLatency,
  assessMemoryUsage,
  measureProcessMemoryUsage,
  measureSqlitePageCache,
  roundDuration,
} from "./latency/statistics.js";
import {
  MEMORY_BENCHMARK_LATENCY_BUDGETS,
  type MemoryBenchmarkLatencyReport,
} from "./latency/types.js";
import {
  measureLayer3EvidencePath,
  measureRagSearchPath,
  measureVectorSearchProbe,
  measureWriterFlowQuerySet,
} from "./latency/ragPathMeasurements.js";
import type { MemoryLongformBenchmarkProfileName } from "./memoryLongformBenchmarkSeed.js";

export * from "./latency/types.js";

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
    const rerankCacheProbe = await measureRerankCacheProbe({
      projectId: input.projectId,
      query,
      candidateCap: optimizationPolicy.candidateCap,
      ttlMs: optimizationPolicy.rerankCacheTtlMs,
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
    const vectorSearchProbe = await measureVectorSearchProbe({
      projectId: input.projectId,
      query,
      limit,
      iterations: normalizedRepeatedIterations,
    });
    const writerFlowQuerySet = await measureWriterFlowQuerySet({
      projectId: input.projectId,
      limit,
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
        rerankCacheProbe,
        optimizationModeComparison,
        ragSearchPath: ragSearchMeasurement.path,
        ragSearchStageBreakdown: ragSearchMeasurement.stages,
        layer3EvidencePath,
        vectorSearchProbe,
        writerFlowQuerySet,
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
