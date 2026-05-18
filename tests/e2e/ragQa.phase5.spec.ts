import { expect, test } from "@playwright/test";
import { closeApp, launchApp } from "./_helpers/electronApp";

type ApiResponse<T> = { success?: boolean; data?: T; error?: { message?: string } };

test("phase5 rag qa ask -> done -> evidence @stress", async () => {
  const { app, page, testDbDir } = await launchApp({
    envOverrides: {
      LUIE_E2E_STRESS_MODE: "1",
      LUIE_DISABLE_SYNC: "1",
      LUIE_DISABLE_STARTUP_MAINTENANCE: "1",
      LUIE_DISABLE_PACKAGE_EXPORT: "1",
      LUIE_LLM_PROVIDER_HINT: "none",
    },
  });

  const call = async <T>(fn: () => Promise<ApiResponse<T>>, label: string) => {
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
          title: "Phase5 RAG",
          description: "rag phase5",
          projectPath: `/tmp/phase5-rag-${Date.now()}.luie`,
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
          title: "유란의 비밀",
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
            "유란은 8화에서 황궁 정보를 모른다고 말했지만, 12화에서 검은 패 출처를 설명했다.",
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

  // rebuildChunks는 큐 적재만 수행하므로 실제 처리 완료까지 대기한다.
  const waitStart = Date.now();
  while (Date.now() - waitStart < 15_000) {
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
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  await call(
    async () =>
      await page.evaluate(async (projectId: string) => {
        const api = (window as Window & { api?: Window["api"] }).api;
        if (!api) return { success: false, error: { message: "window.api missing" } };
        return (await api.searchAdmin.rebuildIndex(projectId)) as ApiResponse<{ success: boolean }>;
      }, project.id),
    "searchAdmin.rebuildIndex",
  );

  const searchWaitStart = Date.now();
  while (Date.now() - searchWaitStart < 15_000) {
    const status = await call(
      async () =>
        await page.evaluate(async (projectId: string) => {
          const api = (window as Window & { api?: Window["api"] }).api;
          if (!api) return { success: false, error: { message: "window.api missing" } };
          return (await api.searchAdmin.getIndexStatus(projectId)) as ApiResponse<{
            pendingCount: number;
            runningCount: number;
          }>;
        }, project.id),
      "searchAdmin.getIndexStatus",
    );
    if ((status.pendingCount ?? 0) === 0 && (status.runningCount ?? 0) === 0) break;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

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

          const offStream = api.rag.onStream((payload) => {
            if (!activeRunId) return;
            if (payload.runId !== activeRunId) return;
            if (payload.delta) answerBuffer += payload.delta;
            if (payload.done) {
              offStream();
              offError();
              resolve({
                success: true,
                data: {
                  runId: activeRunId,
                  answer: payload.result?.answer ?? answerBuffer,
                  evidenceCount: payload.result?.evidence?.length ?? 0,
                  firstEvidenceChunkId:
                    payload.result?.evidence?.[0]?.chunkId ?? null,
                },
              });
            }
          });

          const offError = api.rag.onError((payload) => {
            if (activeRunId && payload.runId && payload.runId !== activeRunId) return;
            offStream();
            offError();
            resolve({
              success: false,
              error: { message: payload.message ?? "rag failed" },
            });
          });

          void api.rag
            .ask({
              projectId: input.projectId,
              chapterId: input.chapterId,
              question: "유란이 황궁 정보를 아는 게 모순이야?",
            })
            .then((resp) => {
              if (!resp.success || !resp.data?.runId) {
                offStream();
                offError();
                resolve({
                  success: false,
                  error: { message: resp.error?.message ?? "ask failed" },
                });
                return;
              }
              activeRunId = resp.data.runId;
            });
        });
      }, { projectId: project.id, chapterId: chapter.id }),
    "rag.ask",
  );

  expect(streamResult.runId.length).toBeGreaterThan(0);
  expect(streamResult.answer.length).toBeGreaterThan(0);
  expect(streamResult.evidenceCount).toBeGreaterThan(0);
  expect(streamResult.firstEvidenceChunkId).not.toBeNull();

  const backlink = await call(
    async () =>
      await page.evaluate(async (chunkId: string) => {
        const api = (window as Window & { api?: Window["api"] }).api;
        if (!api) return { success: false, error: { message: "window.api missing" } };
        return (await api.memory.getChunkBacklink(chunkId)) as ApiResponse<{
          chunkId: string;
          chapterId: string | null;
          offset: number;
        }>;
      }, String(streamResult.firstEvidenceChunkId)),
    "memory.getChunkBacklink",
  );

  expect(backlink.chapterId).toBe(chapter.id);
  expect(backlink.offset).toBeGreaterThanOrEqual(0);

  await closeApp(app, testDbDir);
});
