import { _electron as electron, type ElectronApplication, type Page } from "@playwright/test";
import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

export type LaunchedApp = {
  app: ElectronApplication;
  page: Page;
  testDbDir: string;
};

export async function launchApp(
  options: { waitForRender?: boolean; waitForApi?: boolean } = {},
): Promise<LaunchedApp> {
  const { waitForRender = false, waitForApi = true } = options;
  const testDbDir = path.join(
    process.cwd(),
    "tests",
    ".tmp",
    `e2e-${process.pid}-${Date.now()}`,
  );
  fs.mkdirSync(testDbDir, { recursive: true });
  const testDbPath = path.join(testDbDir, "test.db");
  const databaseUrl = `file:${testDbPath}`;

  execSync("pnpm prisma db push --accept-data-loss --force-reset", {
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
    },
  });

  const app = await electron.launch({
    args: [process.cwd()],
    env: {
      ...process.env,
      NODE_ENV: "production",
      E2E_DISABLE_SINGLE_INSTANCE: "1",
      DATABASE_URL: databaseUrl,
    },
  });

  const page = await app.firstWindow();
  await page.waitForLoadState("domcontentloaded");
  await page.setViewportSize({ width: 1280, height: 720 });
  if (waitForApi) {
    await page.waitForFunction(
      () => typeof (window as Window & { api?: unknown }).api !== "undefined",
      undefined,
      { timeout: 10_000 },
    );
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
  await app.close();
  fs.rmSync(testDbDir, { recursive: true, force: true });
}
