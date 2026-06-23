import { performance } from "node:perf_hooks";
import { and, eq, like } from "drizzle-orm";
import {
  db,
  memoryChunk,
} from "../../../../../infra/database/index.js";
import {
  resolveSearchOptimizationPolicy,
  type SearchOptimizationMode,
} from "../../../search/searchOptimizationPolicy.js";
import {
  bytesToMiB,
  roundDuration,
} from "./statistics.js";
import type {
  MemoryBenchmarkCacheTtlMemoryMeasurement,
  MemoryBenchmarkCandidateCapMeasurement,
  MemoryBenchmarkLatencyMeasurement,
  MemoryBenchmarkOptimizationModeMeasurement,
  MemoryBenchmarkRerankCacheProbeMeasurement,
} from "./types.js";

export async function measureChunkSearch(input: {
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

export async function measureCandidateCapComparison(input: {
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

export function estimateCacheTtlMemoryComparison(input: {
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

export async function measureRerankCacheProbe(input: {
  projectId: string;
  query: string;
  candidateCap: number;
  ttlMs: number;
  repeatedIterations: number;
}): Promise<MemoryBenchmarkRerankCacheProbeMeasurement> {
  const cache = new Map<
    string,
    {
      expiresAt: number;
      chunkIds: string[];
    }
  >();
  const cacheKey = `${input.projectId}:${input.query}:${input.candidateCap}`;
  let hits = 0;
  let misses = 0;
  const heapBefore = process.memoryUsage().heapUsed;

  for (let index = 0; index < Math.max(1, input.repeatedIterations); index += 1) {
    const cached = cache.get(cacheKey);
    const now = performance.now();
    if (cached && cached.expiresAt > now) {
      hits += 1;
      continue;
    }

    misses += 1;
    // 동일 query 반복 시 실제 Map TTL cache의 hit/miss와 entry 증가를 측정해야 하므로 순차 처리한다.
    // eslint-disable-next-line no-await-in-loop
    const measurement = await measureCandidateCapSearch({
      projectId: input.projectId,
      query: input.query,
      candidateCap: input.candidateCap,
    });
    cache.set(cacheKey, {
      expiresAt: performance.now() + input.ttlMs,
      chunkIds: measurement.chunkIds,
    });
  }

  const heapAfter = process.memoryUsage().heapUsed;
  const cachedChunkIds = [...cache.values()].reduce(
    (sum, entry) => sum + entry.chunkIds.length,
    0,
  );

  return {
    ttlMs: input.ttlMs,
    queries: Math.max(1, input.repeatedIterations),
    hits,
    misses,
    entries: cache.size,
    cachedChunkIds,
    heapDeltaMb: bytesToMiB(Math.max(0, heapAfter - heapBefore)),
  };
}

export async function measureOptimizationModeComparison(input: {
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
