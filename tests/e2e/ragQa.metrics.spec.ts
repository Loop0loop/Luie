import { test } from "@playwright/test";
import { closeApp, launchApp } from "./_helpers/electronApp";

type ApiResponse<T> = { success?: boolean; data?: T; error?: { message?: string } };

type RagRunMetrics = {
  success: boolean;
  firstTokenMs: number | null;
  totalMs: number;
  evidenceCount: number;
  errorMessage: string | null;
};

const percentile = (values: number[], p: number): number => {
  if (values.length === 0) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * p) - 1));
  return sorted[idx];
};

test("rag qa metrics snapshot @stress", async () => {
  const runs = Number.parseInt(process.env.RAG_METRICS_RUNS ?? "20", 10);
  const providerHint = process.env.RAG_METRICS_PROVIDER_HINT ?? "none";

  const { app, page, testDbDir } = await launchApp({
    envOverrides: {
      LUIE_E2E_STRESS_MODE: "1",
      LUIE_DISABLE_SYNC: "1",
      LUIE_DISABLE_STARTUP_MAINTENANCE: "1",
      LUIE_DISABLE_PACKAGE_EXPORT: "1",
      LUIE_LLM_PROVIDER_HINT: providerHint,
    },
  });

  const call = async <T>(fn: () => Promise<ApiResponse<T>>, label: string): Promise<T> => {
    const response = await fn();
    if (!response.success) {
      throw new Error(`${label} failed: ${JSON.stringify(response.error)}`);
    }
    return response.data as T;
  };

  const project = await call(
    async () =>
      await page.evaluate(async () => {
        const api = (window as Window & { api?: Window["api"] }).api;
        if (!api) return { success: false, error: { message: "window.api missing" } };
        return (await api.project.create({
          title: "RAG Metrics",
          description: "rag metrics",
          projectPath: `/tmp/rag-metrics-${Date.now()}.luie`,
        })) as ApiResponse<{ id: string }>;
      }),
    "project.create",
  );

  const chapter = await call(
    async () =>
      await page.evaluate(async (projectId: string) => {
        const api = (window as Window & { api?: Window["api"] }).api;
        if (!api) return { success: false, error: { message: "window.api missing" } };
        return (await api.chapter.create({
          projectId,
          title: "RAG Metrics Chapter",
        })) as ApiResponse<{ id: string }>;
      }, project.id),
    "chapter.create",
  );

  await call(
    async () =>
      await page.evaluate(async (chapterId: string) => {
        const api = (window as Window & { api?: Window["api"] }).api;
        if (!api) return { success: false, error: { message: "window.api missing" } };
        return (await api.chapter.update({
          id: chapterId,
          content: [
            "유란은 8화에서 황궁 정보를 모른다고 말했다.",
            "12화에서는 검은 패의 출처를 설명했다.",
            "이 설정이 일관되는지 점검해야 한다.",
          ].join("\n\n"),
        })) as ApiResponse<{ id: string }>;
      }, chapter.id),
    "chapter.update",
  );

  await call(
    async () =>
      await page.evaluate(async (projectId: string) => {
        const api = (window as Window & { api?: Window["api"] }).api;
        if (!api) return { success: false, error: { message: "window.api missing" } };
        return (await api.memoryAdmin.rebuildChunks({ projectId })) as ApiResponse<{ queued: number }>;
      }, project.id),
    "memory.rebuildChunks",
  );

  const memoryWaitStart = Date.now();
  while (Date.now() - memoryWaitStart < 15_000) {
    const status = await call(
      async () =>
        await page.evaluate(async (projectId: string) => {
          const api = (window as Window & { api?: Window["api"] }).api;
          if (!api) return { success: false, error: { message: "window.api missing" } };
          return (await api.memoryAdmin.getJobStatus(projectId)) as ApiResponse<{
            pendingCount: number;
            runningCount: number;
          }>;
        }, project.id),
      "memoryAdmin.getJobStatus",
    );
    if ((status.pendingCount ?? 0) === 0 && (status.runningCount ?? 0) === 0) break;
    await page.waitForTimeout(200);
  }

  const getMainRssBytes = async (): Promise<number> => {
    return await app.evaluate(async ({ app: electronApp }) => {
      if (typeof process.memoryUsage === "function") {
        return process.memoryUsage().rss;
      }
      const info = await electronApp.getAppMetrics();
      const main = info.find((item) => item.type === "Browser");
      return (main?.memory?.workingSetSize ?? 0) * 1024;
    });
  };

  const rssSamples: number[] = [];
  rssSamples.push(await getMainRssBytes());

  const runMetrics: RagRunMetrics[] = [];
  for (let i = 0; i < runs; i += 1) {
    const metric = await page.evaluate(
      async (input: { projectId: string; chapterId: string }) => {
        const api = (window as Window & { api?: Window["api"] }).api;
        if (!api) {
          return {
            success: false,
            firstTokenMs: null,
            totalMs: 0,
            evidenceCount: 0,
            errorMessage: "window.api missing",
          } as RagRunMetrics;
        }

        const startedAt = performance.now();
        return await new Promise<RagRunMetrics>((resolve) => {
          let runId: string | null = null;
          let firstTokenMs: number | null = null;
          let answer = "";

          const offStream = api.rag.onStream((payload) => {
            if (!runId || payload.runId !== runId) return;
            if (payload.delta && firstTokenMs === null) {
              firstTokenMs = performance.now() - startedAt;
            }
            if (payload.delta) answer += payload.delta;
            if (payload.done) {
              offStream();
              offError();
              resolve({
                success: true,
                firstTokenMs,
                totalMs: performance.now() - startedAt,
                evidenceCount: payload.result?.evidence?.length ?? 0,
                errorMessage: null,
              });
            }
          });

          const offError = api.rag.onError((payload) => {
            if (runId && payload.runId && payload.runId !== runId) return;
            offStream();
            offError();
            resolve({
              success: false,
              firstTokenMs,
              totalMs: performance.now() - startedAt,
              evidenceCount: 0,
              errorMessage: payload.message ?? "rag failed",
            });
          });

          void api.rag.ask({
            projectId: input.projectId,
            chapterId: input.chapterId,
            question: "유란이 황궁 정보를 아는 게 모순이야?",
          }).then((resp) => {
            if (!resp.success || !resp.data?.runId) {
              offStream();
              offError();
              resolve({
                success: false,
                firstTokenMs: null,
                totalMs: performance.now() - startedAt,
                evidenceCount: 0,
                errorMessage: resp.error?.message ?? "ask failed",
              });
              return;
            }
            runId = resp.data.runId;
          });
        });
      },
      { projectId: project.id, chapterId: chapter.id },
    );
    runMetrics.push(metric);
    rssSamples.push(await getMainRssBytes());
  }

  const successRuns = runMetrics.filter((item) => item.success);
  const failedRuns = runMetrics.filter((item) => !item.success);
  const firstTokenSeries = successRuns
    .map((item) => item.firstTokenMs)
    .filter((value): value is number => Number.isFinite(value));
  const evidenceZeroCount = successRuns.filter((item) => item.evidenceCount === 0).length;
  const maxRssBytes = rssSamples.reduce((max, value) => Math.max(max, value), 0);

  const report = {
    environment: "packaged-like",
    providerHint,
    runs,
    successCount: successRuns.length,
    failureCount: failedRuns.length,
    failureRate: runs > 0 ? failedRuns.length / runs : 0,
    firstTokenMs: {
      p50: percentile(firstTokenSeries, 0.5),
      p95: percentile(firstTokenSeries, 0.95),
      max: firstTokenSeries.length > 0 ? Math.max(...firstTokenSeries) : NaN,
    },
    evidenceZeroCount,
    maxMainRssBytes: maxRssBytes,
    maxMainRssMiB: Number((maxRssBytes / (1024 * 1024)).toFixed(2)),
    failures: failedRuns.slice(0, 5).map((item) => item.errorMessage),
  };

  // eslint-disable-next-line no-console
  console.log(`[RAG_METRICS] ${JSON.stringify(report)}`);

  await closeApp(app, testDbDir);
});
