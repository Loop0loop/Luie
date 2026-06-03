import { eq } from "drizzle-orm";
import { db } from "../../../infra/database/index.js";
import { project } from "../../../infra/database/index.js";
import {
  ErrorCode,
  LUIE_PACKAGE_META_FILENAME,
} from "../../../../shared/constants/index.js";
import { ServiceError } from "../../../utils/serviceError.js";
import {
  getProjectAttachmentPath,
  setProjectAttachmentPath,
} from "./projectAttachmentStore.js";
import {
  findProjectPathConflict,
  normalizeLuiePackagePath,
} from "./projectPathPolicy.js";
import { readLuieContainerEntry } from "../../io/luieContainer.js";
import { LuieMetaSchema } from "./projectLuieSchemas.js";

type LoggerLike = {
  info: (message: string, context?: unknown) => void;
  error: (message: string, context?: unknown) => void;
};

type AttachmentHooks<TProject> = {
  exportProjectPackageWithOptions: (
    projectId: string,
    options: {
      targetPath?: string;
      worldSourcePath?: string | null;
    },
  ) => Promise<boolean>;
  getProjectWithAttachmentStatus: (projectId: string) => Promise<TProject>;
  logger: LoggerLike;
};

const ensureExistingProject = async (
  projectId: string,
): Promise<void> => {
  const rows = await db.getClient()
    .select({ id: project.id })
    .from(project)
    .where(eq(project.id, projectId))
    .limit(1);
  const existing = rows.length > 0 ? rows[0] : null;

  if (!existing?.id) {
    throw new ServiceError(
      ErrorCode.PROJECT_NOT_FOUND,
      "Project not found",
      { id: projectId },
    );
  }
};

const readLuieMetaForAttachment = async (
  packagePath: string,
  logger: LoggerLike,
) => {
  let raw: string | null;
  try {
    raw = await readLuieContainerEntry(
      packagePath,
      LUIE_PACKAGE_META_FILENAME,
      logger,
    );
  } catch (error) {
    if (error instanceof ServiceError) throw error;
    throw new ServiceError(
      ErrorCode.FS_READ_FAILED,
      "Failed to read .luie package meta",
      { packagePath },
      error,
    );
  }

  if (!raw) {
    throw new ServiceError(
      ErrorCode.VALIDATION_FAILED,
      "Selected .luie package is missing meta",
      { packagePath },
    );
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch (error) {
    throw new ServiceError(
      ErrorCode.VALIDATION_FAILED,
      "Selected .luie package has invalid meta JSON",
      { packagePath },
      error,
    );
  }

  const parsed = LuieMetaSchema.safeParse(parsedJson);
  if (!parsed.success) {
    throw new ServiceError(
      ErrorCode.VALIDATION_FAILED,
      "Selected .luie package has invalid meta format",
      {
        packagePath,
        issues: parsed.error.issues,
      },
    );
  }

  return parsed.data;
};

export const attachProjectPackageFile = async <TProject>(
  projectId: string,
  packagePath: string,
  hooks: AttachmentHooks<TProject>,
): Promise<TProject> => {
  try {
    const normalizedPath = normalizeLuiePackagePath(
      packagePath,
      "packagePath",
    );
    const [conflict, meta] = await Promise.all([
      findProjectPathConflict(normalizedPath, projectId),
      readLuieMetaForAttachment(normalizedPath, hooks.logger),
      ensureExistingProject(projectId),
    ] as const);

    if (conflict) {
      throw new ServiceError(
        ErrorCode.VALIDATION_FAILED,
        "Project path is already registered",
        {
          projectId,
          projectPath: normalizedPath,
          conflictProjectId: conflict.id,
        },
      );
    }

    const metaProjectId =
      typeof (meta as { projectId?: unknown }).projectId === "string"
        ? (meta as { projectId: string }).projectId
        : undefined;
    if (metaProjectId && metaProjectId !== projectId) {
      throw new ServiceError(
        ErrorCode.VALIDATION_FAILED,
        "Selected .luie package belongs to a different project",
        {
          projectId,
          packagePath: normalizedPath,
          packageProjectId: metaProjectId,
        },
      );
    }

    const exported = await hooks.exportProjectPackageWithOptions(projectId, {
      targetPath: normalizedPath,
      worldSourcePath: normalizedPath,
    });
    if (!exported) {
      throw new ServiceError(
        ErrorCode.FS_WRITE_FAILED,
        "Failed to attach .luie package",
        {
          projectId,
          packagePath: normalizedPath,
        },
      );
    }

    await setProjectAttachmentPath(projectId, normalizedPath);
    hooks.logger.info("Project attached to existing .luie package", {
      projectId,
      packagePath: normalizedPath,
    });
    return await hooks.getProjectWithAttachmentStatus(projectId);
  } catch (error) {
    hooks.logger.error("Failed to attach .luie package", {
      projectId,
      packagePath,
      error,
    });
    if (error instanceof ServiceError) throw error;
    throw new ServiceError(
      ErrorCode.PROJECT_UPDATE_FAILED,
      "Failed to attach .luie package",
      { projectId, packagePath },
      error,
    );
  }
};

export const materializeProjectPackageFile = async <TProject>(
  projectId: string,
  targetPath: string,
  hooks: AttachmentHooks<TProject>,
): Promise<TProject> => {
  try {
    const normalizedPath = normalizeLuiePackagePath(targetPath, "targetPath");
    const [conflict, currentAttachmentPath] = await Promise.all([
      findProjectPathConflict(normalizedPath, projectId),
      getProjectAttachmentPath(projectId),
      ensureExistingProject(projectId),
    ] as const);

    if (conflict) {
      throw new ServiceError(
        ErrorCode.VALIDATION_FAILED,
        "Project path is already registered",
        {
          projectId,
          projectPath: normalizedPath,
          conflictProjectId: conflict.id,
        },
      );
    }

    const exported = await hooks.exportProjectPackageWithOptions(projectId, {
      targetPath: normalizedPath,
      worldSourcePath: currentAttachmentPath ?? null,
    });
    if (!exported) {
      throw new ServiceError(
        ErrorCode.FS_WRITE_FAILED,
        "Failed to materialize .luie package",
        {
          projectId,
          targetPath: normalizedPath,
        },
      );
    }

    await setProjectAttachmentPath(projectId, normalizedPath);
    hooks.logger.info("Project materialized into .luie package", {
      projectId,
      targetPath: normalizedPath,
      containerKind: "sqlite-v2",
    });
    return await hooks.getProjectWithAttachmentStatus(projectId);
  } catch (error) {
    hooks.logger.error("Failed to materialize .luie package", {
      projectId,
      targetPath,
      error,
    });
    if (error instanceof ServiceError) throw error;
    throw new ServiceError(
      ErrorCode.PROJECT_UPDATE_FAILED,
      "Failed to materialize .luie package",
      { projectId, targetPath },
      error,
    );
  }
};
