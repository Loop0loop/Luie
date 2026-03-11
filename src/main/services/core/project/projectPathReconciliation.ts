import path from "path";
import { ensureSafeAbsolutePath } from "../../../utils/pathValidation.js";

const toProjectPathKey = (projectPath: string): string => {
  const resolved = path.resolve(projectPath);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
};

export const collectDuplicateProjectPathGroups = (
  projects: Array<{
    id: string;
    projectPath: string | null;
    updatedAt: unknown;
  }>,
): Array<Array<{ id: string; projectPath: string; updatedAt: Date }>> => {
  const groups = new Map<
    string,
    Array<{ id: string; projectPath: string; updatedAt: Date }>
  >();

  for (const project of projects) {
    if (
      typeof project.projectPath !== "string" ||
      project.projectPath.length === 0
    ) {
      continue;
    }

    try {
      const safePath = ensureSafeAbsolutePath(project.projectPath, "projectPath");
      const key = toProjectPathKey(safePath);
      const bucket = groups.get(key) ?? [];
      bucket.push({
        id: String(project.id),
        projectPath: safePath,
        updatedAt:
          project.updatedAt instanceof Date
            ? project.updatedAt
            : new Date(String(project.updatedAt)),
      });
      groups.set(key, bucket);
    } catch {
      continue;
    }
  }

  return Array.from(groups.values()).filter((entries) => entries.length > 1);
};
