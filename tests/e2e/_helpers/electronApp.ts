import {
  _electron as electron,
  type ElectronApplication,
  type Page,
} from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";

export type LaunchedApp = {
  app: ElectronApplication;
  page: Page;
  testDbDir: string;
};

export async function launchApp(
  options: {
    waitForRender?: boolean;
    waitForApi?: boolean;
    completeStartup?: boolean;
    testDbDir?: string;
    envOverrides?: Record<string, string>;
  } = {},
): Promise<LaunchedApp> {
  const {
    waitForRender = false,
    waitForApi = true,
    completeStartup = true,
    testDbDir: requestedTestDbDir,
    envOverrides = {},
  } = options;
  const testDbDir =
    requestedTestDbDir ??
    path.join(
      process.cwd(),
      "tests",
      ".tmp",
      `e2e-${process.pid}-${Date.now()}`,
    );
  fs.mkdirSync(testDbDir, { recursive: true });
  const testDbPath = path.join(testDbDir, "test.db");
  const databaseUrl = `file:${testDbPath}`;
  const testCacheDbPath = path.join(testDbDir, "test-cache.db");
  const cacheDatabaseUrl = `file:${testCacheDbPath}`;
  const userDataPath = path.join(testDbDir, "user-data");
  fs.mkdirSync(userDataPath, { recursive: true });

  const app = await electron.launch({
    args: [process.cwd(), `--user-data-dir=${userDataPath}`],
    env: {
      ...process.env,
      NODE_ENV: "production",
      E2E_DISABLE_SINGLE_INSTANCE: "1",
      LUIE_DISABLE_SYNC: "1",
      LUIE_USER_DATA_PATH: userDataPath,
      LUIE_RUNTIME_DATABASE_URL: databaseUrl,
      LUIE_RUNTIME_CACHE_DATABASE_URL: cacheDatabaseUrl,
      ...envOverrides,
    },
  });

  let page = await app.firstWindow();
  await page.waitForLoadState("domcontentloaded");
  await page.setViewportSize({ width: 1280, height: 720 });
  if (waitForApi) {
    await page.waitForFunction(
      () => typeof (window as Window & { api?: unknown }).api !== "undefined",
      undefined,
      { timeout: 10_000 },
    );
  }
  if (waitForApi && completeStartup) {
    const readiness = await page.evaluate(async () => {
      const api = (window as Window & { api?: Window["api"] }).api;
      if (!api) throw new Error("window.api missing");
      return await api.startup.getReadiness();
    });
    if (!readiness.success || !readiness.data) {
      throw new Error(
        readiness.error?.message ?? "Failed to read startup readiness",
      );
    }
    if (readiness.data.mustRunWizard) {
      const nextWindow = app.waitForEvent("window", { timeout: 30_000 });
      const completed = await page.evaluate(async () => {
        const api = (window as Window & { api?: Window["api"] }).api;
        if (!api) throw new Error("window.api missing");
        return await api.startup.completeWizard();
      });
      if (
        !completed.success ||
        !completed.data ||
        completed.data.mustRunWizard
      ) {
        throw new Error(
          completed.error?.message ??
            `Startup checks unresolved: ${completed.data?.reasons.join(", ") ?? "unknown"}`,
        );
      }
      page = await nextWindow;
      await page.waitForLoadState("domcontentloaded");
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.waitForFunction(
        () => typeof (window as Window & { api?: unknown }).api !== "undefined",
        undefined,
        { timeout: 10_000 },
      );
    }
  }
  if (waitForRender) {
    await page.waitForFunction(() => {
      const root = document.getElementById("root");
      return !!root && root.children.length > 0;
    });
  }

  return { app, page, testDbDir };
}

export async function closeApp(app: ElectronApplication, testDbDir: string) {
  try {
    await app.close();
  } finally {
    fs.rmSync(testDbDir, { recursive: true, force: true });
  }
}
