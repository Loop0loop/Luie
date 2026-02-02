import { test, expect } from "@playwright/test";
import { launchApp, closeApp } from "./_helpers/electronApp";

test("template selector visual snapshot @visual", async () => {
  const { app, page, testDbDir } = await launchApp();

  await page.addStyleTag({
    content: "*,:before,:after{animation:none!important;transition:none!important}",
  });

  const selector = page.getByTestId("template-selector");
  await expect(selector).toBeVisible();

  expect(await selector.screenshot()).toMatchSnapshot("template-selector.png");

  await closeApp(app, testDbDir);
});
