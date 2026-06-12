import type {
  SearchOptimizationMode,
  SearchOptimizationPolicy,
} from "../../../search/searchOptimizationPolicy.js";
import type {
  RagSearchStageName,
} from "../../../rag/internal/contextAssembler.search.js";
import type { MemoryLongformBenchmarkProfileName } from "../memoryLongformBenchmarkSeed.js";

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

export type MemoryBenchmarkRerankCacheProbeMeasurement = {
  ttlMs: number;
  queries: number;
  hits: number;
  misses: number;
  entries: number;
  cachedChunkIds: number;
  heapDeltaMb: number;
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
  coldStartMs: number;
  warmIterations: number;
  warmP50Ms: number;
  warmP95Ms: number;
  warmP99Ms: number;
  warmMaxMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  maxMs: number;
};

export type MemoryBenchmarkRagStageMeasurement = {
  stage: RagSearchStageName;
  iterations: number;
  maxCandidateCount: number;
  skippedCount: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  maxMs: number;
};

export type MemoryBenchmarkLayer3PathMeasurement = {
  path: "buildLayer3Evidence";
  iterations: number;
  evidenceCount: number;
  coldStartMs: number;
  warmIterations: number;
  warmP50Ms: number;
  warmP95Ms: number;
  warmP99Ms: number;
  warmMaxMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  maxMs: number;
};

export type MemoryBenchmarkVectorProbeMeasurement = {
  mode: "quality";
  embeddingRowsMaterialized: number;
  path: MemoryBenchmarkRagPathMeasurement;
  vectorStage: MemoryBenchmarkRagStageMeasurement | null;
};

export type MemoryBenchmarkWriterFlowQueryCategory =
  | "alias-lookup"
  | "temporal-marker"
  | "rewrite-marker"
  | "state-change";

export type MemoryBenchmarkWriterFlowQueryMeasurement = {
  category: MemoryBenchmarkWriterFlowQueryCategory;
  query: string;
  ragSearchPath: MemoryBenchmarkRagPathMeasurement;
  layer3EvidencePath: MemoryBenchmarkLayer3PathMeasurement;
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
    rerankCacheProbe: MemoryBenchmarkRerankCacheProbeMeasurement;
    optimizationModeComparison: MemoryBenchmarkOptimizationModeMeasurement[];
    ragSearchPath: MemoryBenchmarkRagPathMeasurement;
    ragSearchStageBreakdown: MemoryBenchmarkRagStageMeasurement[];
    layer3EvidencePath: MemoryBenchmarkLayer3PathMeasurement;
    vectorSearchProbe: MemoryBenchmarkVectorProbeMeasurement;
    writerFlowQuerySet: MemoryBenchmarkWriterFlowQueryMeasurement[];
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
