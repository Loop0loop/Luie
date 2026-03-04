import type { LuiePackageExportData } from "../../io/luiePackageTypes.js";
import { db } from "../../../database/index.js";
import {
  applyChapterTombstones,
  applyProjectDeletes,
  collectDeletedProjectIds,
  upsertChapter,
  upsertCharacters,
  upsertProjects,
  upsertTerms,
} from "./syncLocalApply.js";
import {
  buildProjectPackagePayload as buildProjectPackagePayloadImpl,
  persistBundleToLuiePackages,
  recoverDbCacheFromPersistedPackages,
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
  ) => Promise<void>;
  logger: LoggerLike;
}): Promise<LuiePackageExportData | null> => {
  return buildProjectPackagePayloadImpl({
    bundle: input.bundle,
    projectId: input.projectId,
    projectPath: input.projectPath,
    localSnapshots: input.localSnapshots,
    hydrateMissingWorldDocsFromPackage: input.hydrateMissingWorldDocsFromPackage,
    logger: input.logger,
  });
};

export const applyMergedBundleToLocalFirstLuie = async (input: {
  bundle: SyncBundle;
  hydrateMissingWorldDocsFromPackage: (
    worldDocs: Map<SyncBundle["worldDocuments"][number]["docType"], unknown>,
    projectPath: string,
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
  const persistedPackages = await persistBundleToLuiePackages({
    bundle: input.bundle,
    hydrateMissingWorldDocsFromPackage: input.hydrateMissingWorldDocsFromPackage,
    buildProjectPackagePayload: input.buildProjectPackagePayload,
    logger: input.logger,
  });

  const prisma = db.getClient();
  const deletedProjectIds = collectDeletedProjectIds(input.bundle);
  try {
    await prisma.$transaction(async (tx: unknown) => {
      const transactionClient = tx as ReturnType<(typeof db)["getClient"]>;
      await applyProjectDeletes(transactionClient, deletedProjectIds);
      await upsertProjects(transactionClient, input.bundle.projects, deletedProjectIds);

      for (const chapter of input.bundle.chapters) {
        if (deletedProjectIds.has(chapter.projectId)) continue;
        await upsertChapter(transactionClient, chapter);
      }

      await upsertCharacters(transactionClient, input.bundle.characters, deletedProjectIds);
      await upsertTerms(transactionClient, input.bundle.terms, deletedProjectIds);
      await applyChapterTombstones(
        transactionClient,
        input.bundle.tombstones,
        deletedProjectIds,
      );
    });
  } catch (error) {
    const persistedProjectIds = persistedPackages.map((item) => item.projectId);
    input.logger.error("Failed to apply merged bundle to DB cache after .luie persistence", {
      error,
      persistedProjectIds,
    });

    const failedRecoveryProjectIds = await recoverDbCacheFromPersistedPackages(
      persistedPackages,
      input.logger,
    );
    if (failedRecoveryProjectIds.length > 0) {
      throw new Error(
        `SYNC_DB_CACHE_APPLY_FAILED:${persistedProjectIds.join(",") || "none"};SYNC_DB_CACHE_RECOVERY_FAILED:${failedRecoveryProjectIds.join(",")}`,
      );
    }
    throw new Error(`SYNC_DB_CACHE_APPLY_FAILED:${persistedProjectIds.join(",") || "none"}`);
  }
};
