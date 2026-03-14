import type { Prisma } from "@prisma/client";
import { db } from "../../../database/index.js";

type ProjectLocalStateClient = {
  projectLocalState: Prisma.TransactionClient["projectLocalState"];
};

const getClient = (
  client?: ProjectLocalStateClient,
): ProjectLocalStateClient =>
  client ?? (db.getClient() as unknown as ProjectLocalStateClient);

const toDateOrNull = (value: unknown): Date | null => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === "string" && value.length > 0) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
};

const toTimestamp = (value: unknown): number => {
  const date = toDateOrNull(value);
  return date ? date.getTime() : 0;
};

export const getProjectLastOpenedAt = async (
  projectId: string,
  client?: ProjectLocalStateClient,
): Promise<Date | null> => {
  const row = (await getClient(client).projectLocalState.findUnique({
    where: { projectId },
    select: { lastOpenedAt: true },
  })) as { lastOpenedAt?: Date | string | null } | null;

  return toDateOrNull(row?.lastOpenedAt);
};

export const markProjectOpened = async (
  projectId: string,
  openedAt = new Date(),
  client?: ProjectLocalStateClient,
): Promise<Date> => {
  const timestamp = new Date(openedAt);
  await getClient(client).projectLocalState.upsert({
    where: { projectId },
    create: {
      projectId,
      lastOpenedAt: timestamp,
    },
    update: {
      lastOpenedAt: timestamp,
    },
  });
  return timestamp;
};

export const hydrateProjectsWithLocalState = async <
  T extends { id: string },
>(
  projects: T[],
  client?: ProjectLocalStateClient,
): Promise<Array<T & { lastOpenedAt: Date | null }>> => {
  if (projects.length === 0) {
    return [];
  }

  const rows = (await getClient(client).projectLocalState.findMany({
    where: {
      projectId: { in: projects.map((project) => project.id) },
    },
    select: {
      projectId: true,
      lastOpenedAt: true,
    },
  })) as Array<{
    projectId: string;
    lastOpenedAt?: Date | string | null;
  }>;

  const lastOpenedAtByProjectId = new Map(
    rows.map((row) => [
      String(row.projectId),
      toDateOrNull(row.lastOpenedAt),
    ]),
  );

  return projects.map((project) => ({
    ...project,
    lastOpenedAt: lastOpenedAtByProjectId.get(project.id) ?? null,
  }));
};

export const sortProjectsByRecentLocalState = <
  T extends { updatedAt: Date | string; lastOpenedAt?: Date | string | null },
>(
  projects: T[],
): T[] => {
  return [...projects].sort((left, right) => {
    const leftRecent = toTimestamp(left.lastOpenedAt);
    const rightRecent = toTimestamp(right.lastOpenedAt);
    if (leftRecent !== rightRecent) {
      return rightRecent - leftRecent;
    }

    return toTimestamp(right.updatedAt) - toTimestamp(left.updatedAt);
  });
};
