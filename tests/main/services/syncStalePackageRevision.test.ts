// TEST_LEVEL: REAL_DB_FS_INTEGRATION
// PROVES: stale sync bundle cannot overwrite a newer DB/package body and mark it current

import crypto from "node:crypto";
import * as fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import {
  chapter,
  chapterBody,
  character,
  db,
  project,
  projectAttachment,
} from "../../../src/main/infra/database/index.js";
import {
  getProjectRevisionState,
  listProjectsNeedingExport,
  markProjectExported,
} from "../../../src/main/services/core/project/projectRevisionStore.js";
import { applyMergedBundleToLocalFirstLuie } from "../../../src/main/services/features/sync/syncBundleApplier.js";
import { createEmptySyncBundle } from "../../../src/main/services/features/sync/syncMapper.js";
import { buildProjectPackagePayload } from "../../../src/main/services/features/sync/syncPackagePersistence.js";
import {
  readLuieContainerEntry,
  writeLuieContainer,
} from "../../../src/main/services/io/luieContainer.js";

const logger = {
  info: () => undefined,
  debug: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

describe("sync stale package revision", () => {
  let tempRoot = "";

  afterEach(async () => {
    if (tempRoot) await fsp.rm(tempRoot, { recursive: true, force: true });
    tempRoot = "";
  });

  it("keeps local body B and rejects a stale same-chapter delta", async () => {
    tempRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "luie-sync-stale-"));
    const projectPath = path.join(tempRoot, "project.luie");
    const projectId = crypto.randomUUID();
    const chapterId = crypto.randomUUID();
    const now = "2026-09-13T00:00:00.000Z";
    await db.getClient().insert(project).values({
      id: projectId,
      title: "Sync Race",
      createdAt: now,
      updatedAt: now,
    });
    await db.getClient().insert(projectAttachment).values({
      projectId,
      projectPath,
      exportedRevision: 0,
      createdAt: now,
      updatedAt: now,
    });
    await db.getClient().insert(chapter).values({
      id: chapterId,
      projectId,
      title: "Chapter",
      content: "A",
      order: 0,
      createdAt: now,
      updatedAt: now,
    });
    await db.getClient().insert(chapterBody).values({
      chapterId,
      content: "B",
      contentHash: "body-b-hash",
      updatedAt: "2026-09-13T00:01:00.000Z",
    });
    await writeLuieContainer({
      targetPath: projectPath,
      payload: {
        meta: {
          projectId,
          title: "Sync Race",
          chapters: [
            {
              id: chapterId,
              title: "Chapter",
              order: 0,
              file: `manuscript/${chapterId}.md`,
            },
          ],
        },
        chapters: [{ id: chapterId, content: "B" }],
        characters: [],
        terms: [],
        synopsis: { synopsis: "", status: "draft" },
        plot: { columns: [] },
        drawing: { paths: [] },
        mindmap: { nodes: [], edges: [] },
        memos: { memos: [] },
        graph: { nodes: [], edges: [] },
        snapshots: [],
      },
      logger,
    });
    const beforeSync = await getProjectRevisionState(projectId);
    await markProjectExported(projectId, beforeSync.revision);

    const staleMerged = createEmptySyncBundle();
    staleMerged.projects.push({
      id: projectId,
      userId: "user-1",
      title: "Sync Race",
      description: null,
      createdAt: now,
      updatedAt: now,
    });
    staleMerged.chapters.push({
      id: chapterId,
      userId: "user-1",
      projectId,
      title: "Chapter",
      content: "A",
      order: 0,
      wordCount: 1,
      createdAt: now,
      updatedAt: now,
    });
    const remoteCharacter = {
      id: crypto.randomUUID(),
      userId: "user-1",
      projectId,
      name: "Remote Character",
      description: null,
      firstAppearance: null,
      attributes: null,
      createdAt: now,
      updatedAt: "2026-09-13T00:02:00.000Z",
    };
    staleMerged.characters.push(remoteCharacter);
    const delta = createEmptySyncBundle();
    delta.characters.push(remoteCharacter);

    await applyMergedBundleToLocalFirstLuie({
      bundle: delta,
      packageBundle: staleMerged,
      hydrateMissingWorldDocsFromPackage: async () => undefined,
      buildProjectPackagePayload: async (input) =>
        await buildProjectPackagePayload({
          ...input,
          hydrateMissingWorldDocsFromPackage: async () => undefined,
          logger,
        }),
      logger,
    });

    expect(
      db
        .getClient()
        .select()
        .from(character)
        .where(eq(character.id, remoteCharacter.id))
        .get()?.name,
    ).toBe("Remote Character");
    expect(
      db
        .getClient()
        .select()
        .from(chapterBody)
        .where(eq(chapterBody.chapterId, chapterId))
        .get()?.content,
    ).toBe("B");
    expect(
      await readLuieContainerEntry(
        projectPath,
        `manuscript/${chapterId}.md`,
        logger,
      ),
    ).toBe("B");
    const afterSync = await getProjectRevisionState(projectId);
    expect(afterSync.exportedRevision).toBe(afterSync.revision);

    await db.disconnect();
    await db.initialize();
    expect(
      await readLuieContainerEntry(
        projectPath,
        `manuscript/${chapterId}.md`,
        logger,
      ),
    ).toBe("B");
    expect(await getProjectRevisionState(projectId)).toEqual(afterSync);
    expect(await listProjectsNeedingExport()).not.toContain(projectId);

    const remoteChapter = {
      ...staleMerged.chapters[0]!,
      content: "C",
      updatedAt: "2026-09-13T00:03:00.000Z",
    };
    const chapterDelta = createEmptySyncBundle();
    chapterDelta.chapters.push(remoteChapter);
    const chapterMerged = createEmptySyncBundle();
    chapterMerged.projects.push(staleMerged.projects[0]!);
    chapterMerged.chapters.push(remoteChapter);
    const localSnapshot = createEmptySyncBundle();
    localSnapshot.projects.push(staleMerged.projects[0]!);
    localSnapshot.chapters.push(staleMerged.chapters[0]!);

    await expect(
      applyMergedBundleToLocalFirstLuie({
        bundle: chapterDelta,
        packageBundle: chapterMerged,
        localSnapshot,
        hydrateMissingWorldDocsFromPackage: async () => undefined,
        buildProjectPackagePayload: async (input) =>
          await buildProjectPackagePayload({
            ...input,
            hydrateMissingWorldDocsFromPackage: async () => undefined,
            logger,
          }),
        logger,
      }),
    ).resolves.toEqual({
      status: "local-changed",
      chapterIds: [chapterId],
    });
    expect(
      db
        .getClient()
        .select()
        .from(chapterBody)
        .where(eq(chapterBody.chapterId, chapterId))
        .get()?.content,
    ).toBe("B");
    expect(
      await readLuieContainerEntry(
        projectPath,
        `manuscript/${chapterId}.md`,
        logger,
      ),
    ).toBe("B");
    expect(await getProjectRevisionState(projectId)).toEqual(afterSync);

    const metadataSnapshot = createEmptySyncBundle();
    metadataSnapshot.projects.push(staleMerged.projects[0]!);
    metadataSnapshot.chapters.push({
      ...staleMerged.chapters[0]!,
      title: "Stale Chapter Title",
      content: "B",
    });
    await expect(
      applyMergedBundleToLocalFirstLuie({
        bundle: chapterDelta,
        packageBundle: chapterMerged,
        localSnapshot: metadataSnapshot,
        hydrateMissingWorldDocsFromPackage: async () => undefined,
        buildProjectPackagePayload: async (input) =>
          await buildProjectPackagePayload({
            ...input,
            hydrateMissingWorldDocsFromPackage: async () => undefined,
            logger,
          }),
        logger,
      }),
    ).resolves.toEqual({
      status: "local-changed",
      chapterIds: [chapterId],
    });
    expect(
      db
        .getClient()
        .select({ title: chapter.title })
        .from(chapter)
        .where(eq(chapter.id, chapterId))
        .get()?.title,
    ).toBe("Chapter");
    expect(
      await readLuieContainerEntry(
        projectPath,
        `manuscript/${chapterId}.md`,
        logger,
      ),
    ).toBe("B");
    expect(await getProjectRevisionState(projectId)).toEqual(afterSync);
  });
});
