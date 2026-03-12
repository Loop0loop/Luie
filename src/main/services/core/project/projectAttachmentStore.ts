import path from "node:path";
import type { Prisma } from "@prisma/client";
import { db } from "../../../database/index.js";
import { ensureSafeAbsolutePath } from "../../../utils/pathValidation.js";

type ProjectAttachmentClient = {
  project: Prisma.TransactionClient["project"];
  projectAttachment: Prisma.TransactionClient["projectAttachment"];
};

export type ProjectAttachmentEntry = {
  id: string;
  title: string;
  projectPath: string | null;
  updatedAt: Date;
};

const getClient = (client?: ProjectAttachmentClient): ProjectAttachmentClient =>
  client ?? (db.getClient() as unknown as ProjectAttachmentClient);

const toNullableString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value : null;

const toProjectPathKey = (projectPath: string): string => {
  const resolved = path.resolve(projectPath);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
};

const getLegacyProjectAttachmentPath = async (
  projectId: string,
  client?: ProjectAttachmentClient,
): Promise<string | null> => {
  const project = (await getClient(client).project.findUnique({
    where: { id: projectId },
    select: { projectPath: true },
  })) as { projectPath?: string | null } | null;

  return toNullableString(project?.projectPath);
};

const getLegacyProjectAttachmentMap = async (
  projectIds: string[],
  client?: ProjectAttachmentClient,
): Promise<Map<string, string | null>> => {
  const rows = (await getClient(client).project.findMany({
    where: {
      id: { in: projectIds },
    },
    select: {
      id: true,
      projectPath: true,
    },
  })) as Array<{ id: string; projectPath?: string | null }>;

  return new Map(
    rows.map((row) => [String(row.id), toNullableString(row.projectPath)]),
  );
};

const getAttachmentPathMap = async (
  projectIds: string[],
  client?: ProjectAttachmentClient,
): Promise<Map<string, string | null>> => {
  const rows = (await getClient(client).projectAttachment.findMany({
    where: {
      projectId: { in: projectIds },
    },
    select: {
      projectId: true,
      projectPath: true,
    },
  })) as Array<{ projectId: string; projectPath?: string | null }>;

  return new Map(
    rows.map((row) => [String(row.projectId), toNullableString(row.projectPath)]),
  );
};

const clearLegacyProjectPathIfPresent = async (
  projectId: string,
  client?: ProjectAttachmentClient,
): Promise<void> => {
  const currentLegacyPath = await getLegacyProjectAttachmentPath(projectId, client);
  if (currentLegacyPath === null) {
    return;
  }

  await getClient(client).project.update({
    where: { id: projectId },
    data: { projectPath: null },
  });
};

export const getProjectAttachmentPath = async (
  projectId: string,
  client?: ProjectAttachmentClient,
): Promise<string | null> => {
  const attachment = (await getClient(client).projectAttachment.findUnique({
    where: { projectId },
    select: { projectPath: true },
  })) as { projectPath?: string | null } | null;

  if (attachment) {
    return toNullableString(attachment.projectPath);
  }

  return await getLegacyProjectAttachmentPath(projectId, client);
};

