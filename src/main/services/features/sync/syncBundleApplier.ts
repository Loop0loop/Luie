import type { LuiePackageExportData } from "../../io/luiePackageTypes.js";
import { eq, inArray } from "drizzle-orm";
import {
  chapter,
  chapterBody,
  db,
  project,
  type DbLike,
} from "../../../infra/database/index.js";
import {
  applyChapterTombstones,
  applyReplicaWorldDelta,
  applyProjectDeletes,
  collectDeletedProjectIds,
  upsertChapter,
  upsertCharacters,
  upsertEvents,
  upsertFactions,
  upsertProjects,
  upsertTerms,
} from "./syncLocalApply.js";
import { applyMemoryCanonicalSyncRows } from "./syncMemoryCanonicalApply.js";
import { buildProjectPackagePayload as buildProjectPackagePayloadImpl } from "./syncPackagePersistence.js";
import { projectService } from "../project/projectService.js";
import type { SyncBundle } from "./syncMapper.js";
import {
  collectSyncBundleProjectIds,
  filterSyncBundleByProjectIds,
} from "./syncDelta.js";

export type SyncCapturedRevisions = ReadonlyMap<string, number>;

export type SyncLocalApplyResult =
  { status: "applied" } | { status: "local-changed"; chapterIds: string[] };

type LoggerLike = {
  warn: (message: string, details?: unknown) => void;
  error: (message: string, details?: unknown) => void;
};

const findChangedChaptersSinceSnapshot = (
  tx: DbLike,
  chapterIds: string[],
  snapshot: SyncBundle["chapters"],
): string[] => {
  const snapshotById = new Map(snapshot.map((row) => [row.id, row]));
  const changed: string[] = [];

  for (const chapterId of chapterIds) {
    const before = snapshotById.get(chapterId);
    const current = tx
      .select({
        id: chapter.id,
        projectId: chapter.projectId,
        title: chapter.title,
        content: chapter.content,
        synopsis: chapter.synopsis,
        order: chapter.order,
        wordCount: chapter.wordCount,
        updatedAt: chapter.updatedAt,
        deletedAt: chapter.deletedAt,
      })
      .from(chapter)
      .where(eq(chapter.id, chapterId))
      .limit(1)
      .get();
    const currentBody = current
      ? tx
          .select({ content: chapterBody.content })
          .from(chapterBody)
          .where(eq(chapterBody.chapterId, chapterId))
          .limit(1)
          .get()
      : undefined;

    if (
      (!before && current) ||
      (before &&
        (!current ||
          current.projectId !== before.projectId ||
          current.title !== before.title ||
          (currentBody?.content ?? current.content) !== before.content ||
          (current.synopsis ?? null) !== (before.synopsis ?? null) ||
          current.order !== before.order ||
          current.wordCount !== before.wordCount ||
          String(current.updatedAt) !== before.updatedAt ||
          (current.deletedAt ? String(current.deletedAt) : null) !==
            (before.deletedAt ?? null)))
    ) {
      changed.push(chapterId);
    }
  }

  return changed;
};

export const buildSyncProjectPackagePayload = async (input: {
  bundle: SyncBundle;
  projectId: string;
  projectPath: string;
  localSnapshots: Array<{
    id: string;
    chapterId: string | null;
    content: string;
    description: string | null;
    createdAt: Date;
  }>;
  hydrateMissingWorldDocsFromPackage: (
    worldDocs: Map<SyncBundle["worldDocuments"][number]["docType"], unknown>,
    targetProjectPath: string,
    skippedDocTypes?: Set<SyncBundle["worldDocuments"][number]["docType"]>,
  ) => Promise<void>;
  logger: LoggerLike;
}): Promise<LuiePackageExportData | null> => {
  return buildProjectPackagePayloadImpl({
    bundle: input.bundle,
    projectId: input.projectId,
    projectPath: input.projectPath,
    localSnapshots: input.localSnapshots,
    hydrateMissingWorldDocsFromPackage:
      input.hydrateMissingWorldDocsFromPackage,
    logger: input.logger,
  });
};

