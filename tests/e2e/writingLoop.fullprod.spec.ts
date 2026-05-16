import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import { closeApp, launchApp } from "./_helpers/electronApp";

type ApiResponse<T> = { success?: boolean; data?: T; error?: unknown };

const toNumber = (raw: string | undefined, fallback: number) => {
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const quantile = (values: number[], q: number) => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(sorted.length * q) - 1),
  );
  return sorted[index];
};

test("measures write-loop stability on full production mode @stress", async () => {
  const testTimeoutMs = toNumber(process.env.LUIE_FULLPROD_TEST_TIMEOUT_MS, 240000);
  test.setTimeout(testTimeoutMs);

  const chapters = toNumber(process.env.LUIE_FULLPROD_CHAPTERS, 300);
  const burstOps = toNumber(process.env.LUIE_FULLPROD_BURST_OPS, 600);
  const maxWaitMs = toNumber(process.env.LUIE_FULLPROD_MAX_WAIT_MS, 120000);
  const p95Limit = toNumber(process.env.LUIE_FULLPROD_ASSERT_P95_MS, 800);
  const p99Limit = toNumber(process.env.LUIE_FULLPROD_ASSERT_P99_MS, 2000);
  const contentSize = 5000;
  const contentBase = "가".repeat(contentSize);

  const { app, page, testDbDir } = await launchApp({ envOverrides: {} });

  const call = async <T>(fn: () => Promise<ApiResponse<T>>, label: string) => {
    const started = performance.now();
    const response = await fn();
    const elapsed = performance.now() - started;
    if (!response.success) {
      throw new Error(`${label} failed: ${JSON.stringify(response.error)}`);
    }
    return { response, elapsed };
  };

  const suffix = `${Date.now()}-${process.pid}-${randomUUID().slice(0, 8)}`;
  const projectPath = `/tmp/writing-loop-fullprod-${suffix}.luie`;
  const project = await call(
    async () =>
      await page.evaluate(async (input) => {
        const api = (window as Window & { api?: Window["api"] }).api;
        if (!api) return { success: false, error: { message: "window.api missing" } };
        return (await api.project.create(input)) as ApiResponse<{ id: string }>;
      }, {
        title: `Writing Loop FullProd ${suffix}`,
        description: "full-production",
        projectPath,
      }),
    "project.create",
  );
  const projectId = project.response.data?.id;
  if (!projectId) throw new Error("project.create returned no project id");

  const chapterIds: string[] = [];
  const createStartedAt = performance.now();
  for (let i = 0; i < chapters; i += 1) {
    const createResult = await call(
      async () =>
        await page.evaluate(async (input) => {
          const api = (window as Window & { api?: Window["api"] }).api;
          if (!api) return { success: false, error: { message: "window.api missing" } };
          return (await api.chapter.create(input)) as ApiResponse<{ id?: string }>;
        }, {
          projectId,
          title: `Chapter ${i + 1}`,
        }),
      `chapter.create[${i}]`,
    );
    const chapterId = createResult.response.data?.id;
    if (!chapterId) throw new Error(`chapter.create[${i}] returned no id`);
    chapterIds.push(chapterId);
  }
  const createDurationMs = performance.now() - createStartedAt;

  const saveLatencies: number[] = [];
  const saveStartedAt = performance.now();
  for (let i = 0; i < chapterIds.length; i += 1) {
    const result = await call(
      async () =>
        await page.evaluate(async (input) => {
          const api = (window as Window & { api?: Window["api"] }).api;
          if (!api) return { success: false, error: { message: "window.api missing" } };
          return (await api.chapter.update(input)) as ApiResponse<{ id: string }>;
        }, {
          id: chapterIds[i],
          content: `${contentBase}${String(i).padStart(6, "0")}`,
        }),
      `chapter.update.seed[${i}]`,
    );
    saveLatencies.push(result.elapsed);
  }

  for (let i = 0; i < burstOps; i += 1) {
    const targetChapterId = chapterIds[i % chapterIds.length];
    const result = await call(
      async () =>
        await page.evaluate(async (input) => {
          const api = (window as Window & { api?: Window["api"] }).api;
          if (!api) return { success: false, error: { message: "window.api missing" } };
          return (await api.chapter.update(input)) as ApiResponse<{ id: string }>;
        }, {
          id: targetChapterId,
          content: `${contentBase}${String(i).padStart(8, "0")}`,
        }),
      `chapter.update.burst[${i}]`,
    );
    saveLatencies.push(result.elapsed);
  }
  const saveDurationMs = performance.now() - saveStartedAt;

  const waitStart = performance.now();
  let lastSearchStatus: Record<string, unknown> | null = null;
  let lastMemoryStatus: Record<string, unknown> | null = null;
  while (performance.now() - waitStart < maxWaitMs) {
    const status = await call(
      async () =>
        await page.evaluate(async (inputProjectId) => {
          const api = (window as Window & { api?: Window["api"] }).api;
          if (!api) return { success: false, error: { message: "window.api missing" } };
          const [search, memory] = await Promise.all([
            api.searchAdmin.getIndexStatus(inputProjectId),
            api.memoryAdmin.getJobStatus(inputProjectId),
          ]);
          if (!search.success || !memory.success) {
            return { success: false, error: { search: search.error, memory: memory.error } };
          }
          return { success: true, data: { search: search.data, memory: memory.data } };
        }, projectId),
      "status.poll",
    );

    const data = status.response.data as {
      search: { pendingCount?: number; runningCount?: number; failedCount?: number };
      memory: { pendingCount?: number; runningCount?: number; failedCount?: number };
    };
    lastSearchStatus = data.search;
    lastMemoryStatus = data.memory;

    const searchDone = (data.search.pendingCount ?? 0) === 0 && (data.search.runningCount ?? 0) === 0;
    const memoryDone = (data.memory.pendingCount ?? 0) === 0 && (data.memory.runningCount ?? 0) === 0;
    if (searchDone && memoryDone) break;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  const queueDrainMs = performance.now() - waitStart;

  const summary = {
    dataset: { chapters, contentSize, burstOps },
    createDurationMs,
    saveDurationMs,
    saveLatencyMs: {
      p50: quantile(saveLatencies, 0.5),
      p95: quantile(saveLatencies, 0.95),
      p99: quantile(saveLatencies, 0.99),
      max: Math.max(...saveLatencies),
      avg: saveLatencies.reduce((sum, value) => sum + value, 0) / saveLatencies.length,
      count: saveLatencies.length,
    },
    derivedStatus: {
      search: lastSearchStatus,
      memory: lastMemoryStatus,
      queueDrainMs,
    },
    projectId,
    projectPath,
  };

  const profileName = process.env.LUIE_FULLPROD_PROFILE ?? "fullprod";
  const outPath = path.join(
    process.cwd(),
    "tests",
    ".tmp",
    `e2e-writing-loop-fullprod-${profileName}.json`,
  );
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(summary, null, 2), "utf8");

  test.info().annotations.push({
    type: "writing-loop-fullprod",
    description: `p95=${summary.saveLatencyMs.p95.toFixed(2)}ms, p99=${summary.saveLatencyMs.p99.toFixed(2)}ms, queueDrain=${summary.derivedStatus.queueDrainMs.toFixed(0)}ms`,
  });

  expect(summary.saveLatencyMs.p95).toBeLessThan(p95Limit);
  expect(summary.saveLatencyMs.p99).toBeLessThan(p99Limit);
  expect((summary.derivedStatus.search as { failedCount?: number } | null)?.failedCount ?? 0).toBe(0);
  expect((summary.derivedStatus.memory as { failedCount?: number } | null)?.failedCount ?? 0).toBe(0);

  await closeApp(app, testDbDir);
});
