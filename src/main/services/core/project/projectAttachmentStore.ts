import path from "node:path";
import { eq, inArray } from "drizzle-orm";
import { db } from "../../../database/index.js";
import * as schema from "../../../database/schema.js";
import type { MainDrizzleClient, DbLike } from "../../../database/databaseTypes.js";
import { ensureSafeAbsolutePath } from "../../../utils/pathValidation.js";

const { project, projectAttachment } = schema;

export type ProjectAttachmentEntry = {
  id: string;
  title: string;
  projectPath: string | null;
  updatedAt: Date;
};

const getClient = (client?: MainDrizzleClient): MainDrizzleClient =>
  client ?? db.getDrizzleClient();

const toNullableString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value : null;

const toProjectPathKey = (projectPath: string): string => {
  const resolved = path.resolve(projectPath);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
};

const getLegacyProjectAttachmentPath = async (
  projectId: string,
  client?: MainDrizzleClient,
): Promise<string | null> => {
  const rows = await getClient(client)
    .select({ projectPath: project.projectPath })
    .from(project)
    .where(eq(project.id, projectId))
    .limit(1);

  return rows.length > 0 ? toNullableString(rows[0].projectPath) : null;
};

const getLegacyProjectAttachmentMap = async (
  projectIds: string[],
  client?: MainDrizzleClient,
): Promise<Map<string, string | null>> => {
  const rows = await getClient(client)
    .select({ id: project.id, projectPath: project.projectPath })
    .from(project)
    .where(inArray(project.id, projectIds));

  return new Map(
    rows.map((row) => [String(row.id), toNullableString(row.projectPath)]),
  );
};

const getAttachmentPathMap = async (
  projectIds: string[],
  client?: MainDrizzleClient,
): Promise<Map<string, string | null>> => {
  const rows = await getClient(client)
    .select({
      projectId: projectAttachment.projectId,
      projectPath: projectAttachment.projectPath,
    })
    .from(projectAttachment)
    .where(inArray(projectAttachment.projectId, projectIds));

  return new Map(
    rows.map((row) => [String(row.projectId), toNullableString(row.projectPath)]),
  );
};

const clearLegacyProjectPathIfPresent = async (
  projectId: string,
  client?: DbLike,
): Promise<void> => {
  const currentLegacyPath = await getLegacyProjectAttachmentPath(projectId, client as MainDrizzleClient);
  if (currentLegacyPath === null) {
    return;
  }

  await (client ?? db.getDrizzleClient())
    .update(project)
    .set({ projectPath: null })
    .where(eq(project.id, projectId));
};

export const getProjectAttachmentPath = async (
  projectId: string,
  client?: MainDrizzleClient,
): Promise<string | null> => {
  const rows = await getClient(client)
    .select({ projectPath: projectAttachment.projectPath })
    .from(projectAttachment)
    .where(eq(projectAttachment.projectId, projectId))
    .limit(1);

  if (rows.length > 0) {
    return toNullableString(rows[0].projectPath);
  }

  return await getLegacyProjectAttachmentPath(projectId, client);
};