export const applyMergedBundleToLocalFirstLuie = async (input: {
  bundle: SyncBundle;
  packageBundle?: SyncBundle;
  localSnapshot?: SyncBundle;
  hydrateMissingWorldDocsFromPackage: (
    worldDocs: Map<SyncBundle["worldDocuments"][number]["docType"], unknown>,
    projectPath: string,
    skippedDocTypes?: Set<SyncBundle["worldDocuments"][number]["docType"]>,
  ) => Promise<void>;
  buildProjectPackagePayload: (args: {
    bundle: SyncBundle;
    projectId: string;
    projectPath: string;
    localSnapshots: Array<{
      id: string;
      chapterId: string | null;
      content: string;
      description: string | null;
      createdAt: Date;
    }>;
  }) => Promise<LuiePackageExportData | null>;
  logger: LoggerLike;
}): Promise<SyncLocalApplyResult> => {
  const client = db.getClient();
  const deletedProjectIds = collectDeletedProjectIds(input.bundle);
  const affectedProjectIds = collectSyncBundleProjectIds(input.bundle);
  const bundleProjectIds = [...affectedProjectIds];
  const packageBundle = filterSyncBundleByProjectIds(
    input.packageBundle ?? input.bundle,
    affectedProjectIds,
  );
  const activeProjectIds = [
    ...new Set(
      packageBundle.projects
        .filter(
          (project) => !project.deletedAt && !deletedProjectIds.has(project.id),
        )
        .map((project) => project.id),
    ),
  ];
  let capturedRevisions: SyncCapturedRevisions;
  try {
    const transactionResult = client.transaction((tx) => {
      if (input.localSnapshot) {
        const changedChapterIds = findChangedChaptersSinceSnapshot(
          tx,
          input.bundle.chapters.map((row) => row.id),
          input.localSnapshot.chapters,
        );
        if (changedChapterIds.length > 0) {
          return {
            status: "local-changed" as const,
            chapterIds: changedChapterIds,
          };
        }
      }

      applyProjectDeletes(tx, deletedProjectIds);
      upsertProjects(tx, input.bundle.projects, deletedProjectIds);

      for (const chapter of input.bundle.chapters) {
        if (deletedProjectIds.has(chapter.projectId)) continue;
        upsertChapter(tx, chapter);
      }

      upsertCharacters(tx, input.bundle.characters, deletedProjectIds);
      upsertEvents(tx, input.bundle.events, deletedProjectIds);
      upsertFactions(tx, input.bundle.factions, deletedProjectIds);
      upsertTerms(tx, input.bundle.terms, deletedProjectIds);
      applyReplicaWorldDelta(
        tx,
        input.bundle,
        input.packageBundle ?? input.bundle,
        deletedProjectIds,
      );
      applyChapterTombstones(tx, input.bundle.tombstones, deletedProjectIds);
      applyMemoryCanonicalSyncRows(tx, input.bundle, deletedProjectIds);

      if (activeProjectIds.length === 0) {
        return { status: "applied" as const, revisions: new Map() };
      }
      const rows = tx
        .select({ id: project.id, revision: project.revision })
        .from(project)
        .where(inArray(project.id, activeProjectIds))
        .all();
      if (rows.length !== activeProjectIds.length) {
        throw new Error("SYNC_PROJECT_REVISION_CAPTURE_INCOMPLETE");
      }
      return {
        status: "applied" as const,
        revisions: new Map(rows.map((row) => [row.id, row.revision])),
      };
    });
    if (transactionResult.status === "local-changed") {
      return transactionResult;
    }
    capturedRevisions = transactionResult.revisions;
  } catch (error) {
    input.logger.error(
      "Failed to apply merged bundle to DB cache before .luie persistence",
      {
        error,
      },
    );

    throw new Error(
      `SYNC_DB_CACHE_APPLY_FAILED:${bundleProjectIds.join(",") || "none"}`,
      { cause: error },
    );
  }

  const failedProjects: string[] = [];
  for (const projectId of capturedRevisions.keys()) {
    try {
      const exported = await projectService.exportProjectPackageNow(
        projectId,
        "sync",
      );
      if (!exported) throw new Error("SYNC_PACKAGE_EXPORT_RETURNED_FALSE");
    } catch (error) {
      failedProjects.push(projectId);
      projectService.schedulePackageExport(projectId, "sync:retry");
      input.logger.error("Failed to export authoritative sync package", {
        projectId,
        error,
      });
    }
  }
  if (failedProjects.length > 0) {
    throw new Error(`SYNC_LUIE_PERSIST_FAILED:${failedProjects.join(",")}`);
  }
  return { status: "applied" };
};
