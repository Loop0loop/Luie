import { eq } from "drizzle-orm";
import { promises as fs } from "fs";
import { randomUUID } from "node:crypto";
import type { z } from "zod";
import { db } from "../../../database/index.js";
import * as schema from "../../../database/schema.js";
import {
  ErrorCode,
  LUIE_PACKAGE_EXTENSION,
  LUIE_PACKAGE_META_FILENAME,
} from "../../../../shared/constants/index.js";
import { ServiceError } from "../../../utils/serviceError.js";
import { ensureLuieExtension } from "../../../utils/luiePackage.js";
import type { LoggerLike as LuieWriterLogger } from "../../io/luiePackageTypes.js";
import { readLuieContainerEntry } from "../../io/luieContainer.js";
import { normalizeLuiePackagePath } from "./projectPathPolicy.js";
import { LuieMetaSchema } from "./projectLuieSchemas.js";
import {
  buildChapterCreateRows,
  buildCharacterCreateRows,
  buildSnapshotCreateRows,
  buildTermCreateRows,
} from "./projectImportCodec.js";
import { buildGraphCreateRows } from "./projectImportGraph.js";
import { applyProjectImportTransaction } from "./projectImportTransaction.js";
import {
  findProjectByAttachmentPath,
  setProjectAttachmentPath,
} from "./projectAttachmentStore.js";
import { readLuieImportCollections } from "./importOpen/index.js";

type LoggerLike = LuieWriterLogger & {
  info: (message: string, details?: unknown) => void;
  warn: (message: string, details?: unknown) => void;
};

type LuieMeta = z.infer<typeof LuieMetaSchema>;
type ExistingProjectLookup = { id: string; updatedAt: Date } | null;
type LuieMetaReadResult = {
  meta: LuieMeta | null;
  luieCorrupted: boolean;
  recoveryReason?: "missing" | "corrupt";
};

const findProjectByPath = async (resolvedPath: string): Promise<ExistingProjectLookup> => {
  const project = await findProjectByAttachmentPath(resolvedPath);
  if (!project) {
    return null;
  }
  return {
    id: project.id,
    updatedAt: project.updatedAt,
  };
};

const readMetaOrMarkCorrupt = async (
  resolvedPath: string,
  logger: LoggerLike,
): Promise<LuieMetaReadResult> => {
  try {
    await fs.access(resolvedPath);
  } catch {
    return {
      meta: null,
      luieCorrupted: true,
      recoveryReason: "missing",
    };
  }

  try {
    const metaRaw = await readLuieContainerEntry(
      resolvedPath,
      LUIE_PACKAGE_META_FILENAME,
      logger,
    );
    if (!metaRaw) {
      throw new Error("MISSING_META");
    }
    const parsedMeta = LuieMetaSchema.safeParse(JSON.parse(metaRaw));
    if (!parsedMeta.success) {
      throw new Error("INVALID_META");
    }
    return { meta: parsedMeta.data, luieCorrupted: false };
  } catch (error) {
    if (
      error instanceof ServiceError &&
      error.code === ErrorCode.LUIE_LEGACY_FORMAT_UNSUPPORTED
    ) {
      throw error;
    }
    logger.warn("Failed to read .luie meta; treating as corrupted", {
      packagePath: resolvedPath,
      error,
    });
    return { meta: null, luieCorrupted: true, recoveryReason: "corrupt" };
  }
};

const resolveImportIdentity = (
  meta: LuieMeta,
  existingByPath: ExistingProjectLookup,
): { resolvedProjectId: string; legacyProjectId: string | null } => {
  const metaProjectId = typeof meta.projectId === "string" ? meta.projectId : undefined;
  const resolvedProjectId = metaProjectId ?? existingByPath?.id ?? randomUUID();
  const legacyProjectId =
    existingByPath && existingByPath.id !== resolvedProjectId
      ? existingByPath.id
      : null;
  return { resolvedProjectId, legacyProjectId };
};

