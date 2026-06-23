import { eq, inArray } from "drizzle-orm";
import { db } from "../../../infra/database/index.js";
import * as schema from "../../../infra/database/index.js";
import type { MainDrizzleClient } from "../../../infra/database/index.js";

const { projectLocalState } = schema;

const getClient = (
  client?: MainDrizzleClient,
): MainDrizzleClient =>
  client ?? db.getClient();

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
  client?: MainDrizzleClient,
): Promise<Date | null> => {
  const row = await getClient(client)
    .select({ lastOpenedAt: projectLocalState.lastOpenedAt })
    .from(projectLocalState)
    .where(eq(projectLocalState.projectId, projectId))
    .limit(1);

  return row.length > 0 ? toDateOrNull(row[0].lastOpenedAt) : null;
};

export const markProjectOpened = async (
  projectId: string,
  openedAt = new Date(),
  client?: MainDrizzleClient,
): Promise<Date> => {
  const timestamp = new Date(openedAt);
  const store = getClient(client);
  await store.insert(projectLocalState).values({
    projectId,
    lastOpenedAt: timestamp.toISOString(),
    updatedAt: timestamp.toISOString(),
  }).onConflictDoUpdate({
    target: projectLocalState.projectId,
    set: {
      lastOpenedAt: timestamp.toISOString(),
      updatedAt: timestamp.toISOString(),
    },
  });
  return timestamp;
};

export const hydrateProjectsWithLocalState = async <
  T extends { id: string },
>(
  projects: T[],
  client?: MainDrizzleClient,
): Promise<Array<T & { lastOpenedAt: Date | null }>> => {
  if (projects.length === 0) {
    return [];
  }

  const projectIds = projects.map((project) => project.id);
  const rows = await getClient(client)
    .select({
      projectId: projectLocalState.projectId,
      lastOpenedAt: projectLocalState.lastOpenedAt,
    })
    .from(projectLocalState)
    .where(inArray(projectLocalState.projectId, projectIds));

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
