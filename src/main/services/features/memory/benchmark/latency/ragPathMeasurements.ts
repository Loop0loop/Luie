import { performance } from "node:perf_hooks";
import { and, eq } from "drizzle-orm";
import {
  db,
  memoryChunk,
  memoryEmbedding,
} from "../../../../../infra/database/index.js";
import {
  searchMemoryChunksForRag,
  type RagSearchStageDiagnostic,
  type RagSearchStageName,
} from "../../../rag/internal/contextAssembler.search.js";
import type { RagEmbeddingProvider } from "../../../rag/internal/contextAssembler.types.js";
import { buildLayer3Evidence } from "../../../rag/internal/contextAssembler.layer3.js";
import {
  summarizeColdWarmDurations,
  summarizeDurations,
} from "./statistics.js";
import type {
  MemoryBenchmarkLayer3PathMeasurement,
  MemoryBenchmarkRagPathMeasurement,
  MemoryBenchmarkRagStageMeasurement,
  MemoryBenchmarkVectorProbeMeasurement,
  MemoryBenchmarkWriterFlowQueryCategory,
  MemoryBenchmarkWriterFlowQueryMeasurement,
} from "./types.js";

const MEMORY_BENCHMARK_WRITER_FLOW_QUERIES: Array<{
  category: MemoryBenchmarkWriterFlowQueryCategory;
  query: string;
}> = [
  {
    category: "alias-lookup",
    query: "검은 기사",
  },
  {
    category: "temporal-marker",
    query: "chapter 12",
  },
  {
    category: "rewrite-marker",
    query: "rewrite-marker",
  },
  {
    category: "state-change",
    query: "state-change",
  },
];

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

export async function measureRagSearchPath(input: {
  projectId: string;
  query: string;
  limit: number;
  iterations: number;
  embedTexts?: RagEmbeddingProvider;
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
      embedTexts: input.embedTexts,
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
      ...summarizeColdWarmDurations(durations),
      ...summarizeDurations(durations),
    },
    stages: summarizeRagStageDiagnostics(stageDiagnostics),
  };
}

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

function vectorToBuffer(vector: Float32Array): Buffer {
  return Buffer.from(vector.buffer, vector.byteOffset, vector.byteLength);
}

function buildSyntheticBenchmarkVector(seed: number): Float32Array {
  return Float32Array.from([
    1,
    (seed % 17) / 17,
    (seed % 31) / 31,
    (seed % 47) / 47,
  ]);
}

async function materializeSyntheticBenchmarkEmbeddings(input: {
  projectId: string;
  limit: number;
}): Promise<number> {
  const rows = await db
    .getClient()
    .select({
      chunkId: memoryChunk.id,
      projectId: memoryChunk.projectId,
      contentHash: memoryChunk.indexTextHash,
      chunkIndex: memoryChunk.chunkIndex,
    })
    .from(memoryChunk)
    .where(
      and(
        eq(memoryChunk.projectId, input.projectId),
        eq(memoryChunk.sourceType, "benchmark"),
      ),
    )
    .orderBy(memoryChunk.chunkIndex)
    .limit(input.limit);
  const nowIso = new Date().toISOString();

  for (const row of rows) {
    const vector = buildSyntheticBenchmarkVector(row.chunkIndex);
    // 벤치마크 전용 synthetic embedding upsert는 chunk/vector pairing을 유지해야 하므로 순차 처리한다.
    // eslint-disable-next-line no-await-in-loop
    await db
      .getClient()
      .insert(memoryEmbedding)
      .values({
        id: `${row.chunkId}:benchmark-vector`,
        chunkId: row.chunkId,
        projectId: row.projectId,
        contentHash: row.contentHash,
        vec: vectorToBuffer(vector),
        dimension: vector.length,
        model: "benchmark:synthetic-vector",
        createdAt: nowIso,
        updatedAt: nowIso,
      })
      .onConflictDoUpdate({
        target: [memoryEmbedding.chunkId],
        set: {
          projectId: row.projectId,
          contentHash: row.contentHash,
          vec: vectorToBuffer(vector),
          dimension: vector.length,
          model: "benchmark:synthetic-vector",
          updatedAt: nowIso,
        },
      });
  }

  return rows.length;
}

export async function measureVectorSearchProbe(input: {
  projectId: string;
  query: string;
  limit: number;
  iterations: number;
}): Promise<MemoryBenchmarkVectorProbeMeasurement> {
  const embeddingRowsMaterialized = await materializeSyntheticBenchmarkEmbeddings({
    projectId: input.projectId,
    limit: Math.max(input.limit, 50),
  });
  const previousOptimizationMode = process.env.LUIE_SEARCH_OPTIMIZATION_MODE;
  const previousUtilityProcess = process.env.LUIE_IS_UTILITY_PROCESS;
  process.env.LUIE_SEARCH_OPTIMIZATION_MODE = "quality";
  process.env.LUIE_IS_UTILITY_PROCESS = "1";
  try {
    const measurement = await measureRagSearchPath({
      projectId: input.projectId,
      query: input.query,
      limit: input.limit,
      iterations: input.iterations,
      embedTexts: async () => [buildSyntheticBenchmarkVector(0)],
    });
    return {
      mode: "quality",
      embeddingRowsMaterialized,
      path: measurement.path,
      vectorStage:
        measurement.stages.find((stage) => stage.stage === "vector") ?? null,
    };
  } finally {
    if (previousOptimizationMode === undefined) {
      delete process.env.LUIE_SEARCH_OPTIMIZATION_MODE;
    } else {
      process.env.LUIE_SEARCH_OPTIMIZATION_MODE = previousOptimizationMode;
    }
    if (previousUtilityProcess === undefined) {
      delete process.env.LUIE_IS_UTILITY_PROCESS;
    } else {
      process.env.LUIE_IS_UTILITY_PROCESS = previousUtilityProcess;
    }
  }
}

export async function measureLayer3EvidencePath(input: {
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
    ...summarizeColdWarmDurations(durations),
    ...summarizeDurations(durations),
  };
}

export async function measureWriterFlowQuerySet(input: {
  projectId: string;
  limit: number;
  iterations: number;
}): Promise<MemoryBenchmarkWriterFlowQueryMeasurement[]> {
  const measurements: MemoryBenchmarkWriterFlowQueryMeasurement[] = [];

  for (const item of MEMORY_BENCHMARK_WRITER_FLOW_QUERIES) {
    // writer-flow query별 cold/warm 분포를 독립적으로 남겨야 하므로 순차 측정한다.
    // eslint-disable-next-line no-await-in-loop
    const ragSearchMeasurement = await measureRagSearchPath({
      projectId: input.projectId,
      query: item.query,
      limit: input.limit,
      iterations: input.iterations,
    });
    // eslint-disable-next-line no-await-in-loop
    const layer3EvidencePath = await measureLayer3EvidencePath({
      projectId: input.projectId,
      query: item.query,
      iterations: input.iterations,
    });
    measurements.push({
      category: item.category,
      query: item.query,
      ragSearchPath: ragSearchMeasurement.path,
      layer3EvidencePath,
    });
  }

  return measurements;
}