const buildRecoveryTimestamp = (date = new Date()): string => {
  const pad = (value: number) => String(value).padStart(2, "0");
  return (
    `${date.getFullYear()}` +
    `${pad(date.getMonth() + 1)}` +
    `${pad(date.getDate())}` +
    `-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  );
};

const resolveRecoveredPackagePath = async (resolvedPath: string): Promise<string> => {
  const normalized = ensureLuieExtension(resolvedPath);
  const ext = LUIE_PACKAGE_EXTENSION;
  const lower = normalized.toLowerCase();
  const base = lower.endsWith(ext)
    ? normalized.slice(0, normalized.length - ext.length)
    : normalized;
  const timestamp = buildRecoveryTimestamp();
  let candidate = `${base}.recovered-${timestamp}${ext}`;
  let suffix = 1;

  for (;;) {
    try {
      await fs.access(candidate);
      candidate = `${base}.recovered-${timestamp}-${suffix}${ext}`;
      suffix += 1;
    } catch {
      return candidate;
    }
  }
};

export const openLuieProjectPackage = async (input: {
  packagePath: string;
  logger: LoggerLike;
  exportRecoveredPackage: (projectId: string, recoveryPath: string) => Promise<boolean>;
  getProjectById: (projectId: string) => Promise<unknown>;
}) => {
  const resolvedPath = normalizeLuiePackagePath(input.packagePath, "packagePath");
  const { meta, luieCorrupted, recoveryReason } = await readMetaOrMarkCorrupt(
    resolvedPath,
    input.logger,
  );
  const existingByPath = await findProjectByPath(resolvedPath);

  if (luieCorrupted) {
    if (!existingByPath) {
      throw new ServiceError(
        ErrorCode.FS_READ_FAILED,
        "Failed to read .luie meta",
        { packagePath: resolvedPath },
      );
    }
    const recoveryPath = await resolveRecoveredPackagePath(resolvedPath);
    const exported = await input.exportRecoveredPackage(existingByPath.id, recoveryPath);
    if (!exported) {
      throw new ServiceError(
        ErrorCode.FS_WRITE_FAILED,
        "Failed to write recovered .luie package",
        { packagePath: resolvedPath, recoveryPath },
      );
    }
    await setProjectAttachmentPath(existingByPath.id, recoveryPath);
    const project = await input.getProjectById(existingByPath.id);
    return {
      project,
      recovery: true,
      recoveryPath,
      recoveryReason: recoveryReason ?? "corrupt",
    };
  }

  if (!meta) {
    throw new ServiceError(
      ErrorCode.VALIDATION_FAILED,
      "Invalid .luie meta format",
      { packagePath: resolvedPath },
    );
  }

  const { resolvedProjectId, legacyProjectId } = resolveImportIdentity(meta, existingByPath);
  const existingRow = await db.getClient()
    .select({ id: schema.project.id, updatedAt: schema.project.updatedAt })
    .from(schema.project)
    .where(eq(schema.project.id, resolvedProjectId))
    .limit(1);
  const existing: ExistingProjectLookup = existingRow.length > 0
    ? { id: existingRow[0].id, updatedAt: new Date(existingRow[0].updatedAt) }
    : null;

  const packageUpdatedAt = typeof meta.updatedAt === "string" ? Date.parse(meta.updatedAt) : NaN;
  const localUpdatedAt = existing?.updatedAt instanceof Date ? existing.updatedAt.getTime() : NaN;
  if (
    existing &&
    Number.isFinite(packageUpdatedAt) &&
    Number.isFinite(localUpdatedAt) &&
    localUpdatedAt > packageUpdatedAt
  ) {
    input.logger.warn("Skipping stale .luie import; local project is newer", {
      projectId: existing.id,
      packagePath: resolvedPath,
      packageUpdatedAt: meta.updatedAt,
      localUpdatedAt: existing.updatedAt.toISOString(),
    });
    return {
      project: await input.getProjectById(existing.id),
      conflict: "db-newer" as const,
    };
  }

  const chaptersMeta = meta.chapters ?? [];
  const collections = await readLuieImportCollections(resolvedPath, input.logger);
  const chaptersForCreate = await buildChapterCreateRows({
    packagePath: resolvedPath,
    resolvedProjectId,
    chaptersMeta,
    readChapterEntry: async (entryPath: string) =>
      await readLuieContainerEntry(resolvedPath, entryPath, input.logger),
  });
  const charactersForCreate = buildCharacterCreateRows(
    resolvedProjectId,
    collections.characters,
  );
  const termsForCreate = buildTermCreateRows(resolvedProjectId, collections.terms);
  const graphRows = buildGraphCreateRows({
    projectId: resolvedProjectId,
    graph: collections.graph,
    baseCharacters: charactersForCreate,
    baseTerms: termsForCreate,
  });
  const snapshotsForCreate = buildSnapshotCreateRows({
    resolvedProjectId,
    snapshots: collections.snapshots,
    validChapterIds: new Set(chaptersForCreate.map((chapter) => chapter.id)),
    logger: input.logger,
  });

  const created = await applyProjectImportTransaction({
    resolvedProjectId,
    legacyProjectId,
    existing,
    meta,
    worldSynopsis: collections.synopsis,
    worldPlot: collections.plot,
    worldDrawing: collections.drawing,
    worldMindmap: collections.mindmap,
    worldScrapMemos: collections.memos,
    worldGraph: collections.graph,
    resolvedPath,
    chaptersForCreate,
    charactersForCreate: graphRows.charactersForCreate,
    termsForCreate: graphRows.termsForCreate,
    factionsForCreate: graphRows.factionsForCreate,
    eventsForCreate: graphRows.eventsForCreate,
    worldEntitiesForCreate: graphRows.worldEntitiesForCreate,
    relationsForCreate: graphRows.relationsForCreate,
    snapshotsForCreate,
  });

  input.logger.info(".luie package hydrated", {
    projectId: created.id,
    chapterCount: chaptersForCreate.length,
    characterCount: graphRows.charactersForCreate.length,
    termCount: graphRows.termsForCreate.length,
    factionCount: graphRows.factionsForCreate.length,
    eventCount: graphRows.eventsForCreate.length,
    worldEntityCount: graphRows.worldEntitiesForCreate.length,
    relationCount: graphRows.relationsForCreate.length,
    snapshotCount: snapshotsForCreate.length,
  });

  return {
    project: await input.getProjectById(created.id),
    conflict: "luie-newer" as const,
  };
};
