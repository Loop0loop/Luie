import { promises as fs } from "fs";
import { LUIE_PACKAGE_EXTENSION } from "../../../../shared/constants/index.js";
import type { ProjectDeleteInput } from "../../../../shared/types/index.js";
import { ensureSafeAbsolutePath } from "../../../utils/pathValidation.js";

export type NormalizedProjectDeleteRequest = {
  id: string;
  deleteFile: boolean;
};

export const normalizeProjectDeleteInput = (
  input: string | ProjectDeleteInput,
): NormalizedProjectDeleteRequest =>
  typeof input === "string"
    ? { id: input, deleteFile: false }
    : { id: input.id, deleteFile: Boolean(input.deleteFile) };

export const deleteProjectPackageFileIfRequested = async (input: {
  deleteFile: boolean;
  projectPath: string | null;
}): Promise<void> => {
  if (!input.deleteFile || !input.projectPath) return;
  if (!input.projectPath.toLowerCase().endsWith(LUIE_PACKAGE_EXTENSION)) return;

  const safeProjectPath = ensureSafeAbsolutePath(input.projectPath, "projectPath");
  await fs.rm(safeProjectPath, { force: true, recursive: true });
};
