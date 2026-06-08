import { promises as fs } from "fs";
import { LUIE_PACKAGE_EXTENSION } from "../../../../shared/constants/index.js";
import { ErrorCode } from "../../../../shared/constants/errorCode.js";
import type { ProjectDeleteInput } from "../../../../shared/types/index.js";
import { ensureSafeAbsolutePath } from "../../../utils/fs/index.js";
import { ServiceError } from "../../../utils/error/index.js";
import { assertAllowedFsPath } from "../../../handler/system/fs/index.js";

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

  const safeProjectPath = ensureSafeAbsolutePath(
    input.projectPath,
    "projectPath",
  );
  const allowedProjectPath = await assertAllowedFsPath(safeProjectPath, {
    fieldName: "projectPath",
    mode: "write",
    permission: "package",
  });
  const stat = await fs.stat(allowedProjectPath);
  if (!stat.isFile()) {
    throw new ServiceError(
      ErrorCode.FS_DELETE_FAILED,
      "Project package path must be a file",
      { projectPath: allowedProjectPath },
    );
  }

  await fs.unlink(allowedProjectPath);
};
