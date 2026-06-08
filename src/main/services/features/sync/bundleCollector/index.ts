import { LUIE_PACKAGE_EXTENSION } from "../../../../../shared/constants/index.js";
import type { SyncPendingProjectDelete } from "../../../../../shared/types/index.js";
import { ensureSafeAbsolutePath } from "../../../../utils/fs/index.js";
import { createEmptySyncBundle, type SyncBundle } from "../syncMapper.js";
import {
  appendChapterRecords,
  appendCharacterRecords,
  appendEventRecords,
  appendFactionRecords,
  appendPendingProjectDeleteTombstones,
  appendProjectRecord,
  appendTermRecords,
} from "./recordAppenders.js";
import type {
  LoggerLike,
  WorldDocumentType,
} from "./types.js";
import {
  addWorldDocumentRecord,
  appendReplicaScrapMemoRecords,
  appendScrapMemos,
  collectReplicaWorldDocuments,
  hydrateMissingWorldDocsFromPackage,
} from "./worldDocuments.js";

const toRecordArray = (value: unknown): Array<Record<string, unknown>> =>
  Array.isArray(value) ? (value as Array<Record<string, unknown>>) : [];

const collectProjectBundleData = async (
  bundle: SyncBundle,
  userId: string,
  projectRow: Record<string, unknown>,
  logger: LoggerLike,
): Promise<void> => {
  const project = appendProjectRecord(bundle, userId, projectRow);
  if (!project) return;
  const { projectId, projectPath, projectUpdatedAt } = project;

  appendChapterRecords(
    bundle,
    userId,
    projectId,
    toRecordArray(projectRow.chapters),
  );
  appendCharacterRecords(
    bundle,
    userId,
    projectId,
    toRecordArray(projectRow.characters),
  );
  appendEventRecords(
    bundle,
    userId,
    projectId,
    toRecordArray(projectRow.events),
  );
  appendFactionRecords(
    bundle,
    userId,
    projectId,
    toRecordArray(projectRow.factions),
  );
  appendTermRecords(
    bundle,
    userId,
    projectId,
    toRecordArray(projectRow.terms),
  );

  const worldDocsByType = collectReplicaWorldDocuments(
    projectRow,
    projectId,
    logger,
  );

  if (
    projectPath &&
    projectPath.toLowerCase().endsWith(LUIE_PACKAGE_EXTENSION)
  ) {
    try {
      const safeProjectPath = ensureSafeAbsolutePath(
        projectPath,
        "projectPath",
      );
      await hydrateMissingWorldDocsFromPackage(
        worldDocsByType,
        safeProjectPath,
        logger,
      );
    } catch (error) {
      logger.warn("Skipping sync world document read for invalid projectPath", {
        projectId,
        projectPath,
        error,
      });
    }
  }

  for (const [docType, payload] of worldDocsByType.entries()) {
    addWorldDocumentRecord(
      bundle,
      userId,
      projectId,
      docType,
      payload,
      projectUpdatedAt,
    );
  }

  const hasReplicaMemos = appendReplicaScrapMemoRecords(
    bundle,
    userId,
    projectId,
    projectRow,
  );
  if (!hasReplicaMemos) {
    const scrapPayload = worldDocsByType.get("scrap");
    if (scrapPayload) {
      appendScrapMemos(
        bundle,
        userId,
        projectId,
        scrapPayload,
        projectUpdatedAt,
      );
    }
  }
};

export const buildLocalSyncBundle = async (input: {
  userId: string;
  pendingProjectDeletes: SyncPendingProjectDelete[];
  projectRows: Array<Record<string, unknown>>;
  logger: LoggerLike;
}): Promise<SyncBundle> => {
  const bundle = createEmptySyncBundle();
  for (const projectRow of input.projectRows) {
    await collectProjectBundleData(
      bundle,
      input.userId,
      projectRow,
      input.logger,
    );
  }
  appendPendingProjectDeleteTombstones(
    bundle,
    input.userId,
    input.pendingProjectDeletes,
  );
  return bundle;
};

export { hydrateMissingWorldDocsFromPackage };
export type { WorldDocumentType };