export const migrateLegacyProjectAttachments = async (
  client?: MainDrizzleClient,
): Promise<{
  migratedRecords: number;
  clearedLegacyRecords: number;
  skippedInvalidRecords: number;
}> => {
  const store = getClient(client);
  const [projects, existingAttachments] = await Promise.all([
    store
      .select({ id: project.id, projectPath: project.projectPath, updatedAt: project.updatedAt })
      .from(project),
    store
      .select({ projectId: projectAttachment.projectId, projectPath: projectAttachment.projectPath })
      .from(projectAttachment),
  ]);

  const claimedPathKeys = new Map<string, string>();
  const projectsWithAttachment = new Set<string>();

  for (const attachment of existingAttachments) {
    projectsWithAttachment.add(String(attachment.projectId));
    const attachmentPath = toNullableString(attachment.projectPath);
    if (!attachmentPath) {
      continue;
    }

    try {
      const safeProjectPath = ensureSafeAbsolutePath(attachmentPath, "projectPath");
      claimedPathKeys.set(
        toProjectPathKey(safeProjectPath),
        String(attachment.projectId),
      );
    } catch {
      continue;
    }
  }

  let migratedRecords = 0;
  let clearedLegacyRecords = 0;
  let skippedInvalidRecords = 0;

  const legacyRows = [...projects].sort(
    (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
  );

  for (const row of legacyRows) {
    const legacyPath = toNullableString(row.projectPath);
    if (!legacyPath) {
      continue;
    }

    if (projectsWithAttachment.has(String(row.id))) {
      await store
        .update(project)
        .set({ projectPath: null })
        .where(eq(project.id, String(row.id)));
      clearedLegacyRecords += 1;
      continue;
    }

    let safeProjectPath: string;
    try {
      safeProjectPath = ensureSafeAbsolutePath(legacyPath, "projectPath");
    } catch {
      skippedInvalidRecords += 1;
      continue;
    }

    const pathKey = toProjectPathKey(safeProjectPath);
    const claimedByProjectId = claimedPathKeys.get(pathKey);
    if (claimedByProjectId && claimedByProjectId !== String(row.id)) {
      continue;
    }

    const now = new Date().toISOString();
    await store.insert(projectAttachment).values({
      projectId: String(row.id),
      projectPath: safeProjectPath,
      updatedAt: now,
    }).onConflictDoUpdate({
      target: projectAttachment.projectId,
      set: {
        projectPath: safeProjectPath,
        updatedAt: now,
      },
    });
    await store
      .update(project)
      .set({ projectPath: null })
      .where(eq(project.id, String(row.id)));

    claimedPathKeys.set(pathKey, String(row.id));
    projectsWithAttachment.add(String(row.id));
    migratedRecords += 1;
    clearedLegacyRecords += 1;
  }

  return {
    migratedRecords,
    clearedLegacyRecords,
    skippedInvalidRecords,
  };
};

export const setProjectAttachmentPath = async (
  projectId: string,
  projectPath: string | null,
  client?: DbLike,
): Promise<void> => {
  const store = client ?? db.getDrizzleClient();
  const normalizedProjectPath = toNullableString(projectPath);

  if (normalizedProjectPath) {
    const now = new Date().toISOString();
    await store.insert(projectAttachment).values({
      projectId,
      projectPath: normalizedProjectPath,
      updatedAt: now,
    }).onConflictDoUpdate({
      target: projectAttachment.projectId,
      set: {
        projectPath: normalizedProjectPath,
        updatedAt: now,
      },
    });
  } else {
    await store
      .delete(projectAttachment)
      .where(eq(projectAttachment.projectId, projectId));
  }

  await clearLegacyProjectPathIfPresent(projectId, client);
};

export const hydrateProjectsWithAttachmentPaths = async <
  T extends { id: string },
>(
  projects: T[],
  client?: MainDrizzleClient,
): Promise<Array<T & { projectPath: string | null }>> => {
  if (projects.length === 0) {
    return [];
  }

  const projectIds = projects.map((project) => project.id);
  const [attachmentPathByProjectId, legacyPathByProjectId] = await Promise.all([
    getAttachmentPathMap(projectIds, client),
    getLegacyProjectAttachmentMap(projectIds, client),
  ]);

  return projects.map((p) => ({
    ...p,
    projectPath: attachmentPathByProjectId.has(p.id)
      ? (attachmentPathByProjectId.get(p.id) ?? null)
      : (legacyPathByProjectId.get(p.id) ?? null),
  }));
};

export const listProjectAttachmentEntries = async (
  client?: MainDrizzleClient,
): Promise<ProjectAttachmentEntry[]> => {
  const store = getClient(client);
  const rows = await store
    .select({
      id: project.id,
      title: project.title,
      projectPath: project.projectPath,
      updatedAt: project.updatedAt,
    })
    .from(project);

  const attachmentPathByProjectId = await getAttachmentPathMap(
    rows.map((row) => String(row.id)),
    client,
  );

  return rows.map((row) => ({
    id: String(row.id),
    title: typeof row.title === "string" ? row.title : "",
    projectPath: attachmentPathByProjectId.has(String(row.id))
      ? (attachmentPathByProjectId.get(String(row.id)) ?? null)
      : toNullableString(row.projectPath),
    updatedAt: new Date(row.updatedAt),
  }));
};

export const findProjectByAttachmentPath = async (
  projectPath: string,
  client?: MainDrizzleClient,
): Promise<ProjectAttachmentEntry | null> => {
  const store = getClient(client);
  const attachment = await store
    .select({
      projectId: projectAttachment.projectId,
      projectPath: projectAttachment.projectPath,
    })
    .from(projectAttachment)
    .where(eq(projectAttachment.projectPath, projectPath))
    .limit(1);

  if (attachment.length > 0) {
    const att = attachment[0];
    const projRows = await store
      .select({
        id: project.id,
        title: project.title,
        updatedAt: project.updatedAt,
      })
      .from(project)
      .where(eq(project.id, att.projectId))
      .limit(1);

    if (projRows.length === 0) {
      return null;
    }

    const proj = projRows[0];
    return {
      id: String(proj.id),
      title: typeof proj.title === "string" ? proj.title : "",
      projectPath: toNullableString(att.projectPath),
      updatedAt: new Date(proj.updatedAt),
    };
  }

  const row = await store
    .select({
      id: project.id,
      title: project.title,
      projectPath: project.projectPath,
      updatedAt: project.updatedAt,
    })
    .from(project)
    .where(eq(project.projectPath, projectPath))
    .limit(1);

  if (row.length === 0) {
    return null;
  }

  const r = row[0];
  return {
    id: String(r.id),
    title: typeof r.title === "string" ? r.title : "",
    projectPath: toNullableString(r.projectPath),
    updatedAt: new Date(r.updatedAt),
  };
};
