import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import { closeApp, launchApp } from "./_helpers/electronApp";

type ApiResponse<T> = { success?: boolean; data?: T; error?: unknown };
type DerivedStatus = {
  pendingCount?: number;
  runningCount?: number;
  failedCount?: number;
};

const isDrained = (status: DerivedStatus | null): boolean =>
  (status?.pendingCount ?? 0) === 0 && (status?.runningCount ?? 0) === 0;

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
  const testTimeoutMs = toNumber(
    process.env.LUIE_FULLPROD_TEST_TIMEOUT_MS,
    240000,
  );
  test.setTimeout(testTimeoutMs);

  const chapters = toNumber(process.env.LUIE_FULLPROD_CHAPTERS, 300);
  const burstOps = toNumber(process.env.LUIE_FULLPROD_BURST_OPS, 600);
  const maxWaitMs = toNumber(process.env.LUIE_FULLPROD_MAX_WAIT_MS, 120000);
  const p95Limit = toNumber(process.env.LUIE_FULLPROD_ASSERT_P95_MS, 800);
  const p99Limit = toNumber(process.env.LUIE_FULLPROD_ASSERT_P99_MS, 2000);
  const contentSize = 5000;
  const contentBase = "가".repeat(contentSize);

  const { app, page, testDbDir } = await launchApp({ envOverrides: {} });
  const lifecycle = {
    pageClosedAt: null as string | null,
    pageCrashedAt: null as string | null,
    processExit: null as { code: number | null; signal: string | null } | null,
    rendererErrors: [] as string[],
  };
  page.once("close", () => {
    lifecycle.pageClosedAt = new Date().toISOString();
  });
  page.once("crash", () => {
    lifecycle.pageCrashedAt = new Date().toISOString();
  });
  page.on("pageerror", (error) => {
    lifecycle.rendererErrors.push(error.message);
  });
  app.process().once("exit", (code, signal) => {
    lifecycle.processExit = { code, signal };
  });
  await app.evaluate(() => {
    const { monitorEventLoopDelay } =
      process.getBuiltinModule("node:perf_hooks");
    const monitor = monitorEventLoopDelay({ resolution: 20 });
    monitor.enable();
    (
      globalThis as typeof globalThis & {
        __luieEventLoopDelay?: typeof monitor;
      }
    ).__luieEventLoopDelay = monitor;
  });
  let failureCount = 0;
  let completed = false;

  const call = async <T>(fn: () => Promise<ApiResponse<T>>, label: string) => {
    const started = performance.now();
    const response = await fn();
    const elapsed = performance.now() - started;
    if (!response.success) {
      failureCount += 1;
      throw new Error(`${label} failed: ${JSON.stringify(response.error)}`);
    }
    return { response, elapsed };
  };

  const suffix = `${Date.now()}-${process.pid}-${randomUUID().slice(0, 8)}`;
  const projectPath = path.join(
    testDbDir,
    `writing-loop-fullprod-${suffix}.luie`,
  );
  try {
    const project = await call(
      async () =>
        await page.evaluate(
          async (input) => {
            const api = (window as Window & { api?: Window["api"] }).api;
            if (!api)
              return {
                success: false,
                error: { message: "window.api missing" },
              };
            return (await api.project.create(input)) as ApiResponse<{
              id: string;
            }>;
          },
          {
            title: `Writing Loop FullProd ${suffix}`,
            description: "full-production",
            projectPath,
          },
        ),
      "project.create",
    );
    const projectId = project.response.data?.id;
    if (!projectId) throw new Error("project.create returned no project id");

    const chapterIds: string[] = [];
    const createStartedAt = performance.now();
    for (let i = 0; i < chapters; i += 1) {
      const createResult = await call(
        async () =>
          await page.evaluate(
            async (input) => {
              const api = (window as Window & { api?: Window["api"] }).api;
              if (!api)
                return {
                  success: false,
                  error: { message: "window.api missing" },
                };
              return (await api.chapter.create(input)) as ApiResponse<{
                id?: string;
              }>;
            },
            {
              projectId,
              title: `Chapter ${i + 1}`,
            },
          ),
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
          await page.evaluate(
            async (input) => {
              const api = (window as Window & { api?: Window["api"] }).api;
              if (!api)
                return {
                  success: false,
                  error: { message: "window.api missing" },
                };
              return (await api.chapter.update(input)) as ApiResponse<{
                id: string;
              }>;
            },
            {
              id: chapterIds[i],
              content: `${contentBase}${String(i).padStart(6, "0")}`,
            },
          ),
        `chapter.update.seed[${i}]`,
      );
      saveLatencies.push(result.elapsed);
    }

    for (let i = 0; i < burstOps; i += 1) {
      const targetChapterId = chapterIds[i % chapterIds.length];
      const result = await call(
        async () =>
          await page.evaluate(
            async (input) => {
              const api = (window as Window & { api?: Window["api"] }).api;
              if (!api)
                return {
                  success: false,
                  error: { message: "window.api missing" },
                };
              return (await api.chapter.update(input)) as ApiResponse<{
                id: string;
              }>;
            },
            {
              id: targetChapterId,
              content: `${contentBase}${String(i).padStart(8, "0")}`,
            },
          ),
        `chapter.update.burst[${i}]`,
      );
      saveLatencies.push(result.elapsed);
    }
    const saveDurationMs = performance.now() - saveStartedAt;

    const waitStart = performance.now();
    let lastSearchStatus: Record<string, unknown> | null = null;
    let lastMemoryStatus: Record<string, unknown> | null = null;
    let lastSummaryStatus: Record<string, unknown> | null = null;
    let lastEmbeddingStatus: Record<string, unknown> | null = null;
    while (performance.now() - waitStart < maxWaitMs) {
      const status = await call(
        async () =>
          await page.evaluate(async (inputProjectId) => {
            const api = (window as Window & { api?: Window["api"] }).api;
            if (!api)
              return {
                success: false,
                error: { message: "window.api missing" },
              };
            const [search, memory, summary, embedding] = await Promise.all([
              api.searchAdmin.getIndexStatus(inputProjectId),
              api.memoryAdmin.getJobStatus(inputProjectId),
              api.memoryAdmin.getSummaryStatus(inputProjectId),
              api.memoryAdmin.getEmbeddingStatus(inputProjectId),
            ]);
            if (
              !search.success ||
              !memory.success ||
              !summary.success ||
              !embedding.success
            ) {
              return {
                success: false,
                error: {
                  search: search.error,
                  memory: memory.error,
                  summary: summary.error,
                  embedding: embedding.error,
                },
              };
            }
            return {
              success: true,
              data: {
                search: search.data,
                memory: memory.data,
                summary: summary.data,
                embedding: embedding.data,
              },
            };
          }, projectId),
        "status.poll",
      );

      const data = status.response.data as Record<
        "search" | "memory" | "summary" | "embedding",
        DerivedStatus
      >;
      lastSearchStatus = data.search;
      lastMemoryStatus = data.memory;
      lastSummaryStatus = data.summary;
      lastEmbeddingStatus = data.embedding;

      if (
        [data.search, data.memory, data.summary, data.embedding].every(
          isDrained,
        )
      ) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    const queueDrainMs = performance.now() - waitStart;
    const manualSave = await call(
      async () =>
        await page.evaluate(async (inputProjectId) => {
          const api = (window as Window & { api?: Window["api"] }).api;
          if (!api) {
            return { success: false, error: { message: "window.api missing" } };
          }
          return (await api.app.manualSave(inputProjectId)) as ApiResponse<{
            success: boolean;
            exported: boolean;
          }>;
        }, projectId),
      "app.manualSave",
    );
    const mainProcess = await app.evaluate(() => {
      const monitor = (
        globalThis as typeof globalThis & {
          __luieEventLoopDelay?: {
            disable: () => void;
            mean: number;
            max: number;
            percentile: (value: number) => number;
          };
        }
      ).__luieEventLoopDelay;
      if (!monitor) throw new Error("main event-loop monitor missing");
      const metrics = {
        eventLoopDelayMs: {
          mean: monitor.mean / 1e6,
          p95: monitor.percentile(95) / 1e6,
          p99: monitor.percentile(99) / 1e6,
          max: monitor.max / 1e6,
        },
        memoryBytes: process.memoryUsage(),
        cpuUsageMicros: process.cpuUsage(),
      };
      monitor.disable();
      delete (
        globalThis as typeof globalThis & {
          __luieEventLoopDelay?: unknown;
        }
      ).__luieEventLoopDelay;
      return metrics;
    });
    const fileSize = (filePath: string): number =>
      fs.existsSync(filePath) ? fs.statSync(filePath).size : 0;
    const storageBytes = {
      mainDb: fileSize(path.join(testDbDir, "test.db")),
      mainWal: fileSize(path.join(testDbDir, "test.db-wal")),
      cacheDb: fileSize(path.join(testDbDir, "test-cache.db")),
      cacheWal: fileSize(path.join(testDbDir, "test-cache.db-wal")),
      package: fileSize(projectPath),
    };

    const summary = {
      dataset: { chapters, contentSize, burstOps },
      createDurationMs,
      saveDurationMs,
      saveLatencyMs: {
        p50: quantile(saveLatencies, 0.5),
        p95: quantile(saveLatencies, 0.95),
        p99: quantile(saveLatencies, 0.99),
        max: Math.max(...saveLatencies),
        avg:
          saveLatencies.reduce((sum, value) => sum + value, 0) /
          saveLatencies.length,
        count: saveLatencies.length,
      },
      derivedStatus: {
        search: lastSearchStatus,
        memory: lastMemoryStatus,
        summary: lastSummaryStatus,
        embedding: lastEmbeddingStatus,
        queueDrainMs,
      },
      failureCount,
      failureRate: failureCount / (chapters * 2 + burstOps + 2),
      manualSaveLatencyMs: manualSave.elapsed,
      mainProcess,
      storageBytes: {
        ...storageBytes,
        total: Object.values(storageBytes).reduce(
          (total, value) => total + value,
          0,
        ),
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
    expect(failureCount).toBe(0);
    expect(manualSave.response.data?.exported).toBe(true);
    for (const status of [
      lastSearchStatus,
      lastMemoryStatus,
      lastSummaryStatus,
      lastEmbeddingStatus,
    ]) {
      expect(status).not.toBeNull();
      expect(isDrained(status)).toBe(true);
      expect((status as DerivedStatus | null)?.failedCount ?? 0).toBe(0);
    }
    completed = true;
  } catch (error) {
    const failurePath = path.join(
      process.cwd(),
      "tests",
      ".tmp",
      `e2e-writing-loop-fullprod-failure-${Date.now()}.json`,
    );
    fs.writeFileSync(
      failurePath,
      JSON.stringify(
        {
          testDbDir,
          lifecycle,
          pageClosed: page.isClosed(),
          windowCount: app.windows().length,
          error: error instanceof Error ? error.stack : String(error),
        },
        null,
        2,
      ),
      "utf8",
    );
    throw error;
  } finally {
    if (completed) {
      await closeApp(app, testDbDir);
    } else {
      await app.close().catch(() => undefined);
    }
  }
});
