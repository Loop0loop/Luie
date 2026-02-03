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

test("full IPC workflow @e2e", async () => {
  const { app, page, testDbDir } = await launchApp();

  const result = await page.evaluate(async () => {
    const api = (window as typeof window & { api: any }).api;
    const suffix = Math.floor(Date.now() / 1000);

    const steps: Array<{ name: string; success: boolean; error?: unknown }> = [];
    const data: Record<string, unknown> = {};
    const ids: Record<string, string> = {};

    const record = (name: string, res: any) => {
      steps.push({ name, success: Boolean(res?.success), error: res?.error });
      return res;
    };

    const invalidProject = await api.project.create({ title: "" });
    data.invalidProject = invalidProject;

    const projectRes = record(
      "project.create",
      await api.project.create({
        title: `Workflow Project ${suffix}`,
        description: "workflow",
        projectPath: `/tmp/workflow-${suffix}.luie`,
      }),
    );

    if (!projectRes.success) {
      return { steps, data, ids };
    }

    const projectId = projectRes.data.id as string;
    ids.projectId = projectId;

    record("project.get", await api.project.get(projectId));
    const projectUpdate = record(
      "project.update",
      await api.project.update({
        id: projectId,
        title: `Workflow Updated ${suffix}`,
        description: "updated",
      }),
    );
    const projectAll = record("project.getAll", await api.project.getAll());

    const chapter1 = record(
      "chapter.create.1",
      await api.chapter.create({
        projectId,
        title: "Chapter 1",
        synopsis: "Intro",
      }),
    );
    const chapter2 = record(
      "chapter.create.2",
      await api.chapter.create({
        projectId,
        title: "Chapter 2",
      }),
    );

    if (!chapter1.success || !chapter2.success) {
      return { steps, data, ids };
    }

    const chapterAll = record(
      "chapter.getAll",
      await api.chapter.getAll(projectId),
    );

    record(
      "chapter.update",
      await api.chapter.update({
        id: chapter1.data.id,
        content: "Alice meets NeoTerm in chapter one.",
        synopsis: "Updated synopsis",
      }),
    );
    const chapterGet = record(
      "chapter.get",
      await api.chapter.get(chapter1.data.id),
    );

    record(
      "character.create",
      await api.character.create({
        projectId,
        name: "Alice",
        description: "Hero",
      }),
    );
    record(
      "term.create",
      await api.term.create({
        projectId,
        term: "NeoTerm",
        definition: "A concept",
        category: "concept",
      }),
    );

    const searchAll = record(
      "search.all",
      await api.search({ projectId, query: "Alice", type: "all" }),
    );
    const searchTerm = record(
      "search.term",
      await api.search({ projectId, query: "Neo", type: "term" }),
    );

    const snapshot = record(
      "snapshot.create",
      await api.snapshot.create({
        projectId,
        chapterId: chapter1.data.id,
        content: "Snapshot content",
        description: "First snapshot",
      }),
    );

    if (!snapshot.success) {
      return { steps, data, ids };
    }

    record(
      "chapter.update.afterSnapshot",
      await api.chapter.update({
        id: chapter1.data.id,
        content: "Changed content",
      }),
    );

    record("snapshot.restore", await api.snapshot.restore(snapshot.data.id));
    const chapterAfterRestore = record(
      "chapter.get.afterRestore",
      await api.chapter.get(chapter1.data.id),
    );

    const autoSave = record(
      "autoSave",
      await api.autoSave(chapter1.data.id, "AutoSave content", projectId),
    );

    const projectDelete = record(
      "project.delete",
      await api.project.delete(projectId),
    );

    data.projectUpdateTitle = projectUpdate.success
      ? projectUpdate.data.title
      : undefined;
    data.projectAllIds = projectAll.success
      ? projectAll.data.map((project: { id: string }) => project.id)
      : [];
    data.chapterCount = chapterAll.success ? chapterAll.data.length : 0;
    data.chapterOrders = chapterAll.success
      ? chapterAll.data.map((chapter: { order: number }) => chapter.order)
      : [];
    data.chapterWordCount = chapterGet.success ? chapterGet.data.wordCount : 0;
    data.searchAllTypes = searchAll.success
      ? searchAll.data.map((item: { type: string }) => item.type)
      : [];
    data.searchTermTypes = searchTerm.success
      ? searchTerm.data.map((item: { type: string }) => item.type)
      : [];
    data.snapshotRestoredContent = chapterAfterRestore.success
      ? chapterAfterRestore.data.content
      : undefined;
    data.autoSaveSuccess = autoSave.success;
    data.projectDeleteSuccess = projectDelete.success;

    return { steps, data, ids };
  });

  const failedStep = result.steps.find((step) => !step.success);
  if (failedStep) {
    throw new Error(
      `Workflow step failed: ${failedStep.name} ${JSON.stringify(failedStep.error)}`,
    );
  }

  const invalidProject = result.data.invalidProject as
    | { success: boolean; error?: { code?: string } }
    | undefined;
  expect(invalidProject?.success).toBe(false);
  expect(invalidProject?.error?.code).toBe("VAL_3002");

  expect(String(result.data.projectUpdateTitle)).toContain("Workflow Updated");
  expect(
    (result.data.projectAllIds as string[]).includes(result.ids.projectId),
  ).toBe(true);

  expect(result.data.chapterCount).toBe(2);
  expect((result.data.chapterOrders as number[])[0]).toBe(1);
  expect((result.data.chapterOrders as number[])[1]).toBe(2);
  expect(result.data.chapterWordCount as number).toBeGreaterThan(0);

  expect((result.data.searchAllTypes as string[]).includes("character")).toBe(
    true,
  );
  expect((result.data.searchAllTypes as string[]).includes("chapter")).toBe(true);
  expect((result.data.searchTermTypes as string[]).includes("term")).toBe(true);

  expect(result.data.snapshotRestoredContent).toBe("Snapshot content");
  expect(result.data.autoSaveSuccess).toBe(true);
  expect(result.data.projectDeleteSuccess).toBe(true);

  await closeApp(app, testDbDir);
});
