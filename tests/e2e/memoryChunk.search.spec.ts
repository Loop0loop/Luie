import { expect, test } from "@playwright/test";
import { closeApp, launchApp } from "./_helpers/electronApp";

type ApiResponse<T> = { success?: boolean; data?: T; error?: unknown };

test("searches memory chunks and resolves backlink @stress", async () => {
  const { app, page, testDbDir } = await launchApp({
    envOverrides: {
      LUIE_E2E_STRESS_MODE: "1",
      LUIE_DISABLE_SYNC: "1",
      LUIE_DISABLE_STARTUP_MAINTENANCE: "1",
      LUIE_DISABLE_PACKAGE_EXPORT: "1",
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
          title: "Memory E2E",
          description: "memory chunk search",
          projectPath: `/tmp/memory-chunk-e2e-${Date.now()}.luie`,
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
          title: "Memory chapter",
        })) as ApiResponse<{ id: string }>;
      }, project.id),
    "chapter.create",
  );

  await call(
    async () =>
      await page.evaluate(async (input: { chapterId: string }) => {
        const api = (window as Window & { api?: Window["api"] }).api;
        if (!api) return { success: false, error: { message: "window.api missing" } };
        return (await api.chapter.update({
          id: input.chapterId,
          content: "첫 문단입니다.\n\n검은 패 키워드가 있는 문단입니다.\n\n마지막 문단입니다.",
        })) as ApiResponse<{ id: string }>;
      }, { chapterId: chapter.id }),
    "chapter.update",
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
    "memoryAdmin.rebuildChunks",
  );

  const chunks = await call(
    async () =>
      await page.evaluate(async (projectId: string) => {
        const api = (window as Window & { api?: Window["api"] }).api;
        if (!api) return { success: false, error: { message: "window.api missing" } };
        return (await api.memory.searchChunks({
          projectId,
          query: "검은 패",
          limit: 10,
        })) as ApiResponse<
          Array<{
            chunkId: string;
            chapterId: string | null;
            startOffset: number | null;
          }>
        >;
      }, project.id),
    "memory.searchChunks",
  );

  expect(chunks.length).toBeGreaterThan(0);
  expect(chunks[0].chapterId).toBe(chapter.id);

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
      }, chunks[0].chunkId),
    "memory.getChunkBacklink",
  );

  expect(backlink.chunkId).toBe(chunks[0].chunkId);
  expect(backlink.chapterId).toBe(chapter.id);
  expect(backlink.offset).toBeGreaterThanOrEqual(0);

  await closeApp(app, testDbDir);
});
