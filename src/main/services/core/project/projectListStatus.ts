import { promises as fs } from "fs";
import { LUIE_PACKAGE_EXTENSION } from "../../../../shared/constants/index.js";
import { ensureSafeAbsolutePath } from "../../../utils/pathValidation.js";

type ProjectListItem = {
  projectPath: string | null;
};

export const withProjectPathStatus = async <T extends ProjectListItem>(
  projects: T[],
): Promise<Array<T & { pathMissing: boolean }>> => {
  return await Promise.all(
    projects.map(async (project) => {
      const projectPath =
        typeof project.projectPath === "string" ? project.projectPath : null;
      const isLuiePath = Boolean(
        projectPath &&
          projectPath.toLowerCase().endsWith(LUIE_PACKAGE_EXTENSION),
      );

      if (!isLuiePath || !projectPath) {
        return {
          ...project,
          pathMissing: false,
        };
      }

      try {
        const safeProjectPath = ensureSafeAbsolutePath(projectPath, "projectPath");
        await fs.access(safeProjectPath);
        return {
          ...project,
          pathMissing: false,
        };
      } catch {
        return {
          ...project,
          pathMissing: true,
        };
      }
    }),
  );
};
