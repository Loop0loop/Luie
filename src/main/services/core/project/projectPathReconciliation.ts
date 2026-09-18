import path from "path";
import { createLogger } from "../../../../shared/logger/index.js";
import { ensureSafeAbsolutePath } from "../../../utils/fs/index.js";
import {
  listProjectAttachmentEntries,
  migrateLegacyProjectAttachments,
  setProjectAttachmentPath,
} from "./projectAttachmentStore.js";

const logger = createLogger("ProjectPathReconciliation");

const toProjectPathKey = (projectPath: string): string => {
  const resolved = path.resolve(projectPath);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
};

export const collectDuplicateProjectPathGroups = (
  projects: Array<{
    id: string;
    projectPath: string | null;
    updatedAt: unknown;
  }>,
): Array<Array<{ id: string; projectPath: string; updatedAt: Date }>> => {
  const groups = new Map<
    string,
    Array<{ id: string; projectPath: string; updatedAt: Date }>
  >();

  for (const project of projects) {
    if (
      typeof project.projectPath !== "string" ||
      project.projectPath.length === 0
    ) {
      continue;
    }

    try {
      const safePath = ensureSafeAbsolutePath(
        project.projectPath,
        "projectPath",
      );
      const key = toProjectPathKey(safePath);
      const bucket = groups.get(key) ?? [];
      bucket.push({
        id: String(project.id),
        projectPath: safePath,
        updatedAt:
          project.updatedAt instanceof Date
            ? project.updatedAt
            : new Date(String(project.updatedAt)),
      });
      groups.set(key, bucket);
    } catch {
      continue;
    }
  }

  return Array.from(groups.values()).filter((entries) => entries.length > 1);
};

export async function reconcileProjectPathDuplicates(): Promise<{
  duplicateGroups: number;
  clearedRecords: number;
  migratedRecords: number;
  skippedInvalidRecords: number;
}> {
  const migration = await migrateLegacyProjectAttachments();
  const projects = (await listProjectAttachmentEntries()).filter(
    (project) => project.projectPath !== null,
  );
  const duplicateGroupsToReconcile = collectDuplicateProjectPathGroups(
    projects.map((project) => ({
      id: String(project.id),
      projectPath: project.projectPath,
      updatedAt: project.updatedAt,
    })),
  );
  const reconciliationResults = await Promise.all(
    duplicateGroupsToReconcile.map(async (entries) => {
      const sorted = [...entries].sort(
        (left, right) => right.updatedAt.getTime() - left.updatedAt.getTime(),
      );
      const keep = sorted[0];
      const stale = sorted.slice(1);
      await Promise.all(
        stale.map(async (item) => {
          await setProjectAttachmentPath(item.id, null);
          logger.warn("Cleared duplicate projectPath from stale record", {
            keepProjectId: keep.id,
            staleProjectId: item.id,
            projectPath: item.projectPath,
          });
        }),
      );
      return stale.length;
    }),
  );
  const duplicateGroups = duplicateGroupsToReconcile.length;
  const clearedRecords = reconciliationResults.reduce(
    (total, count) => total + count,
    0,
  );

  if (duplicateGroups > 0) {
    logger.info("Project path duplicate reconciliation completed", {
      duplicateGroups,
      clearedRecords,
    });
  }
  if (migration.migratedRecords > 0 || migration.clearedLegacyRecords > 0) {
    logger.info("Legacy project attachment migration completed", migration);
  }
  return {
    duplicateGroups,
    clearedRecords,
    migratedRecords: migration.migratedRecords,
    skippedInvalidRecords: migration.skippedInvalidRecords,
  };
}
