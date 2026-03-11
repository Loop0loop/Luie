import { promises as fs } from "fs";
import { LUIE_PACKAGE_EXTENSION } from "../../../../shared/constants/index.js";
import type { ProjectAttachmentStatus } from "../../../../shared/types/index.js";
import { ensureSafeAbsolutePath } from "../../../utils/pathValidation.js";

type ProjectListItem = {
  projectPath: string | null;
};

const isRepairableAttachmentStatus = (
  status: ProjectAttachmentStatus,
): boolean =>
  status === "missing-attachment" || status === "invalid-attachment";

export const withProjectPathStatus = async <T extends ProjectListItem>(
  projects: T[],
): Promise<Array<T & {
  attachmentStatus: ProjectAttachmentStatus;
  pathMissing: boolean;
}>> => {
  return await Promise.all(
    projects.map(async (project) => {
      const projectPath =
        typeof project.projectPath === "string" ? project.projectPath : null;
      const hasProjectPath = Boolean(projectPath);
      const isLuiePath = Boolean(
        projectPath && projectPath.toLowerCase().endsWith(LUIE_PACKAGE_EXTENSION),
      );

      if (!hasProjectPath) {
        return {
          ...project,
          attachmentStatus: "detached" as const,
          pathMissing: false,
        };
      }

      if (!isLuiePath || !projectPath) {
        return {
          ...project,
          attachmentStatus: "attached" as const,
          pathMissing: false,
        };
      }

      try {
        const safeProjectPath = ensureSafeAbsolutePath(projectPath, "projectPath");
        await fs.access(safeProjectPath);
        return {
          ...project,
          attachmentStatus: "attached" as const,
          pathMissing: false,
        };
      } catch {
        let attachmentStatus: ProjectAttachmentStatus = "missing-attachment";
        try {
          ensureSafeAbsolutePath(projectPath, "projectPath");
        } catch {
          attachmentStatus = "invalid-attachment";
        }
        return {
          ...project,
          attachmentStatus,
          pathMissing: isRepairableAttachmentStatus(attachmentStatus),
        };
      }
    }),
  );
};
