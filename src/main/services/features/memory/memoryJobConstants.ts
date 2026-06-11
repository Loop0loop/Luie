export const MEMORY_JOB_TYPES = {
  REBUILD_CHUNKS: "rebuild_chunks",
  REBUILD_SUMMARY: "rebuild_summary",
  REBUILD_EMBEDDING: "rebuild_embedding",
} as const;

export type MemoryJobType =
  (typeof MEMORY_JOB_TYPES)[keyof typeof MEMORY_JOB_TYPES];

export const MEMORY_TARGET_TYPES = {
  CHAPTER: "chapter",
  SCENE: "scene",
  NOTE: "note",
  SYNOPSIS: "synopsis",
  PLOT: "plot",
  CHARACTER: "character",
  FACTION: "faction",
  EVENT: "event",
  SCRAP_MEMO: "scrapMemo",
} as const;

export type MemoryTargetType =
  (typeof MEMORY_TARGET_TYPES)[keyof typeof MEMORY_TARGET_TYPES];

export const MEMORY_JOB_PRIORITY = {
  CHUNKS: 80,
  SUMMARY: 90,
  EMBEDDING: 100,
} as const;

export const MEMORY_BUILD_JOB_DEDUPE_STATUSES = [
  "pending",
  "running",
  "failed",
  "paused",
] as const;
