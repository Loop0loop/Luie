// TEST_LEVEL: REAL_DB_FS_INTEGRATION
// PROVES: a remote world-document deletion survives export retry/restart without package fallback resurrection

import crypto from "node:crypto";
import * as fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { and, eq } from "drizzle-orm";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
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
import { projectService } from "../../../src/main/services/features/project/projectService.js";
import { worldReplicaService } from "../../../src/main/services/features/worldReplica/index.js";
import { applyMergedBundleToLocalFirstLuie } from "../../../src/main/services/features/sync/syncBundleApplier.js";
import { buildLocalBundleFromDatabase } from "../../../src/main/services/features/sync/syncBundleHelpers.js";
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

describe("sync world deletion persistence", () => {
  let tempRoot = "";

  afterEach(async () => {
    vi.restoreAllMocks();
    if (tempRoot) await fsp.rm(tempRoot, { recursive: true, force: true });
    tempRoot = "";
  });

  it.each([
    { label: "immediate export", failFirstExport: false },
    { label: "failed export retry", failFirstExport: true },
  ])(
    "keeps a deleted plot empty across $label and DB reconnect",
    async ({ failFirstExport }) => {
      tempRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "luie-sync-delete-"));
      const projectPath = path.join(tempRoot, "project.luie");
      const projectId = crypto.randomUUID();
      const now = "2026-09-14T00:00:00.000Z";
      const deletedAt = "2026-09-14T00:01:00.000Z";
      const oldPlot = {
        columns: [{ id: "old-column", title: "Old", cards: [] }],
      };
      await db.getClient().insert(project).values({
        id: projectId,
        title: "World deletion",
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
      await db
        .getClient()
        .insert(worldDocument)
        .values({
          id: `${projectId}:plot`,
          projectId,
          docType: "plot",
          payload: JSON.stringify(oldPlot),
          createdAt: now,
          updatedAt: now,
        });
      await writeLuieContainer({
        targetPath: projectPath,
        payload: {
          meta: { projectId, title: "World deletion", chapters: [] },
          chapters: [],
          characters: [],
          terms: [],
          synopsis: { synopsis: "", status: "draft" },
          plot: oldPlot,
          drawing: { paths: [] },
          mindmap: { nodes: [], edges: [] },
          memos: { memos: [] },
          graph: { nodes: [], edges: [] },
          snapshots: [],
        },
        logger,
      });
      await markProjectExported(
        projectId,
        (await getProjectRevisionState(projectId)).revision,
      );

      const merged = createEmptySyncBundle();
      merged.projects.push({
        id: projectId,
        userId: "user-1",
        title: "World deletion",
        createdAt: now,
        updatedAt: deletedAt,
      });
      merged.worldDocuments.push({
        id: `${projectId}:plot`,
        userId: "user-1",
        projectId,
        docType: "plot",
        payload: oldPlot,
        updatedAt: deletedAt,
        deletedAt,
      });
      const delta = createEmptySyncBundle();
      delta.worldDocuments.push(merged.worldDocuments[0]);

      const exportSpy = failFirstExport
        ? vi
            .spyOn(projectService, "exportProjectPackageNow")
            .mockResolvedValueOnce(false)
        : null;
      const scheduleSpy = failFirstExport
        ? vi
            .spyOn(projectService, "schedulePackageExport")
            .mockImplementation(() => undefined)
        : null;
      const applyDeletion = applyMergedBundleToLocalFirstLuie({
        bundle: delta,
        packageBundle: merged,
        hydrateMissingWorldDocsFromPackage: async () => undefined,
        buildProjectPackagePayload: async (input) =>
          await buildProjectPackagePayload({
            ...input,
            hydrateMissingWorldDocsFromPackage: async () => undefined,
            logger,
          }),
        logger,
      });

      if (failFirstExport) {
        await expect(applyDeletion).rejects.toThrow(
          `SYNC_LUIE_PERSIST_FAILED:${projectId}`,
        );
        expect(scheduleSpy).toHaveBeenCalledWith(projectId, "sync:retry");
        exportSpy?.mockRestore();
        scheduleSpy?.mockRestore();
        const staleRevision = await getProjectRevisionState(projectId);
        expect(staleRevision.revision).toBeGreaterThan(
          staleRevision.exportedRevision,
        );
        expect(
          await projectService.exportProjectPackageNow(projectId, "sync:retry"),
        ).toBe(true);
      } else {
        await applyDeletion;
      }

      const replicaRows = await db
        .getClient()
        .select()
        .from(worldDocument)
        .where(
          and(
            eq(worldDocument.projectId, projectId),
            eq(worldDocument.docType, "plot"),
          ),
        );
      const localBundle = await buildLocalBundleFromDatabase({
        logger,
        pendingProjectDeletes: [],
        userId: "user-1",
      });
      const packagePlot = JSON.parse(
        (await readLuieContainerEntry(
          projectPath,
          "world/plot-board.json",
          logger,
        )) ?? "null",
      );
      const revision = await getProjectRevisionState(projectId);

      expect.soft(replicaRows).toHaveLength(1);
      expect
        .soft(localBundle.worldDocuments)
        .toContainEqual(
          expect.objectContaining({ projectId, docType: "plot", deletedAt }),
        );
      expect.soft(packagePlot).toEqual({ columns: [] });
      expect.soft(revision.exportedRevision).toBe(revision.revision);
      expect.soft(await listProjectsNeedingExport()).not.toContain(projectId);

      await db.disconnect();
      await db.initialize();
      expect(
        await projectService.exportProjectPackageNow(projectId, "test:retry"),
      ).toBe(true);
      expect(
        JSON.parse(
          (await readLuieContainerEntry(
            projectPath,
            "world/plot-board.json",
            logger,
          )) ?? "null",
        ),
      ).toEqual({ columns: [] });

      const restoredPlot = {
        columns: [{ id: "restored-column", title: "Restored", cards: [] }],
      };
      await worldReplicaService.setDocument({
        projectId,
        docType: "plot",
        payload: restoredPlot,
      });
      const restoredReplica = await db
        .getClient()
        .select()
        .from(worldDocument)
        .where(
          and(
            eq(worldDocument.projectId, projectId),
            eq(worldDocument.docType, "plot"),
          ),
        );
      expect(restoredReplica[0]).toMatchObject({ deletedAt: null });
      expect(
        JSON.parse(
          (await readLuieContainerEntry(
            projectPath,
            "world/plot-board.json",
            logger,
          )) ?? "null",
        ),
      ).toMatchObject(restoredPlot);
    },
  );
});
