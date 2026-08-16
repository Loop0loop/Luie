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
  /** Canonical project content가 아닌 legacy attachment metadata. */
  projectPath?: string | null;
  /** 최근 project 정렬에만 사용하는 app-local metadata. */
  lastOpenedAt?: string | Date | null;
  attachmentStatus?: ProjectAttachmentStatus;
  attachmentContainerKind?: "sqlite-v2" | "legacy-package" | "unknown" | null;
  /** Legacy 호환용이며 새 코드는 `attachmentStatus`를 사용한다. */
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
  importWarnings?: ProjectImportWarning[];
}

export interface ProjectImportWarning {
  code: "canonical_memory_unknown_row_fields_discarded";
  policy: "discard";
  table: string;
  fields: string[];
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
