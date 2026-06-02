export type ProjectAttachmentStatus =
  | "attached"
  | "detached"
  | "missing-attachment"
  | "invalid-attachment"
  | "unsupported-legacy-container";

export interface Project {
  id: string;
  title: string;
  description?: string | null;
  // Legacy attachment metadata. Not canonical project content.
  projectPath?: string | null;
  // App-local metadata for recent/opened ordering.
  lastOpenedAt?: string | Date | null;
  attachmentStatus?: ProjectAttachmentStatus;
  attachmentContainerKind?: "sqlite-v2" | "legacy-package" | "unknown" | null;
  // Legacy compatibility flag. Prefer attachmentStatus for new code.
  pathMissing?: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface ProjectOpenResult {
  project: Project;
  recovery?: boolean;
  conflict?: "db-newer" | "luie-newer";
  recoveryPath?: string;
  recoveryReason?: "missing" | "corrupt";
}

export interface ProjectCreateInput {
  title: string;
  description?: string;
  projectPath?: string;
}

export interface ProjectUpdateInput {
  id: string;
  title?: string;
  description?: string;
  projectPath?: string;
}

export interface ProjectDeleteInput {
  id: string;
  deleteFile?: boolean;
}
