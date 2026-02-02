import { test, expect } from "@playwright/test";
import { launchApp, closeApp } from "./_helpers/electronApp";

test("creates 200 chapters via IPC @stress", async () => {
  const { app, page, testDbDir } = await launchApp();

  const { success, chapterCount, durationMs } = await page.evaluate(async () => {
    const api = (window as typeof window & { api: any }).api;
    const suffix = Math.floor(Date.now() / 1000);

    const projectRes = await api.project.create({
      title: `Stress Project ${suffix}`,
      description: "stress",
      projectPath: `/tmp/stress-${suffix}.luie`,
    });

    if (!projectRes.success) {
      return { success: false, chapterCount: 0, durationMs: 0 };
    }

    const projectId = projectRes.data.id as string;

    const start = performance.now();
    for (let i = 0; i < 200; i += 1) {
      const res = await api.chapter.create({
        projectId,
        title: `Chapter ${i + 1}`,
      });
      if (!res.success) {
        return { success: false, chapterCount: i, durationMs: 0 };
      }
    }

    const chaptersRes = await api.chapter.getAll(projectId);
    const end = performance.now();

    return {
      success: chaptersRes.success,
      chapterCount: chaptersRes.success ? chaptersRes.data.length : 0,
      durationMs: Math.round(end - start),
    };
  });

  expect(success).toBe(true);
  expect(chapterCount).toBe(200);

  test.info().annotations.push({
    type: "stress",
    description: `create 200 chapters: ${durationMs}ms`,
  });

  await closeApp(app, testDbDir);
}, 120_000);
