import type { SyncPendingProjectDelete } from "../../../../shared/types/index.js";
import type { LuiePackageExportData } from "../../io/luiePackageTypes.js";
import { db } from "../../../database/index.js";
import {
  buildLocalSyncBundle,
  hydrateMissingWorldDocsFromPackage,
} from "./syncBundleCollector.js";
import { buildSyncProjectPackagePayload } from "./syncBundleApplier.js";
import type { SyncBundle } from "./syncMapper.js";
import { hydrateProjectsWithAttachmentPaths } from "../../core/project/projectAttachmentStore.js";

type LoggerLike = {
  warn: (message: string, details?: unknown) => void;
  error: (message: string, details?: unknown) => void;
};

export const buildLocalBundleFromDatabase = async (input: {
  logger: LoggerLike;
  pendingProjectDeletes: SyncPendingProjectDelete[];
  userId: string;
}): Promise<SyncBundle> => {
  const prisma = db.getClient();
  const projectRows = (await prisma.project.findMany({
    include: {
      chapters: true,
      characters: true,
      scrapMemos: {
        orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
      },
      terms: true,
      worldDocuments: {
        orderBy: { updatedAt: "desc" },
      },
    },
  })) as Array<Record<string, unknown>>;
  const hydratedProjectRows = await hydrateProjectsWithAttachmentPaths(
    projectRows.map((projectRow) => ({
      ...projectRow,
      id: String(projectRow.id ?? ""),
    })),
  );

  return await buildLocalSyncBundle({
    userId: input.userId,
    pendingProjectDeletes: input.pendingProjectDeletes,
    projectRows: hydratedProjectRows,
    logger: input.logger,
  });
};

export const buildProjectPackagePayloadForSync = async (input: {
  bundle: SyncBundle;
  localSnapshots: Array<{
    id: string;
    chapterId: string | null;
    content: string;
    description: string | null;
    createdAt: Date;
  }>;
  logger: LoggerLike;
  projectId: string;
  projectPath: string;
}): Promise<LuiePackageExportData | null> => {
  return await buildSyncProjectPackagePayload({
    bundle: input.bundle,
    projectId: input.projectId,
    projectPath: input.projectPath,
    localSnapshots: input.localSnapshots,
    hydrateMissingWorldDocsFromPackage: async (worldDocs, targetProjectPath, skippedDocTypes) =>
      await hydrateMissingWorldDocsFromPackage(
        worldDocs,
        targetProjectPath,
        input.logger,
        skippedDocTypes,
      ),
    logger: input.logger,
  });
};

export const countBundleRows = (bundle: SyncBundle): number =>
  bundle.projects.length +
  bundle.chapters.length +
  bundle.characters.length +
  bundle.terms.length +
  bundle.worldDocuments.length +
  bundle.memos.length +
  bundle.snapshots.length +
  bundle.tombstones.length;
