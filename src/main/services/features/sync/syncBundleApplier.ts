import type { LuiePackageExportData } from "../../io/luiePackageTypes.js";
import { db } from "../../../infra/database/index.js";
import {
  applyChapterTombstones,
  applyReplicaWorldState,
  applyProjectDeletes,
  collectDeletedProjectIds,
  upsertChapter,
  upsertCharacters,
  upsertEvents,
  upsertFactions,
  upsertProjects,
  upsertTerms,
} from "./syncLocalApply.js";
import {
  buildProjectPackagePayload as buildProjectPackagePayloadImpl,
  persistBundleToLuiePackages,
} from "./syncPackagePersistence.js";
import type { SyncBundle } from "./syncMapper.js";

type LoggerLike = {
  warn: (message: string, details?: unknown) => void;
  error: (message: string, details?: unknown) => void;
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
}): Promise<void> => {
  const client = db.getClient();
  const deletedProjectIds = collectDeletedProjectIds(input.bundle);
  const bundleProjectIds = input.bundle.projects.map((project) => project.id);
  try {
    client.transaction((tx) => {
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
      applyReplicaWorldState(tx, input.bundle, deletedProjectIds);
      applyChapterTombstones(tx, input.bundle.tombstones, deletedProjectIds);
    });
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

  await persistBundleToLuiePackages({
    bundle: input.bundle,
    hydrateMissingWorldDocsFromPackage:
      input.hydrateMissingWorldDocsFromPackage,
    buildProjectPackagePayload: input.buildProjectPackagePayload,
    logger: input.logger,
  });
};
