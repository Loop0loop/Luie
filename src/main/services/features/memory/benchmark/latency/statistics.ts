import { sql } from "drizzle-orm";
import { db } from "../../../../../infra/database/index.js";
import {
  MEMORY_BENCHMARK_LATENCY_BUDGETS,
  type MemoryBenchmarkLatencyStatus,
  type MemoryBenchmarkMemoryUsageMeasurement,
  type MemoryBenchmarkSqlitePageCacheMeasurement,
} from "./types.js";

export function roundDuration(value: number): number {
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

export function summarizeDurations(durations: number[]): {
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  maxMs: number;
} {
  const sorted = [...durations].sort((a, b) => a - b);
  return {
    p50Ms: roundDuration(percentile(sorted, 50)),
    p95Ms: roundDuration(percentile(sorted, 95)),
    p99Ms: roundDuration(percentile(sorted, 99)),
    maxMs: roundDuration(sorted.at(-1) ?? 0),
  };
}

export function summarizeColdWarmDurations(durations: number[]): {
  coldStartMs: number;
  warmIterations: number;
  warmP50Ms: number;
  warmP95Ms: number;
  warmP99Ms: number;
  warmMaxMs: number;
} {
  const warmDurations = durations.slice(1);
  const warmSummary = summarizeDurations(warmDurations);
  return {
    coldStartMs: roundDuration(durations[0] ?? 0),
    warmIterations: warmDurations.length,
    warmP50Ms: warmSummary.p50Ms,
    warmP95Ms: warmSummary.p95Ms,
    warmP99Ms: warmSummary.p99Ms,
    warmMaxMs: warmSummary.maxMs,
  };
}

export function assessLatency(
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

export function assessMemoryUsage(input: {
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

export function bytesToMiB(value: number): number {
  return Math.round((value / 1024 / 1024) * 1000) / 1000;
}

export function measureProcessMemoryUsage(): MemoryBenchmarkMemoryUsageMeasurement {
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

export async function measureSqlitePageCache(): Promise<MemoryBenchmarkSqlitePageCacheMeasurement> {
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
