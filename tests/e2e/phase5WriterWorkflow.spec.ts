import { expect, test, type Page } from "@playwright/test";
import { closeApp, launchApp } from "./_helpers/electronApp";

type ApiResponse<T> = { success?: boolean; data?: T; error?: { message?: string } };

async function call<T>(fn: () => Promise<ApiResponse<T>>, label: string): Promise<T> {
  const response = await fn();
  if (!response.success) {
    throw new Error(`${label} failed: ${JSON.stringify(response.error)}`);
  }
  return response.data as T;
}

async function waitForMemoryJobs(page: Page, projectId: string) {
  await expect
    .poll(
      async () =>
        await call(
          async () =>
            await page.evaluate(async (inputProjectId: string) => {
              const api = (window as Window & { api?: Window["api"] }).api;
              if (!api) return { success: false, error: { message: "window.api missing" } };
              return (await api.memoryAdmin.getJobStatus(inputProjectId)) as ApiResponse<{
                pendingCount: number;
                runningCount: number;
              }>;
            }, projectId),
          "memoryAdmin.getJobStatus",
        ).then((status) => (status.pendingCount ?? 0) + (status.runningCount ?? 0)),
      { intervals: [200], timeout: 15_000 },
    )
    .toBe(0);
}

async function waitForSearchJobs(page: Page, projectId: string) {
  await expect
    .poll(
      async () =>
        await call(
          async () =>
            await page.evaluate(async (inputProjectId: string) => {
              const api = (window as Window & { api?: Window["api"] }).api;
              if (!api) return { success: false, error: { message: "window.api missing" } };
              return (await api.searchAdmin.getIndexStatus(inputProjectId)) as ApiResponse<{
                pendingCount: number;
                runningCount: number;
              }>;
            }, projectId),
          "searchAdmin.getIndexStatus",
        ).then((status) => (status.pendingCount ?? 0) + (status.runningCount ?? 0)),
      { intervals: [200], timeout: 15_000 },
    )
    .toBe(0);
}

