import { expect, test } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";
import { closeApp, launchApp } from "./_helpers/electronApp";

test("phase6 corrupted .luie open shows recovery banner @e2e", async () => {
  const { app, page, testDbDir } = await launchApp({ waitForRender: true });
  const projectPath = path.join(testDbDir, "phase6-corrupt.luie");

  try {
    const created = await page.evaluate(async (packagePath) => {
      const api = (window as Window & { api?: Window["api"] }).api;
      if (!api) {
        return { success: false, error: { message: "window.api missing" } };
      }
      return await api.project.create({
        title: "Phase 6 Corrupt Recovery",
        description: "phase6 e2e",
        projectPath: packagePath,
      });
    }, projectPath);

    expect(created.success).toBe(true);
    fs.writeFileSync(projectPath, "not-a-sqlite-package", "utf8");

    await app.evaluate(async ({ dialog }, selectedPath) => {
      const dialogRef = dialog as typeof dialog & {
        __luieOriginalShowOpenDialog?: typeof dialog.showOpenDialog;
      };
      dialogRef.__luieOriginalShowOpenDialog ??= dialog.showOpenDialog;
      dialogRef.showOpenDialog = async () => ({
        canceled: false,
        filePaths: [selectedPath],
      });
    }, projectPath);

    await page.locator("button", { hasText: ".luie" }).first().click();

    await expect(
      page.getByText("Unsaved changes were recovered"),
    ).toBeVisible();
    await expect(
      page.getByText(/The original file was corrupted|파일이 손상/).first(),
    ).toBeVisible();

    const projects = await page.evaluate(async () => {
      const api = (window as Window & { api?: Window["api"] }).api;
      if (!api) {
        return { success: false, data: [] };
      }
      return await api.project.getAll();
    });
    expect(projects.success).toBe(true);
    const recoveredProject = projects.data?.find(
      (project) => project.title === "Phase 6 Corrupt Recovery",
    );
    expect(recoveredProject?.projectPath).toContain(".recovered-");
    expect(recoveredProject?.projectPath?.endsWith(".luie")).toBe(true);
  } finally {
    await app.evaluate(async ({ dialog }) => {
      const dialogRef = dialog as typeof dialog & {
        __luieOriginalShowOpenDialog?: typeof dialog.showOpenDialog;
      };
      if (dialogRef.__luieOriginalShowOpenDialog) {
        dialog.showOpenDialog = dialogRef.__luieOriginalShowOpenDialog;
        delete dialogRef.__luieOriginalShowOpenDialog;
      }
    }).catch(() => undefined);
    await closeApp(app, testDbDir);
  }
});
