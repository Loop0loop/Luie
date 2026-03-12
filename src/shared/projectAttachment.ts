import { LUIE_PACKAGE_EXTENSION } from "./constants/index.js";
import type { Project, ProjectAttachmentStatus } from "./types/index.js";

type ProjectAttachmentLike =
  | Pick<Project, "projectPath" | "attachmentStatus">
  | null
  | undefined;

const toNonEmptyPath = (value: string | null | undefined): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value : null;

export const isBrokenAttachmentStatus = (
  status: ProjectAttachmentStatus | null | undefined,
): boolean =>
  status === "missing-attachment" || status === "invalid-attachment";

export const getReadableProjectAttachmentPath = (
  project: ProjectAttachmentLike,
): string | null => {
  const projectPath = toNonEmptyPath(project?.projectPath);
  if (!projectPath) {
    return null;
  }
  if (isBrokenAttachmentStatus(project?.attachmentStatus)) {
    return null;
  }
  return projectPath;
};

export const isLuieAttachmentPath = (
  projectPath: string | null | undefined,
): projectPath is string =>
  typeof projectPath === "string" &&
  projectPath.toLowerCase().endsWith(LUIE_PACKAGE_EXTENSION);

export const getReadableLuieAttachmentPath = (
  project: ProjectAttachmentLike,
): string | null => {
  const projectPath = getReadableProjectAttachmentPath(project);
  return isLuieAttachmentPath(projectPath) ? projectPath : null;
};

export const hasReadableLuieAttachment = (
  project: ProjectAttachmentLike,
): boolean => getReadableLuieAttachmentPath(project) !== null;
