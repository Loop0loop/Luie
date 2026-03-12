import { promises as fs } from "fs";
import { LUIE_PACKAGE_EXTENSION } from "../../../../shared/constants/index.js";
import type { ProjectAttachmentStatus } from "../../../../shared/types/index.js";
import { probeLuieContainer } from "../../io/luieContainer.js";
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
  attachmentContainerKind: "sqlite-v2" | "legacy-package" | "unknown" | null;
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
          attachmentContainerKind: null,
          pathMissing: false,
        };
      }

      if (!isLuiePath || !projectPath) {
        return {
          ...project,
          attachmentStatus: "attached" as const,
          attachmentContainerKind: null,
          pathMissing: false,
        };
      }

      try {
        const safeProjectPath = ensureSafeAbsolutePath(projectPath, "projectPath");
        await fs.access(safeProjectPath);
        const probe = await probeLuieContainer(safeProjectPath);
        if (probe.kind === "legacy-package") {
          return {
            ...project,
            attachmentStatus: "unsupported-legacy-container" as const,
            attachmentContainerKind: "legacy-package" as const,
            pathMissing: false,
          };
        }
        if (probe.kind === "unknown") {
          return {
            ...project,
            attachmentStatus: "invalid-attachment" as const,
            attachmentContainerKind: "unknown" as const,
            pathMissing: true,
          };
        }
        return {
          ...project,
          attachmentStatus: "attached" as const,
          attachmentContainerKind: "sqlite-v2" as const,
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
          attachmentContainerKind: null,
          pathMissing: isRepairableAttachmentStatus(attachmentStatus),
        };
      }
    }),
  );
};