test("phase5 writer edit -> rebuild -> rag evidence stays on current manuscript @stress", async () => {
  const { app, page, testDbDir } = await launchApp({
    envOverrides: {
      LUIE_E2E_STRESS_MODE: "1",
      LUIE_DISABLE_SYNC: "1",
      LUIE_DISABLE_STARTUP_MAINTENANCE: "1",
      LUIE_DISABLE_PACKAGE_EXPORT: "1",
      LUIE_LLM_PROVIDER_HINT: "none",
    },
  });

  try {
    const project = await call(
      async () =>
        await page.evaluate(async () => {
          const api = (window as Window & { api?: Window["api"] }).api;
          if (!api) return { success: false, error: { message: "window.api missing" } };
          return (await api.project.create({
            title: "Phase5 Writer Workflow",
            description: "phase5 writer long workflow",
            projectPath: `/tmp/phase5-writer-${Date.now()}.luie`,
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
            title: "18화 봉인된 약",
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
            content:
              "18화 초안. 유란은 봉인된 약을 푸른 병에 숨겼다. 작가는 이 설정을 나중에 고칠 예정이다.",
          })) as ApiResponse<{ id: string }>;
        }, chapter.id),
      "chapter.update.initial",
    );

    await call(
      async () =>
        await page.evaluate(async (projectId: string) => {
          const api = (window as Window & { api?: Window["api"] }).api;
          if (!api) return { success: false, error: { message: "window.api missing" } };
          return (await api.memoryAdmin.rebuildChunks({ projectId })) as ApiResponse<{
            queued: number;
            processed: number;
          }>;
        }, project.id),
      "memoryAdmin.rebuildChunks.initial",
    );
    await waitForMemoryJobs(page, project.id);

    await call(
      async () =>
        await page.evaluate(async (chapterId: string) => {
          const api = (window as Window & { api?: Window["api"] }).api;
          if (!api) return { success: false, error: { message: "window.api missing" } };
          return (await api.chapter.update({
            id: chapterId,
            content:
              "18화 확정본. 유란은 봉인된 약을 붉은 인장 상자에 숨겼다. 푸른 병 설정은 폐기했다.",
          })) as ApiResponse<{ id: string }>;
        }, chapter.id),
      "chapter.update.rewrite",
    );

    const rebuildResult = await call(
      async () =>
        await page.evaluate(async (projectId: string) => {
          const api = (window as Window & { api?: Window["api"] }).api;
          if (!api) return { success: false, error: { message: "window.api missing" } };
          return (await api.memoryAdmin.rebuildChunks({ projectId })) as ApiResponse<{
            queued: number;
            processed: number;
          }>;
        }, project.id),
      "memoryAdmin.rebuildChunks.rewrite",
    );
    expect((rebuildResult.queued ?? 0) + (rebuildResult.processed ?? 0)).toBeGreaterThan(0);
    await waitForMemoryJobs(page, project.id);

    await call(
      async () =>
        await page.evaluate(async (projectId: string) => {
          const api = (window as Window & { api?: Window["api"] }).api;
          if (!api) return { success: false, error: { message: "window.api missing" } };
          return (await api.searchAdmin.rebuildIndex(projectId)) as ApiResponse<{ success: boolean }>;
        }, project.id),
      "searchAdmin.rebuildIndex",
    );
    await waitForSearchJobs(page, project.id);

    const chunks = await call(
      async () =>
        await page.evaluate(async (projectId: string) => {
          const api = (window as Window & { api?: Window["api"] }).api;
          if (!api) return { success: false, error: { message: "window.api missing" } };
          return (await api.memory.searchChunks({
            projectId,
            query: "붉은 인장 상자",
            limit: 5,
          })) as ApiResponse<
            Array<{
              chunkId: string;
              chapterId: string | null;
              content: string;
              startOffset: number | null;
            }>
          >;
        }, project.id),
      "memory.searchChunks.updated",
    );

    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0].chapterId).toBe(chapter.id);
    expect(chunks[0].content).toContain("붉은 인장 상자");

    const streamResult = await call(
      async () =>
        await page.evaluate(async (input: { projectId: string; chapterId: string }) => {
          const api = (window as Window & { api?: Window["api"] }).api;
          if (!api) return { success: false, error: { message: "window.api missing" } };

          return await new Promise<ApiResponse<{
            runId: string;
            answer: string;
            evidenceCount: number;
            firstEvidenceChunkId: string | null;
          }>>((resolve) => {
            let activeRunId: string | null = null;
            let answerBuffer = "";
            let settled = false;

            const settle = (value: ApiResponse<{
              runId: string;
              answer: string;
              evidenceCount: number;
              firstEvidenceChunkId: string | null;
            }>) => {
              if (settled) return;
              settled = true;
              clearTimeout(timeoutId);
              resolve(value);
            };

            const offStream = api.rag.onStream((payload) => {
              if (!activeRunId) return;
              if (payload.runId !== activeRunId) return;
              if (payload.delta) answerBuffer += payload.delta;
              if (payload.done) {
                offStream();
                offError();
                settle({
                  success: true,
                  data: {
                    runId: activeRunId,
                    answer: payload.result?.answer ?? answerBuffer,
                    evidenceCount: payload.result?.evidence?.length ?? 0,
                    firstEvidenceChunkId: payload.result?.evidence?.[0]?.chunkId ?? null,
                  },
                });
              }
            });

            const offError = api.rag.onError((payload) => {
              if (activeRunId && payload.runId && payload.runId !== activeRunId) return;
              offStream();
              offError();
              settle({
                success: false,
                error: { message: payload.message ?? "rag failed" },
              });
            });

            const timeoutId = setTimeout(() => {
              if (activeRunId) {
                void api.rag.stop(activeRunId);
              }
              offStream();
              offError();
              settle({
                success: false,
                error: { message: "rag stream timeout (20s)" },
              });
            }, 20_000);

            void api.rag
              .ask({
                projectId: input.projectId,
                chapterId: input.chapterId,
                question: "유란은 봉인된 약을 어디에 숨겼어?",
              })
              .then((resp) => {
                if (!resp.success || !resp.data?.runId) {
                  offStream();
                  offError();
                  settle({
                    success: false,
                    error: { message: resp.error?.message ?? "ask failed" },
                  });
                  return;
                }
                activeRunId = resp.data.runId;
              });
          });
        }, { projectId: project.id, chapterId: chapter.id }),
      "rag.ask.updated",
    );

    expect(streamResult.runId.length).toBeGreaterThan(0);
    expect(streamResult.answer.length).toBeGreaterThan(0);
    expect(streamResult.evidenceCount).toBeGreaterThan(0);
    expect(streamResult.firstEvidenceChunkId).not.toBeNull();
    expect(chunks.map((chunk) => chunk.chunkId)).toContain(streamResult.firstEvidenceChunkId);
  } finally {
    await closeApp(app, testDbDir);
  }
});
