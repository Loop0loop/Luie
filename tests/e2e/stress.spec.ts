import { test, expect } from "@playwright/test";
import { launchApp, closeApp } from "./_helpers/electronApp";

test("creates 200 chapters via IPC @stress", async () => {
  test.setTimeout(120_000);
  const { app, page, testDbDir } = await launchApp();

  const { success, chapterCount, durationMs, error } = await page.evaluate(async () => {
    const api = (window as unknown as { api?: Record<string, unknown> }).api as
      | {
          project: { create: (input: unknown) => Promise<unknown> };
          chapter: {
            create: (input: unknown) => Promise<unknown>;
            getAll: (projectId: string) => Promise<unknown>;
          };
        }
      | undefined;

    if (!api) {
      return {
        success: false,
        chapterCount: 0,
        durationMs: 0,
        error: { message: "window.api missing" },
      };
    }
    const suffix = Math.floor(Date.now() / 1000);

    const projectRes = (await api.project.create({
      title: `Stress Project ${suffix}`,
      description: "stress",
      projectPath: `/tmp/stress-${suffix}.luie`,
    })) as { success?: boolean; data?: { id: string }; error?: unknown };

    if (!projectRes.success) {
      return {
        success: false,
        chapterCount: 0,
        durationMs: 0,
        error: projectRes.error ?? { message: "project.create failed" },
      };
    }

    const projectId = projectRes.data?.id;
    if (!projectId) {
      return {
        success: false,
        chapterCount: 0,
        durationMs: 0,
        error: { message: "project id missing" },
      };
    }

    const start = performance.now();
    for (let i = 0; i < 200; i += 1) {
      const res = (await api.chapter.create({
        projectId,
        title: `Chapter ${i + 1}`,
      })) as { success?: boolean; error?: unknown };
      if (!res.success) {
        return {
          success: false,
          chapterCount: i,
          durationMs: 0,
          error: res.error ?? { message: `chapter.create failed at ${i + 1}` },
        };
      }
    }

    const chaptersRes = (await api.chapter.getAll(projectId)) as {
      success?: boolean;
      data?: Array<unknown>;
      error?: unknown;
    };
    const end = performance.now();

    return {
      success: chaptersRes.success,
      chapterCount: chaptersRes.success ? (chaptersRes.data?.length ?? 0) : 0,
      durationMs: Math.round(end - start),
      error: chaptersRes.success ? undefined : chaptersRes.error,
    };
  });

  if (!success) {
    throw new Error(`Stress test failed: ${JSON.stringify(error)}`);
  }
  expect(success).toBe(true);
  expect(chapterCount).toBe(200);

  test.info().annotations.push({
    type: "stress",
    description: `create 200 chapters: ${durationMs}ms`,
  });

  await closeApp(app, testDbDir);
});
