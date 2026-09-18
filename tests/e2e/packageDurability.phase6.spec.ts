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
      page.getByText(
        /Unsaved changes were recovered|저장되지 않은 변경사항을 복구했습니다/,
      ),
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
    await app
      .evaluate(async ({ dialog }) => {
        const dialogRef = dialog as typeof dialog & {
          __luieOriginalShowOpenDialog?: typeof dialog.showOpenDialog;
        };
        if (dialogRef.__luieOriginalShowOpenDialog) {
          dialog.showOpenDialog = dialogRef.__luieOriginalShowOpenDialog;
          delete dialogRef.__luieOriginalShowOpenDialog;
        }
      })
      .catch(() => undefined);
    await closeApp(app, testDbDir);
  }
});

test("phase6 forced shutdown during package export keeps previous .luie intact @e2e", async () => {
  const { app, page, testDbDir } = await launchApp({ waitForRender: true });
  let restartedApp: Awaited<ReturnType<typeof launchApp>>["app"] | null = null;
  const projectPath = path.join(testDbDir, "phase6-forced-shutdown.luie");
  const baselineCopyPath = path.join(testDbDir, "phase6-baseline.luie");
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
      });
      if (!chapter.success) return chapter;
      const updated = await api.chapter.update({
        id: chapter.data.id,
        content: "Original package content",
      });
      if (!updated.success) return updated;
      const approval = await api.fs.approveProjectPath(packagePath);
      if (!approval.success) return approval;
      const materialized = await api.project.materializeLuie(
        project.data.id,
        packagePath,
      );
      return {
        ...materialized,
        projectId: project.data.id,
        originalChapterId: chapter.data?.id,
      };
    }, projectPath);
    expect(created.success, JSON.stringify(created.error)).toBe(true);
    expect(created.originalChapterId).toBeTruthy();

    const baselineMeta = await readLuieContainerEntry(projectPath, "meta.json");
    expect(baselineMeta).toContain("Original Chapter");
    expect(baselineMeta).not.toContain("Interrupted Chapter");
    expect(
      await readLuieContainerEntry(
        projectPath,
        `manuscript/${created.originalChapterId}.md`,
      ),
    ).toBe("Original package content");
    fs.copyFileSync(projectPath, baselineCopyPath);

    const prepared = await page.evaluate(async () => {
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
      });
      if (!chapter.success) return chapter;
      const updated = await api.chapter.update({
        id: chapter.data.id,
        content: "Interrupted package content",
      });
      if (!updated.success) return updated;
      return {
        success: true,
        projectId: project.id,
        interruptedChapterId: chapter.data?.id,
      };
    });
    expect(prepared.success).toBe(true);
    expect(prepared.interruptedChapterId).toBeTruthy();
    fs.copyFileSync(baselineCopyPath, projectPath);

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

    const metaAfterKill = await readLuieContainerEntry(
      projectPath,
      "meta.json",
    );
    expect(metaAfterKill).toContain("Original Chapter");
    expect(metaAfterKill).not.toContain("Interrupted Chapter");
    expect(
      await readLuieContainerEntry(
        projectPath,
        `manuscript/${created.originalChapterId}.md`,
      ),
    ).toBe("Original package content");
    expect(
      await readLuieContainerEntry(
        projectPath,
        `manuscript/${prepared.interruptedChapterId}.md`,
      ),
    ).toBeNull();
    const debris = fs
      .readdirSync(testDbDir)
      .filter((entry) => entry.startsWith("phase6-forced-shutdown.luie.bak-"));
    expect(debris).toEqual([]);

    const restarted = await launchApp({ waitForRender: true, testDbDir });
    restartedApp = restarted.app;
    const recovered = await restarted.page.evaluate(async () => {
      const api = (window as Window & { api?: Window["api"] }).api;
      if (!api) {
        return { success: false, error: { message: "window.api missing" } };
      }
      const projects = await api.project.getAll();
      const project = projects.data?.find(
        (item) => item.title === "Phase 6 Forced Shutdown",
      );
      if (!projects.success || !project) return projects;
      return await api.app.manualSave(project.id);
    });
    expect(recovered.success).toBe(true);
    const metaAfterRestart = await readLuieContainerEntry(
      projectPath,
      "meta.json",
    );
    expect(metaAfterRestart).toContain("Original Chapter");
    expect(metaAfterRestart).toContain("Interrupted Chapter");
    expect(
      await readLuieContainerEntry(
        projectPath,
        `manuscript/${created.originalChapterId}.md`,
      ),
    ).toBe("Original package content");
    expect(
      await readLuieContainerEntry(
        projectPath,
        `manuscript/${prepared.interruptedChapterId}.md`,
      ),
    ).toBe("Interrupted package content");
  } finally {
    await app.close().catch(() => undefined);
    await restartedApp?.close().catch(() => undefined);
    fs.rmSync(testDbDir, { recursive: true, force: true });
  }
});
