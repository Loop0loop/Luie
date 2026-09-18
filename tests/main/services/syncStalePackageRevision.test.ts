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
  worldDocument,
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

  it("rejects stale world apply and project delete targets", async () => {
    const now = "2026-09-13T00:00:00.000Z";
    const localEditAt = "2026-09-13T00:02:00.000Z";
    const worldProjectId = crypto.randomUUID();
    await db.getClient().insert(project).values({
      id: worldProjectId,
      title: "World Race",
      createdAt: now,
      updatedAt: localEditAt,
    });
    await db.getClient().insert(worldDocument).values({
      id: `${worldProjectId}:plot`,
      projectId: worldProjectId,
      docType: "plot",
      payload: JSON.stringify({ value: "B" }),
      createdAt: now,
      updatedAt: localEditAt,
    });
    const worldSnapshot = createEmptySyncBundle();
    worldSnapshot.worldDocuments.push({
      id: `${worldProjectId}:plot`,
      userId: "user-1",
      projectId: worldProjectId,
      docType: "plot",
      payload: { value: "A" },
      updatedAt: now,
    });
    const worldDelta = createEmptySyncBundle();
    worldDelta.worldDocuments.push({
      ...worldSnapshot.worldDocuments[0]!,
      payload: { value: "C" },
      updatedAt: "2026-09-13T00:01:00.000Z",
    });

    await expect(
      applyMergedBundleToLocalFirstLuie({
        bundle: worldDelta,
        localSnapshot: worldSnapshot,
        hydrateMissingWorldDocsFromPackage: async () => undefined,
        buildProjectPackagePayload: async () => null,
        logger,
      }),
    ).resolves.toEqual({
      status: "local-changed",
      chapterIds: [],
      entityKeys: [`world:${worldProjectId}:plot`],
    });
    expect(
      JSON.parse(
        db
          .getClient()
          .select({ payload: worldDocument.payload })
          .from(worldDocument)
          .where(eq(worldDocument.projectId, worldProjectId))
          .get()!.payload,
      ),
    ).toEqual({ value: "B" });

    const deleteProjectId = crypto.randomUUID();
    const deleteChapterId = crypto.randomUUID();
    await db.getClient().insert(project).values({
      id: deleteProjectId,
      title: "Delete Race",
      createdAt: now,
      updatedAt: now,
    });
    await db.getClient().insert(chapter).values({
      id: deleteChapterId,
      projectId: deleteProjectId,
      title: "Chapter",
      content: "A",
      order: 0,
      wordCount: 1,
      createdAt: now,
      updatedAt: now,
    });
    await db.getClient().insert(chapterBody).values({
      chapterId: deleteChapterId,
      content: "A",
      contentHash: "body-a-hash",
      updatedAt: now,
    });
    const deleteSnapshotRevision = db
      .getClient()
      .select({ revision: project.revision })
      .from(project)
      .where(eq(project.id, deleteProjectId))
      .get()!.revision;
    const deleteSnapshot = createEmptySyncBundle();
    deleteSnapshot.projects.push({
      id: deleteProjectId,
      userId: "user-1",
      title: "Delete Race",
      createdAt: now,
      updatedAt: now,
      localRevision: deleteSnapshotRevision,
    });
    deleteSnapshot.chapters.push({
      id: deleteChapterId,
      userId: "user-1",
      projectId: deleteProjectId,
      title: "Chapter",
      content: "A",
      order: 0,
      wordCount: 1,
      createdAt: now,
      updatedAt: now,
    });
    db.getClient()
      .update(chapter)
      .set({ content: "B", updatedAt: localEditAt })
      .where(eq(chapter.id, deleteChapterId))
      .run();
    db.getClient()
      .update(chapterBody)
      .set({
        content: "B",
        contentHash: "body-b-hash",
        updatedAt: localEditAt,
      })
      .where(eq(chapterBody.chapterId, deleteChapterId))
      .run();
    const deleteDelta = createEmptySyncBundle();
    deleteDelta.tombstones.push({
      id: `${deleteProjectId}:project:${deleteProjectId}`,
      userId: "user-1",
      projectId: deleteProjectId,
      entityType: "project",
      entityId: deleteProjectId,
      deletedAt: "2026-09-13T00:01:00.000Z",
      updatedAt: "2026-09-13T00:01:00.000Z",
    });

    await expect(
      applyMergedBundleToLocalFirstLuie({
        bundle: deleteDelta,
        localSnapshot: deleteSnapshot,
        hydrateMissingWorldDocsFromPackage: async () => undefined,
        buildProjectPackagePayload: async () => null,
        logger,
      }),
    ).resolves.toEqual({
      status: "local-changed",
      chapterIds: [],
      entityKeys: [`project:${deleteProjectId}`],
    });
    expect(
      db
        .getClient()
        .select({ id: project.id })
        .from(project)
        .where(eq(project.id, deleteProjectId))
        .get()?.id,
    ).toBe(deleteProjectId);
  });
});
