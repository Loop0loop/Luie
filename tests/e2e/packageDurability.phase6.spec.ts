import { expect, test } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";
import { closeApp, launchApp } from "./_helpers/electronApp";
import { readLuieContainerEntry } from "../../src/main/services/io/luieContainer";

const waitForFile = async (
  filePath: string,
  timeoutMs = 5_000,
): Promise<void> => {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (fs.existsSync(filePath)) return;
    // eslint-disable-next-line no-await-in-loop -- polling waits for a marker file created by the Electron main process.
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`Timed out waiting for file: ${filePath}`);
};

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

test("phase6 forced shutdown during package export keeps previous .luie intact @e2e", async () => {
  const { app, page, testDbDir } = await launchApp({ waitForRender: true });
  const projectPath = path.join(testDbDir, "phase6-forced-shutdown.luie");
  const markerPath = path.join(testDbDir, "export-before-replace.marker");

  try {
    const created = await page.evaluate(async (packagePath) => {
      const api = (window as Window & { api?: Window["api"] }).api;
      if (!api) {
        return { success: false, error: { message: "window.api missing" } };
      }
      const project = await api.project.create({
        title: "Phase 6 Forced Shutdown",
        description: "phase6 forced shutdown e2e",
      });
      if (!project.success || !project.data?.id) return project;
      const chapter = await api.chapter.create({
        projectId: project.data.id,
        title: "Original Chapter",
        content: "Original package content",
        order: 1,
      });
      if (!chapter.success) return chapter;
      return await api.project.materializeLuie(project.data.id, packagePath);
    }, projectPath);
    expect(created.success).toBe(true);

    const baselineMeta = await readLuieContainerEntry(projectPath, "meta.json");
    expect(baselineMeta).toContain("Original Chapter");
    expect(baselineMeta).not.toContain("Interrupted Chapter");

    const prepared = await page.evaluate(
      async () => {
        const api = (window as Window & { api?: Window["api"] }).api;
        if (!api) {
          return { success: false, error: { message: "window.api missing" } };
        }
        const projects = await api.project.getAll();
        const project = projects.data?.find(
          (item) => item.title === "Phase 6 Forced Shutdown",
        );
        if (!project) {
          return { success: false, error: { message: "project missing" } };
        }
        const chapter = await api.chapter.create({
          projectId: project.id,
          title: "Interrupted Chapter",
          content: "Interrupted package content",
          order: 2,
        });
        if (!chapter.success) return chapter;
        return { success: true, projectId: project.id };
      },
    );
    expect(prepared.success).toBe(true);

    await app.evaluate(async (_electronApp, marker) => {
      process.env.LUIE_E2E_PAUSE_PACKAGE_WRITE_BEFORE_REPLACE = marker;
    }, markerPath);
    await page.evaluate(
      async ({ projectId, packagePath: targetPath }) => {
        const api = (window as Window & { api?: Window["api"] }).api;
        if (!api) return;
        (
          window as Window & {
            __luieForcedShutdownExport?: Promise<unknown>;
          }
        ).__luieForcedShutdownExport = api.project
          .materializeLuie(projectId, targetPath)
          .catch(() => undefined);
      },
      { projectId: prepared.projectId, packagePath: projectPath },
    );

    await waitForFile(markerPath);
    const processRef = app.process();
    processRef.kill("SIGKILL");
    await new Promise<void>((resolve) => {
      processRef.once("exit", () => resolve());
      setTimeout(resolve, 5_000);
    });

    const metaAfterKill = await readLuieContainerEntry(projectPath, "meta.json");
    expect(metaAfterKill).toContain("Original Chapter");
    expect(metaAfterKill).not.toContain("Interrupted Chapter");
    const debris = fs
      .readdirSync(testDbDir)
      .filter(
        (entry) => entry.startsWith("phase6-forced-shutdown.luie.bak-"),
      );
    expect(debris).toEqual([]);
  } finally {
    await app.close().catch(() => undefined);
    fs.rmSync(testDbDir, { recursive: true, force: true });
  }
});
