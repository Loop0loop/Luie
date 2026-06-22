import { eq } from "drizzle-orm";
import { db } from "../../../infra/database/index.js";
import * as schema from "../../../infra/database/index.js";
import {
  ErrorCode,
  DEFAULT_PROJECT_AUTO_SAVE_INTERVAL_SECONDS,
} from "../../../../shared/constants/index.js";
import type {
  ProjectCreateInput,
  ProjectUpdateInput,
} from "../../../../shared/types/index.js";
import { ServiceError } from "../../../utils/error/index.js";
import {
  findProjectPathConflict,
  normalizeProjectPath,
  renameSnapshotDirectoryForProjectTitleChange,
} from "./projectPathPolicy.js";
import {
  getProjectAttachmentPath,
  setProjectAttachmentPath,
} from "./projectAttachmentStore.js";

type LoggerLike = {
  info: (message: string, context?: unknown) => void;
  warn: (message: string, context?: unknown) => void;
  error: (message: string, context?: unknown) => void;
};

type MutationHooks = {
  schedulePackageExport: (projectId: string, reason: string) => void;
  logger: LoggerLike;
};

export const createProjectRecord = async (
  input: ProjectCreateInput,
  hooks: MutationHooks,
) => {
  try {
    hooks.logger.info("Creating project", input);
    const projectPath = normalizeProjectPath(input.projectPath);
    if (projectPath) {
      const conflict = await findProjectPathConflict(projectPath);
      if (conflict) {
        throw new ServiceError(
          ErrorCode.VALIDATION_FAILED,
          "Project path is already registered",
          { projectPath, conflictProjectId: conflict.id },
        );
      }
    }

    const store = db.getClient();
    const now = new Date().toISOString();
    const projectRows = await store.insert(schema.project).values({
      id: crypto.randomUUID(),
      title: input.title,
      description: input.description ?? null,
      createdAt: now,
      updatedAt: now,
    }).returning();

    const created = projectRows[0];

    await store.insert(schema.projectSettings).values({
      id: created.id,
      projectId: created.id,
      autoSave: true,
      autoSaveInterval: DEFAULT_PROJECT_AUTO_SAVE_INTERVAL_SECONDS,
    });

    const projectId = String(created.id);
    if (projectPath !== undefined) {
      await setProjectAttachmentPath(projectId, projectPath);
    }
    hooks.logger.info("Project created successfully", { projectId });
    hooks.schedulePackageExport(projectId, "project:create");
    return {
      ...created,
      projectPath: projectPath ?? null,
    };
  } catch (error) {
    hooks.logger.error("Failed to create project", {
      input,
      error,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    if (error instanceof ServiceError) throw error;
    throw new ServiceError(
      ErrorCode.PROJECT_CREATE_FAILED,
      "Failed to create project",
      { input },
      error,
    );
  }
};

export const updateProjectRecord = async (
  input: ProjectUpdateInput,
  hooks: MutationHooks,
) => {
  try {
    const normalizedProjectPath =
      input.projectPath === undefined
        ? undefined
        : (normalizeProjectPath(input.projectPath) ?? null);
    if (normalizedProjectPath) {
      const conflict = await findProjectPathConflict(
        normalizedProjectPath,
        input.id,
      );
      if (conflict) {
        throw new ServiceError(
          ErrorCode.VALIDATION_FAILED,
          "Project path is already registered",
          {
            projectPath: normalizedProjectPath,
            conflictProjectId: conflict.id,
            projectId: input.id,
          },
        );
      }
    }

    const [currentRows, currentProjectPath] = await Promise.all([
      db.getClient()
        .select({ title: schema.project.title })
        .from(schema.project)
        .where(eq(schema.project.id, input.id))
        .limit(1),
      getProjectAttachmentPath(input.id),
    ]);

    const current = currentRows.length > 0 ? currentRows[0] : null;
    const now = new Date().toISOString();
    const projectRows = await db.getClient()
      .update(schema.project)
      .set({
        title: input.title,
        description: input.description,
        updatedAt: now,
      })
      .where(eq(schema.project.id, input.id))
      .returning();

    const project = projectRows[0];
    const nextProjectPath =
      normalizedProjectPath === undefined
        ? currentProjectPath
        : normalizedProjectPath;
    if (normalizedProjectPath !== undefined) {
      await setProjectAttachmentPath(input.id, normalizedProjectPath);
    }

    const prevTitle = typeof current?.title === "string" ? current.title : "";
    const nextTitle = typeof project.title === "string" ? project.title : "";
    await renameSnapshotDirectoryForProjectTitleChange({
      projectId: String(project.id),
      projectPath: nextProjectPath ?? null,
      previousTitle: prevTitle,
      nextTitle,
      logger: hooks.logger,
    });

    const projectId = String(project.id);
    hooks.logger.info("Project updated successfully", { projectId });
    hooks.schedulePackageExport(projectId, "project:update");
    return {
      ...project,
      projectPath: nextProjectPath ?? null,
    };
  } catch (error) {
    hooks.logger.error("Failed to update project", error);
    if (error instanceof ServiceError) throw error;
    throw new ServiceError(
      ErrorCode.PROJECT_UPDATE_FAILED,
      "Failed to update project",
      { input },
      error,
    );
  }
};
