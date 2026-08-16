import { and, eq, gt, isNotNull, sql } from "drizzle-orm";
import { ErrorCode } from "../../../../shared/constants/index.js";
import { db } from "../../../database/index.js";
import type { DbLike } from "../../../database/runtime/index.js";
import { project, projectAttachment } from "../../../database/schema/index.js";
import { ServiceError } from "../../../utils/error/index.js";

const clientOrDefault = (client?: DbLike): DbLike => client ?? db.getClient();

export function bumpProjectRevision(
  client: DbLike,
  projectId: string,
  nowIso: string,
): number {
  const updated = client
    .update(project)
    .set({ revision: sql`${project.revision} + 1`, updatedAt: nowIso })
    .where(eq(project.id, projectId))
    .returning({ revision: project.revision })
    .get();
  if (!updated) {
    throw new ServiceError(ErrorCode.PROJECT_NOT_FOUND, "Project not found", {
      projectId,
    });
  }
  return updated.revision;
}

export function touchProjectUpdatedAt(
  client: DbLike,
  projectId: string,
  nowIso: string,
): void {
  const updated = client
    .update(project)
    .set({ updatedAt: nowIso })
    .where(eq(project.id, projectId))
    .returning({ id: project.id })
    .get();
  if (!updated) {
    throw new ServiceError(ErrorCode.PROJECT_NOT_FOUND, "Project not found", {
      projectId,
    });
  }
}

export async function getProjectRevisionState(
  projectId: string,
  client?: DbLike,
): Promise<{ revision: number; exportedRevision: number }> {
  const rows = await clientOrDefault(client)
    .select({
      revision: project.revision,
      exportedRevision: projectAttachment.exportedRevision,
    })
    .from(project)
    .leftJoin(
      projectAttachment,
      eq(projectAttachment.projectId, project.id),
    )
    .where(eq(project.id, projectId))
    .limit(1);
  const row = rows[0];
  if (!row) {
    throw new ServiceError(ErrorCode.PROJECT_NOT_FOUND, "Project not found", {
      projectId,
    });
  }
  return {
    revision: row.revision,
    exportedRevision: row.exportedRevision ?? 0,
  };
}

export async function markProjectExported(
  projectId: string,
  revision: number,
  client?: DbLike,
): Promise<void> {
  const store = clientOrDefault(client);
  const current = await getProjectRevisionState(projectId, store);
  if (
    revision > current.revision ||
    revision < current.exportedRevision
  ) {
    throw new ServiceError(
      ErrorCode.VALIDATION_FAILED,
      "Invalid exported project revision",
      { projectId, attemptedRevision: revision, ...current },
    );
  }

  const updated = store
    .update(projectAttachment)
    .set({ exportedRevision: revision, updatedAt: new Date().toISOString() })
    .where(eq(projectAttachment.projectId, projectId))
    .returning({ projectId: projectAttachment.projectId })
    .get();
  if (!updated) {
    throw new ServiceError(
      ErrorCode.PROJECT_NOT_FOUND,
      "Project attachment not found",
      { projectId },
    );
  }
}

export async function listProjectsNeedingExport(
  client?: DbLike,
): Promise<string[]> {
  const rows = await clientOrDefault(client)
    .select({ projectId: project.id })
    .from(project)
    .innerJoin(
      projectAttachment,
      eq(projectAttachment.projectId, project.id),
    )
    .where(
      and(
        isNotNull(projectAttachment.projectPath),
        gt(project.revision, projectAttachment.exportedRevision),
      ),
    );
  return rows.map((row) => row.projectId);
}
