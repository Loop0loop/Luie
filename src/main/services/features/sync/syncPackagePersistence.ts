import { eq, desc } from "drizzle-orm";
import {
  LUIE_MANUSCRIPT_DIR,
  LUIE_PACKAGE_CONTAINER_DIR,
  LUIE_PACKAGE_EXTENSION,
  LUIE_PACKAGE_FORMAT,
  LUIE_PACKAGE_VERSION,
  MARKDOWN_EXTENSION,
} from "../../../../shared/constants/index.js";
import {
  MEMORY_CANONICAL_EXPORTABLE_TABLES,
  isMemoryRowExportable,
} from "../memory/persistence/memoryPersistencePolicy.js";
import type { LuiePackageExportData } from "../../io/luiePackageTypes.js";
import type { MemoryCanonicalPackagePayload } from "../memory/persistence/memoryCanonicalPackage.js";
import { writeLuieContainer } from "../../io/luieContainer.js";
import { db } from "../../../infra/database/index.js";
import {
  project as projectTable,
  snapshot as snapshotTable,
} from "../../../infra/database/index.js";
import { ensureSafeAbsolutePath } from "../../../utils/fs/index.js";
import { projectService } from "../project/projectService.js";
import { getProjectAttachmentPath } from "../../core/project/projectAttachmentStore.js";
import type { SyncBundle } from "./syncMapper.js";
import type { WorldDocumentType } from "./syncWorldDocNormalizer.js";
import {
  normalizeDrawingPayload,
  normalizeGraphPayload,
  normalizeMindmapPayload,
  normalizePlotPayload,
  normalizeScrapPayload,
  normalizeSynopsisPayload,
} from "./syncWorldDocNormalizer.js";

export type PersistedLuiePackage = { projectId: string; projectPath: string };

type LoggerLike = {
  warn: (message: string, data?: unknown) => void;
  error: (message: string, data?: unknown) => void;
};

type SnapshotRecord = {
  id: string;
  chapterId: string | null;
  content: string;
  description: string | null;
  createdAt: Date;
};

const toNullableString = (value: unknown): string | null =>
  typeof value === "string" ? value : null;

const sortByUpdatedAtDesc = <T extends { updatedAt: string }>(rows: T[]): T[] =>
  [...rows].sort(
    (left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt),
  );

const buildMemoryPayloadFromBundle = (
  bundle: SyncBundle,
  projectId: string,
): MemoryCanonicalPackagePayload => {
  const tables: MemoryCanonicalPackagePayload["tables"] = {};
  const allowedTables = new Set<string>(MEMORY_CANONICAL_EXPORTABLE_TABLES);
  for (const item of bundle.memoryCanonicalRows ?? []) {
    if (item.projectId !== projectId || item.deletedAt) continue;
    if (!allowedTables.has(item.tableName)) continue;
    if (
      typeof item.row.id !== "string" ||
      item.row.projectId !== projectId ||
      !isMemoryRowExportable({
        tableName: item.tableName,
        status: typeof item.row.status === "string" ? item.row.status : null,
      })
    ) {
      continue;
    }
    const tableRows = tables[item.tableName as keyof typeof tables] ?? [];
    tableRows.push(item.row);
    tables[item.tableName as keyof typeof tables] = tableRows;
  }
  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    tables,
  };
};

