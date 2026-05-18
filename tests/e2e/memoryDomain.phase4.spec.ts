import { expect, test } from "@playwright/test";
import { closeApp, launchApp } from "./_helpers/electronApp";

type ApiResponse<T> = { success?: boolean; data?: T; error?: unknown };

test("phase4 domain CRUD -> rebuild -> memory search/backlink @stress", async () => {
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
          title: "Phase4 Memory",
          description: "domain memory phase4",
          projectPath: `/tmp/phase4-memory-${Date.now()}.luie`,
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
          title: "Phase4 chapter",
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
          content: "기본 원고 본문입니다.",
        })) as ApiResponse<{ id: string }>;
      }, chapter.id),
    "chapter.update",
  );

  const createdDomain = await call(
    async () =>
      await page.evaluate(async (input: { projectId: string; chapterId: string }) => {
        const api = (window as Window & { api?: Window["api"] }).api;
        if (!api) return { success: false, error: { message: "window.api missing" } };

        const scene = await api.scene.create({
          projectId: input.projectId,
          chapterId: input.chapterId,
          title: "Scene 1",
          body: "phase4-scene-token 이 포함된 장면 본문",
          order: 1,
        });
        if (!scene.success) return scene;

        const note = await api.note.create({
          projectId: input.projectId,
          chapterId: input.chapterId,
          title: "Note 1",
          body: "phase4-note-token 이 포함된 노트 본문",
        });
        if (!note.success) return note;

        const synopsis = await api.synopsis.create({
          projectId: input.projectId,
          chapterId: input.chapterId,
          title: "Synopsis 1",
          body: "phase4-synopsis-token 이 포함된 시놉시스",
        });
        if (!synopsis.success) return synopsis;

        const plot = await api.plot.create({
          projectId: input.projectId,
          title: "Plot 1",
          body: "phase4-plot-token 이 포함된 플롯",
        });
        if (!plot.success) return plot;

        const scrap = await api.scrapMemo.create({
          projectId: input.projectId,
          title: "Scrap 1",
          content: "phase4-scrap-token 이 포함된 스크랩",
          tags: ["phase4"],
        });
        if (!scrap.success) return scrap;

        return {
          success: true,
          data: {
            sceneId: scene.data?.id,
            noteId: note.data?.id,
            synopsisId: synopsis.data?.id,
            plotId: plot.data?.id,
            scrapId: scrap.data?.id,
          },
        };
      }, { projectId: project.id, chapterId: chapter.id }),
    "domain.create",
  );

  await call(
    async () =>
      await page.evaluate(async (input: { noteId: string }) => {
        const api = (window as Window & { api?: Window["api"] }).api;
        if (!api) return { success: false, error: { message: "window.api missing" } };
        return (await api.note.update({
          id: input.noteId,
          body: "phase4-note-updated-token 으로 갱신된 노트 본문",
        })) as ApiResponse<{ id: string }>;
      }, { noteId: String(createdDomain.noteId) }),
    "note.update",
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

  const waitStart = Date.now();
  let drained = false;
  while (Date.now() - waitStart < 20_000) {
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
      "memory.getJobStatus",
    );
    if ((status.pendingCount ?? 0) === 0 && (status.runningCount ?? 0) === 0) {
      drained = true;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  expect(drained).toBe(true);

  const queryAndBacklink = async (query: string) => {
    const rows = await call(
      async () =>
        await page.evaluate(async (input: { projectId: string; query: string }) => {
          const api = (window as Window & { api?: Window["api"] }).api;
          if (!api) return { success: false, error: { message: "window.api missing" } };
          return (await api.memory.searchChunks({
            projectId: input.projectId,
            query: input.query,
            limit: 5,
          })) as ApiResponse<Array<{ chunkId: string; chapterId: string | null }>>;
        }, { projectId: project.id, query }),
      `memory.searchChunks(${query})`,
    );

    expect(rows.length).toBeGreaterThan(0);
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
        }, rows[0].chunkId),
      `memory.getChunkBacklink(${query})`,
    );

    expect(backlink.chunkId).toBe(rows[0].chunkId);
    expect(backlink.offset).toBeGreaterThanOrEqual(0);
  };

  await queryAndBacklink("phase4-scene-token");
  await queryAndBacklink("phase4-note-updated-token");
  await queryAndBacklink("phase4-synopsis-token");
  await queryAndBacklink("phase4-plot-token");
  await queryAndBacklink("phase4-scrap-token");

  await closeApp(app, testDbDir);
});
