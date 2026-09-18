// TEST_LEVEL: REAL_DB_FS_INTEGRATION
// PROVES: content-only chapter 저장이 실제 .luie의 chapter entry와 meta만 갱신
// DOES_NOT_PROVE: process kill 또는 OS 전원 차단 시점의 DB/package 일치성

import crypto from "node:crypto";
import * as fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  chapter,
  chapterBody,
  chapterRevision,
  db,
  project,
  projectAttachment,
} from "../../../../../src/main/infra/database/index.js";
import { ChapterService } from "../../../../../src/main/services/features/manuscript/chapterService.js";
import { projectService } from "../../../../../src/main/services/features/project/projectService.js";
import { writeLuieContainer } from "../../../../../src/main/services/io/luieContainer.js";

const logger = {
  info: () => undefined,
  debug: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

const readPackageState = (packagePath: string) => {
  const database = new Database(packagePath, { readonly: true });
  const entries = database
    .prepare(
      `SELECT "path", "content" FROM "LuieContainerEntry" ORDER BY "path"`,
    )
    .all() as Array<{ path: string; content: string }>;
  const container = database
    .prepare(`SELECT "updatedAt" FROM "LuieContainerInfo" WHERE "id" = 1`)
    .get() as { updatedAt: string };
  database.close();
  return {
    entries: Object.fromEntries(entries.map((row) => [row.path, row.content])),
    containerUpdatedAt: container.updatedAt,
  };
};

describe("chapter content incremental package persistence", () => {
  let tempRoot = "";

  afterEach(async () => {
    vi.restoreAllMocks();
    if (!tempRoot) return;
    await fsp.rm(tempRoot, { recursive: true, force: true });
    tempRoot = "";
  });

  it("updates only the chapter entry and meta while structural updates keep full export", async () => {
    tempRoot = await fsp.mkdtemp(
      path.join(os.tmpdir(), "luie-chapter-incremental-"),
    );
    const packagePath = path.join(tempRoot, "project.luie");
    const projectId = crypto.randomUUID();
    const chapterId = crypto.randomUUID();
    const now = "2026-09-13T00:00:00.000Z";
    await writeLuieContainer({
      targetPath: packagePath,
      payload: {
        meta: {
          projectId,
          title: "Incremental Project",
          chapters: [
            {
              id: chapterId,
              title: "Chapter 1",
              order: 1,
              file: `manuscript/${chapterId}.md`,
            },
          ],
        },
        chapters: [{ id: chapterId, content: "old body" }],
        characters: [{ id: "character-1", name: "Keep Me" }],
        terms: [],
        synopsis: { synopsis: "unchanged synopsis", status: "draft" },
        plot: { columns: [] },
        drawing: { paths: [] },
        mindmap: { nodes: [], edges: [] },
        memos: { memos: [] },
        graph: { nodes: [], edges: [] },
        snapshots: [],
      },
      logger,
    });
    await db.getClient().insert(project).values({
      id: projectId,
      title: "Incremental Project",
      description: null,
      projectPath: null,
      createdAt: now,
      updatedAt: now,
    });
    await db.getClient().insert(projectAttachment).values({
      projectId,
      projectPath: packagePath,
      exportedRevision: 0,
      createdAt: now,
      updatedAt: now,
    });
    await db.getClient().insert(chapter).values({
      id: chapterId,
      projectId,
      title: "Chapter 1",
      content: "old body",
      order: 1,
      createdAt: now,
      updatedAt: now,
    });
    await db.getClient().insert(chapterBody).values({
      chapterId,
      content: "old body",
      contentHash: "old-hash",
      updatedAt: now,
    });

    const before = readPackageState(packagePath);
    await new Promise<void>((resolve) => setTimeout(resolve, 5));
    const scheduleSpy = vi
      .spyOn(projectService, "schedulePackageExport")
      .mockImplementation(() => undefined);
    const fullExportSpy = vi.spyOn(projectService, "exportProjectPackage");
    const chapterService = new ChapterService();

    await chapterService.updateChapter({ id: chapterId, content: "new body" });

    const afterContent = readPackageState(packagePath);
    const chapterEntryPath = `manuscript/${chapterId}.md`;
    expect(afterContent.entries[chapterEntryPath]).toBe("new body");
    expect(afterContent.containerUpdatedAt).not.toBe(before.containerUpdatedAt);
    const beforeMeta = JSON.parse(
      before.entries["meta.json"] ?? "{}",
    ) as Record<string, unknown>;
    const afterMeta = JSON.parse(
      afterContent.entries["meta.json"] ?? "{}",
    ) as Record<string, unknown>;
    expect(afterMeta.updatedAt).not.toBe(beforeMeta.updatedAt);
    delete beforeMeta.updatedAt;
    delete afterMeta.updatedAt;
    expect(afterMeta).toEqual(beforeMeta);
    for (const [entryPath, content] of Object.entries(before.entries)) {
      if (entryPath === chapterEntryPath || entryPath === "meta.json") continue;
      expect(afterContent.entries[entryPath]).toBe(content);
    }
    expect(scheduleSpy).not.toHaveBeenCalled();
    expect(fullExportSpy).not.toHaveBeenCalled();

    const stalePackage = new Database(packagePath);
    stalePackage
      .prepare(
        `UPDATE "LuieContainerEntry" SET "content" = 'stale package body' WHERE "path" = ?`,
      )
      .run(chapterEntryPath);
    stalePackage.close();
    const revisionCountBeforeRetry = (
      await db.getClient().select().from(chapterRevision)
    ).length;

    await chapterService.updateChapter({ id: chapterId, content: "new body" });

    expect(readPackageState(packagePath).entries[chapterEntryPath]).toBe(
      "new body",
    );
    expect(await db.getClient().select().from(chapterRevision)).toHaveLength(
      revisionCountBeforeRetry,
    );
    expect(scheduleSpy).not.toHaveBeenCalled();
    expect(fullExportSpy).not.toHaveBeenCalled();

    await chapterService.updateChapter({ id: chapterId, title: "Renamed" });

    expect(scheduleSpy).toHaveBeenCalledWith(
      projectId,
      "chapter:update:debounced",
    );
  });
});
