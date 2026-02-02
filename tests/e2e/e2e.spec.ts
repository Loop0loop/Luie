import { test, expect } from "@playwright/test";
import { launchApp, closeApp } from "./_helpers/electronApp";

test("creates project and chapter via IPC @e2e", async () => {
  const { app, page, testDbDir } = await launchApp();

  const result = await page.evaluate(async () => {
    const api = (window as typeof window & { api: any }).api;
    const suffix = Math.floor(Date.now() / 1000);
    const projectRes = await api.project.create({
      title: `E2E Project ${suffix}`,
      description: "e2e",
      projectPath: `/tmp/e2e-${suffix}.luie`,
    });

    if (!projectRes.success) {
      return { projectRes, chapterRes: null };
    }

    const projectId = projectRes.data.id as string;
    const chapterRes = await api.chapter.create({
      projectId,
      title: "Chapter 1",
    });

    return { projectRes, chapterRes };
  });

  if (!result.projectRes?.success) {
    throw new Error(`Project create failed: ${JSON.stringify(result.projectRes)}`);
  }
  if (!result.chapterRes?.success) {
    throw new Error(`Chapter create failed: ${JSON.stringify(result.chapterRes)}`);
  }

  await closeApp(app, testDbDir);
});
