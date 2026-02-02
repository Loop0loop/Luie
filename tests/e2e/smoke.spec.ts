import { test, expect } from "@playwright/test";
import { launchApp, closeApp } from "./_helpers/electronApp";

test("app boots to template selector @smoke", async () => {
  const { app, page, testDbDir } = await launchApp();

  await expect(page.getByTestId("template-selector")).toBeVisible();

  await closeApp(app, testDbDir);
});
