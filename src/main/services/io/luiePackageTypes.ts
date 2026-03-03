export type LuiePackageExportData = {
  meta: Record<string, unknown>;
  chapters: Array<{ id: string; content?: string | null }>;
  characters: unknown[];
  terms: unknown[];
  synopsis?: unknown;
  plot?: unknown;
  drawing?: unknown;
  mindmap?: unknown;
  memos?: unknown;
  graph?: unknown;
  snapshots: Array<{
    id: string;
    chapterId?: string | null;
    content?: string | null;
    description?: string | null;
    createdAt?: string;
  }>;
};

export type ZipEntryPayload = {
  name: string;
  content?: string;
  isDirectory?: boolean;
  fromFilePath?: string;
};

export type LoggerLike = {
  info?: (message: string, details?: unknown) => void;
  debug?: (message: string, details?: unknown) => void;
  warn?: (message: string, details?: unknown) => void;
  error: (message: string, details?: unknown) => void;
};
