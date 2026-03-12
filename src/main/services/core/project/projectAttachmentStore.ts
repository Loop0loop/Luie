import type { Prisma } from "@prisma/client";
import { db } from "../../../database/index.js";

type ProjectAttachmentClient = {
  project: Prisma.TransactionClient["project"];
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

export const getProjectAttachmentPath = async (
  projectId: string,
  client?: ProjectAttachmentClient,
): Promise<string | null> => {
  const project = (await getClient(client).project.findUnique({
    where: { id: projectId },
    select: { projectPath: true },
  })) as { projectPath?: string | null } | null;

  return toNullableString(project?.projectPath);
};

export const setProjectAttachmentPath = async (
  projectId: string,
  projectPath: string | null,
  client?: ProjectAttachmentClient,
): Promise<void> => {
  await getClient(client).project.update({
    where: { id: projectId },
    data: { projectPath },
  });
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

  const rows = (await getClient(client).project.findMany({
    where: {
      id: { in: projects.map((project) => project.id) },
    },
    select: {
      id: true,
      projectPath: true,
    },
  })) as Array<{ id: string; projectPath?: string | null }>;

  const pathByProjectId = new Map(
    rows.map((row) => [String(row.id), toNullableString(row.projectPath)]),
  );

  return projects.map((project) => ({
    ...project,
    projectPath: pathByProjectId.get(project.id) ?? null,
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

  return rows.map((row) => ({
    id: String(row.id),
    title: typeof row.title === "string" ? row.title : "",
    projectPath: toNullableString(row.projectPath),
    updatedAt: row.updatedAt,
  }));
};

export const findProjectByAttachmentPath = async (
  projectPath: string,
  client?: ProjectAttachmentClient,
): Promise<ProjectAttachmentEntry | null> => {
  const row = (await getClient(client).project.findFirst({
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
