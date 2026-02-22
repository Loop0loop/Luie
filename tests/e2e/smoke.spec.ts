import { test, expect } from "@playwright/test";
import { launchApp, closeApp } from "./_helpers/electronApp";

test("app boots to template selector @smoke", async () => {
  const { app, page, testDbDir } = await launchApp({ waitForRender: false });

  const result = (await page.evaluate(async () => {
    const api = (window as Window & { api?: Window["api"] }).api;

    if (!api) {
      return { hasApi: false };
    }

    const [projects, settings, editor] = await Promise.all([
      api.project.getAll(),
      api.settings.getAll(),
      api.settings.getEditor(),
    ]);

    return { hasApi: true, projects, settings, editor };
  })) as {
    hasApi: boolean;
    projects?: { success?: boolean };
    settings?: { success?: boolean };
    editor?: { success?: boolean };
  };

  expect(result.hasApi).toBe(true);
  expect(result.projects?.success).toBe(true);
  expect(result.settings?.success).toBe(true);
  expect(result.editor?.success).toBe(true);

  await closeApp(app, testDbDir);
});
