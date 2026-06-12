export const MEMORY_PERSISTENCE_CLASSES = {
  CANONICAL_EXPORTABLE: "canonical_exportable",
  REGENERABLE_PROJECTION: "regenerable_projection",
} as const;

export const MEMORY_CANONICAL_UNKNOWN_ROW_FIELD_POLICY = "discard" as const;

export type MemoryPersistenceClass =
  typeof MEMORY_PERSISTENCE_CLASSES[keyof typeof MEMORY_PERSISTENCE_CLASSES];

export const MEMORY_CANONICAL_EXPORTABLE_TABLES = [
  "MemoryEntity",
  "MemoryEntityAlias",
  "MemoryEpisode",
  "MemoryEpisodeEvidence",
  "MemoryFact",
  "MemoryFactEvidence",
  "MemoryFactInvalidation",
  "MemoryEvalCase",
  "MemoryEvalEvidence",
  "MemoryEvalEntity",
  "MemoryEvalRelation",
] as const;

export const MEMORY_REGENERABLE_PROJECTION_TABLES = [
  "MemoryChunk",
  "MemoryEmbedding",
  "MemoryBuildJob",
  "SearchDirtyQueue",
  "ChapterSummary",
  "MemoryEntityMention",
  "MemoryEpisodeExtractionJob",
  "MemoryEpisodeParticipant",
  "MemoryStateChangeCandidate",
  "MemoryRelationState",
  "MemoryCharacterState",
  "MemoryKnowledgeState",
  "MemoryNarrativeSummary",
  "MemoryNarrativeSummarySource",
  "MemoryEvalRun",
  "MemoryEvalResult",
] as const;

export const MEMORY_CANONICAL_EXPORTABLE_STATUSES = [
  "confirmed",
  "rejected",
  "deprecated",
] as const;

export type MemoryCanonicalExportableStatus =
  typeof MEMORY_CANONICAL_EXPORTABLE_STATUSES[number];

export const MEMORY_STATUS_REQUIRED_EXPORT_TABLES = [
  "MemoryEntity",
  "MemoryEntityAlias",
  "MemoryFact",
] as const;

export type MemoryStatusRequiredExportTable =
  typeof MEMORY_STATUS_REQUIRED_EXPORT_TABLES[number];

export const MEMORY_STATUS_IGNORED_EXPORT_TABLES = [
  "MemoryEpisode",
  "MemoryEpisodeEvidence",
  "MemoryFactEvidence",
  "MemoryFactInvalidation",
] as const;

export function isMemoryCanonicalExportableStatus(status: string): status is MemoryCanonicalExportableStatus {
  return (MEMORY_CANONICAL_EXPORTABLE_STATUSES as readonly string[]).includes(status);
}

export function getMemoryTablePersistenceClass(tableName: string): MemoryPersistenceClass | null {
  if ((MEMORY_CANONICAL_EXPORTABLE_TABLES as readonly string[]).includes(tableName)) {
    return MEMORY_PERSISTENCE_CLASSES.CANONICAL_EXPORTABLE;
  }
  if ((MEMORY_REGENERABLE_PROJECTION_TABLES as readonly string[]).includes(tableName)) {
    return MEMORY_PERSISTENCE_CLASSES.REGENERABLE_PROJECTION;
  }
  return null;
}

export function isMemoryRowExportable(input: {
  tableName: string;
  status?: string | null;
}): boolean {
  if (getMemoryTablePersistenceClass(input.tableName) !== MEMORY_PERSISTENCE_CLASSES.CANONICAL_EXPORTABLE) {
    return false;
  }
  if ((MEMORY_STATUS_REQUIRED_EXPORT_TABLES as readonly string[]).includes(input.tableName)) {
    if (input.status === undefined || input.status === null) return false;
    return isMemoryCanonicalExportableStatus(input.status);
  }
  if ((MEMORY_STATUS_IGNORED_EXPORT_TABLES as readonly string[]).includes(input.tableName)) {
    return true;
  }
  if (input.status === undefined || input.status === null) return true;
  return isMemoryCanonicalExportableStatus(input.status);
}