export const buildProjectPackagePayload = async (input: {
  bundle: SyncBundle;
  projectId: string;
  projectPath: string;
  localSnapshots: SnapshotRecord[];
  hydrateMissingWorldDocsFromPackage: (
    worldDocs: Map<WorldDocumentType, unknown>,
    projectPath: string,
    skippedDocTypes?: Set<WorldDocumentType>,
  ) => Promise<void>;
  logger: LoggerLike;
}): Promise<LuiePackageExportData | null> => {
  const {
    bundle,
    projectId,
    projectPath,
    localSnapshots,
    hydrateMissingWorldDocsFromPackage,
    logger,
  } = input;
  const project = bundle.projects.find((item) => item.id === projectId);
  if (!project || project.deletedAt) return null;

  const chapters = bundle.chapters
    .filter((item) => item.projectId === projectId && !item.deletedAt)
    .sort((left, right) => left.order - right.order);
  const characters = bundle.characters
    .filter((item) => item.projectId === projectId && !item.deletedAt)
    .map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description ?? undefined,
      firstAppearance: item.firstAppearance ?? undefined,
      attributes: item.attributes ?? undefined,
    }));
  const terms = bundle.terms
    .filter((item) => item.projectId === projectId && !item.deletedAt)
    .sort((left, right) => left.order - right.order)
    .map((item) => ({
      id: item.id,
      term: item.term,
      definition: item.definition ?? undefined,
      category: item.category ?? undefined,
      firstAppearance: item.firstAppearance ?? undefined,
    }));

  const worldDocs = new Map<WorldDocumentType, unknown>();
  const deletedWorldDocTypes = new Set<WorldDocumentType>();
  for (const doc of sortByUpdatedAtDesc(bundle.worldDocuments)) {
    if (doc.projectId !== projectId) continue;
    if (doc.deletedAt) {
      deletedWorldDocTypes.add(doc.docType as WorldDocumentType);
      continue;
    }
    if (worldDocs.has(doc.docType as WorldDocumentType)) continue;
    worldDocs.set(doc.docType as WorldDocumentType, doc.payload);
  }

  await hydrateMissingWorldDocsFromPackage(
    worldDocs,
    projectPath,
    deletedWorldDocTypes,
  );

  const memos = bundle.memos
    .filter((item) => item.projectId === projectId && !item.deletedAt)
    .map((item) => ({
      id: item.id,
      title: item.title,
      content: item.content,
      tags: item.tags,
      updatedAt: item.updatedAt,
    }));

  const snapshotList = localSnapshots.map((snapshot) => ({
    id: snapshot.id,
    chapterId: snapshot.chapterId ?? undefined,
    content: snapshot.content,
    description: snapshot.description ?? undefined,
    createdAt: snapshot.createdAt.toISOString(),
  }));

  const normalizedSynopsisPayload = normalizeSynopsisPayload(
    projectId,
    worldDocs.get("synopsis"),
    logger,
  );
  const normalizedPlotPayload = normalizePlotPayload(
    projectId,
    worldDocs.get("plot"),
    logger,
  );
  const normalizedDrawingPayload = normalizeDrawingPayload(
    projectId,
    worldDocs.get("drawing"),
    logger,
  );
  const normalizedMindmapPayload = normalizeMindmapPayload(
    projectId,
    worldDocs.get("mindmap"),
    logger,
  );
  const normalizedGraphPayload = normalizeGraphPayload(
    projectId,
    worldDocs.get("graph"),
    logger,
  );
  const normalizedScrapPayload = normalizeScrapPayload(
    projectId,
    worldDocs.get("scrap"),
    memos,
    project.updatedAt,
    logger,
  );

  const metaChapters = chapters.map((chapter) => ({
    id: chapter.id,
    title: chapter.title,
    order: chapter.order,
    file: `${LUIE_MANUSCRIPT_DIR}/${chapter.id}${MARKDOWN_EXTENSION}`,
    updatedAt: chapter.updatedAt,
  }));

  return {
    meta: {
      format: LUIE_PACKAGE_FORMAT,
      container: LUIE_PACKAGE_CONTAINER_DIR,
      version: LUIE_PACKAGE_VERSION,
      projectId: project.id,
      title: project.title,
      description: project.description ?? undefined,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      chapters: metaChapters,
    },
    chapters: chapters.map((chapter) => ({
      id: chapter.id,
      content: chapter.content,
    })),
    characters,
    terms,
    synopsis: normalizedSynopsisPayload,
    plot: normalizedPlotPayload,
    drawing: normalizedDrawingPayload,
    mindmap: normalizedMindmapPayload,
    graph: normalizedGraphPayload,
    memos: normalizedScrapPayload,
    memory: buildMemoryPayloadFromBundle(bundle, projectId),
    snapshots: snapshotList,
  };
};