export const migrateLegacyProjectAttachments = async (
  client?: ProjectAttachmentClient,
): Promise<{
  migratedRecords: number;
  clearedLegacyRecords: number;
  skippedInvalidRecords: number;
}> => {
  const store = getClient(client);
  const [projects, existingAttachments] = await Promise.all([
    store.project.findMany({
      select: {
        id: true,
        projectPath: true,
        updatedAt: true,
      },
    }),
    store.projectAttachment.findMany({
      select: {
        projectId: true,
        projectPath: true,
      },
    }),
  ]) as [
    Array<{ id: string; projectPath?: string | null; updatedAt: Date }>,
    Array<{ projectId: string; projectPath?: string | null }>,
  ];

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
    (left, right) => right.updatedAt.getTime() - left.updatedAt.getTime(),
  );

  for (const row of legacyRows) {
    const legacyPath = toNullableString(row.projectPath);
    if (!legacyPath) {
      continue;
    }

    if (projectsWithAttachment.has(String(row.id))) {
      await store.project.update({
        where: { id: String(row.id) },
        data: { projectPath: null },
      });
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

    await store.projectAttachment.upsert({
      where: { projectId: String(row.id) },
      create: {
        projectId: String(row.id),
        projectPath: safeProjectPath,
      },
      update: {
        projectPath: safeProjectPath,
      },
    });
    await store.project.update({
      where: { id: String(row.id) },
      data: { projectPath: null },
    });

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
  client?: ProjectAttachmentClient,
): Promise<void> => {
  const store = getClient(client);
  const normalizedProjectPath = toNullableString(projectPath);

  if (normalizedProjectPath) {
    await store.projectAttachment.upsert({
      where: { projectId },
      create: {
        projectId,
        projectPath: normalizedProjectPath,
      },
      update: {
        projectPath: normalizedProjectPath,
      },
    });
  } else {
    await store.projectAttachment.deleteMany({
      where: { projectId },
    });
  }

  await clearLegacyProjectPathIfPresent(projectId, client);
};

export const hydrateProjectsWithAttachmentPaths = async <
  T extends { id: string },
>(
  projects: T[],
  client?: ProjectAttachmentClient,
): Promise<Array<T & { projectPath: string | null }>> => {
  if (projects.length === 0) {
    return [];
  }

  const projectIds = projects.map((project) => project.id);
  const [attachmentPathByProjectId, legacyPathByProjectId] = await Promise.all([
    getAttachmentPathMap(projectIds, client),
    getLegacyProjectAttachmentMap(projectIds, client),
  ]);

  return projects.map((project) => ({
    ...project,
    projectPath: attachmentPathByProjectId.has(project.id)
      ? (attachmentPathByProjectId.get(project.id) ?? null)
      : (legacyPathByProjectId.get(project.id) ?? null),
  }));
};

export const listProjectAttachmentEntries = async (
  client?: ProjectAttachmentClient,
): Promise<ProjectAttachmentEntry[]> => {
  const rows = (await getClient(client).project.findMany({
    select: {
      id: true,
      title: true,
      projectPath: true,
      updatedAt: true,
    },
  })) as Array<{
    id: string;
    title?: string | null;
    projectPath?: string | null;
    updatedAt: Date;
  }>;

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
    updatedAt: row.updatedAt,
  }));
};

export const findProjectByAttachmentPath = async (
  projectPath: string,
  client?: ProjectAttachmentClient,
): Promise<ProjectAttachmentEntry | null> => {
  const store = getClient(client);
  const attachment = (await store.projectAttachment.findFirst({
    where: { projectPath },
    select: {
      projectId: true,
      projectPath: true,
    },
  })) as {
    projectId: string;
    projectPath?: string | null;
  } | null;

  if (attachment) {
    const project = (await store.project.findUnique({
      where: { id: attachment.projectId },
      select: {
        id: true,
        title: true,
        updatedAt: true,
      },
    })) as {
      id: string;
      title?: string | null;
      updatedAt: Date;
    } | null;

    if (!project) {
      return null;
    }

    return {
      id: String(project.id),
      title: typeof project.title === "string" ? project.title : "",
      projectPath: toNullableString(attachment.projectPath),
      updatedAt: project.updatedAt,
    };
  }

  const row = (await store.project.findFirst({
    where: { projectPath },
    select: {
      id: true,
      title: true,
      projectPath: true,
      updatedAt: true,
    },
  })) as {
    id: string;
    title?: string | null;
    projectPath?: string | null;
    updatedAt: Date;
  } | null;

  if (!row) {
    return null;
  }

  return {
    id: String(row.id),
    title: typeof row.title === "string" ? row.title : "",
    projectPath: toNullableString(row.projectPath),
    updatedAt: row.updatedAt,
  };
};