export const persistBundleToLuiePackages = async (input: {
  bundle: SyncBundle;
  hydrateMissingWorldDocsFromPackage: (
    worldDocs: Map<WorldDocumentType, unknown>,
    projectPath: string,
    skippedDocTypes?: Set<WorldDocumentType>,
  ) => Promise<void>;
  buildProjectPackagePayload?: (args: {
    bundle: SyncBundle;
    projectId: string;
    projectPath: string;
    localSnapshots: SnapshotRecord[];
    hydrateMissingWorldDocsFromPackage: (
      worldDocs: Map<WorldDocumentType, unknown>,
      projectPath: string,
      skippedDocTypes?: Set<WorldDocumentType>,
    ) => Promise<void>;
    logger: LoggerLike;
  }) => Promise<LuiePackageExportData | null>;
  logger: LoggerLike;
}): Promise<PersistedLuiePackage[]> => {
  const { bundle, hydrateMissingWorldDocsFromPackage, logger } = input;
  const buildPayload =
    input.buildProjectPackagePayload ?? buildProjectPackagePayload;
  const failedProjects: string[] = [];
  const persistedProjects: PersistedLuiePackage[] = [];
  for (const project of bundle.projects) {
    const store = db.getClient();
    const [projRows, snapshotRows] = await Promise.all([
      store
        .select()
        .from(projectTable)
        .where(eq(projectTable.id, project.id))
        .limit(1),
      store
        .select({
          id: snapshotTable.id,
          chapterId: snapshotTable.chapterId,
          content: snapshotTable.content,
          description: snapshotTable.description,
          createdAt: snapshotTable.createdAt,
        })
        .from(snapshotTable)
        .where(eq(snapshotTable.projectId, project.id))
        .orderBy(desc(snapshotTable.createdAt)),
    ]);
    const projectRow = projRows[0] ?? null;
    const localProject = projectRow
      ? {
          ...projectRow,
          snapshots: snapshotRows.map((row) => ({
            ...row,
            createdAt: new Date(row.createdAt),
          })),
        }
      : null;
    const [, projectPath] = await Promise.all([
      Promise.resolve(localProject),
      getProjectAttachmentPath(project.id),
    ]);

    const normalizedProjectPath = toNullableString(projectPath);
    if (
      !normalizedProjectPath ||
      !normalizedProjectPath.toLowerCase().endsWith(LUIE_PACKAGE_EXTENSION)
    ) {
      continue;
    }
    let safeProjectPath: string;
    try {
      safeProjectPath = ensureSafeAbsolutePath(
        normalizedProjectPath,
        "projectPath",
      );
    } catch (error) {
      logger.warn("Skipping .luie persistence for invalid projectPath", {
        projectId: project.id,
        projectPath: normalizedProjectPath,
        error,
      });
      continue;
    }
    const payload = await buildPayload({
      bundle,
      projectId: project.id,
      projectPath: safeProjectPath,
      localSnapshots: localProject?.snapshots ?? [],
      hydrateMissingWorldDocsFromPackage,
      logger,
    });
    if (!payload) continue;

    try {
      await writeLuieContainer({
        targetPath: safeProjectPath,
        payload,
        logger,
      });
      persistedProjects.push({
        projectId: project.id,
        projectPath: safeProjectPath,
      });
    } catch (error) {
      failedProjects.push(project.id);
      logger.error("Failed to persist merged bundle into .luie package", {
        projectId: project.id,
        projectPath: safeProjectPath,
        error,
      });
    }
  }
  if (failedProjects.length > 0) {
    throw new Error(`SYNC_LUIE_PERSIST_FAILED:${failedProjects.join(",")}`);
  }
  return persistedProjects;
};

export const recoverDbCacheFromPersistedPackages = async (
  persistedPackages: PersistedLuiePackage[],
  logger: LoggerLike,
): Promise<string[]> => {
  if (persistedPackages.length === 0) return [];

  const failedProjectIds: string[] = [];
  for (const entry of persistedPackages) {
    try {
      await projectService.openLuieProject(entry.projectPath);
    } catch (error) {
      failedProjectIds.push(entry.projectId);
      logger.error("Failed to recover DB cache from persisted .luie package", {
        projectId: entry.projectId,
        projectPath: entry.projectPath,
        error,
      });
    }
  }
  return failedProjectIds;
};
