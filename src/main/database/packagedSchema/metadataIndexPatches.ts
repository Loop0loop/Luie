import type { IndexPatch } from "./metadataTypes.js";
export const PACKAGED_SCHEMA_INDEX_PATCHES: ReadonlyArray<IndexPatch> = [
  {
    name: "Character_projectId_createdAt_idx",
    table: "Character",
    sql: 'CREATE INDEX IF NOT EXISTS "Character_projectId_createdAt_idx" ON "Character"("projectId", "createdAt");',
  },
  {
    name: "Event_projectId_createdAt_idx",
    table: "Event",
    sql: 'CREATE INDEX IF NOT EXISTS "Event_projectId_createdAt_idx" ON "Event"("projectId", "createdAt");',
  },
  {
    name: "Faction_projectId_createdAt_idx",
    table: "Faction",
    sql: 'CREATE INDEX IF NOT EXISTS "Faction_projectId_createdAt_idx" ON "Faction"("projectId", "createdAt");',
  },
  {
    name: "Term_projectId_createdAt_idx",
    table: "Term",
    sql: 'CREATE INDEX IF NOT EXISTS "Term_projectId_createdAt_idx" ON "Term"("projectId", "createdAt");',
  },
  {
    name: "WorldEntity_projectId_createdAt_idx",
    table: "WorldEntity",
    sql: 'CREATE INDEX IF NOT EXISTS "WorldEntity_projectId_createdAt_idx" ON "WorldEntity"("projectId", "createdAt");',
  },
  {
    name: "ScrapMemo_projectId_sortOrder_updatedAt_idx",
    table: "ScrapMemo",
    sql: 'CREATE INDEX IF NOT EXISTS "ScrapMemo_projectId_sortOrder_updatedAt_idx" ON "ScrapMemo"("projectId", "sortOrder", "updatedAt");',
  },
  {
    name: "MemoryChunkFts",
    table: "MemoryChunk",
    sql: `CREATE VIRTUAL TABLE IF NOT EXISTS "MemoryChunkFts"
USING fts5(
    "chunkId" UNINDEXED,
    "projectId" UNINDEXED,
    "chapterId" UNINDEXED,
    "content",
    tokenize = 'trigram'
);`,
  },
  {
    name: "MemoryChunk_projectId_sceneId_idx",
    table: "MemoryChunk",
    sql: 'CREATE INDEX IF NOT EXISTS "MemoryChunk_projectId_sceneId_idx" ON "MemoryChunk"("projectId", "sceneId");',
  },
  {
    name: "MemoryChunk_id_projectId_key",
    table: "MemoryChunk",
    sql: 'CREATE UNIQUE INDEX IF NOT EXISTS "MemoryChunk_id_projectId_key" ON "MemoryChunk"("id", "projectId");',
  },
  {
    name: "ChapterSummary_id_projectId_key",
    table: "ChapterSummary",
    sql: 'CREATE UNIQUE INDEX IF NOT EXISTS "ChapterSummary_id_projectId_key" ON "ChapterSummary"("id", "projectId");',
  },
  {
    name: "MemoryEpisode_id_projectId_key",
    table: "MemoryEpisode",
    sql: 'CREATE UNIQUE INDEX IF NOT EXISTS "MemoryEpisode_id_projectId_key" ON "MemoryEpisode"("id", "projectId");',
  },
  {
    name: "MemoryEntity_id_projectId_key",
    table: "MemoryEntity",
    sql: 'CREATE UNIQUE INDEX IF NOT EXISTS "MemoryEntity_id_projectId_key" ON "MemoryEntity"("id", "projectId");',
  },
  {
    name: "MemoryEpisodeEvidence_id_projectId_key",
    table: "MemoryEpisodeEvidence",
    sql: 'CREATE UNIQUE INDEX IF NOT EXISTS "MemoryEpisodeEvidence_id_projectId_key" ON "MemoryEpisodeEvidence"("id", "projectId");',
  },
  {
    name: "MemoryEntityMergeAudit_projectId_source_idx",
    table: "MemoryEntityMergeAudit",
    sql: 'CREATE INDEX IF NOT EXISTS "MemoryEntityMergeAudit_projectId_source_idx" ON "MemoryEntityMergeAudit"("projectId", "sourceEntityId");',
  },
  {
    name: "MemoryEntityMergeAudit_projectId_target_idx",
    table: "MemoryEntityMergeAudit",
    sql: 'CREATE INDEX IF NOT EXISTS "MemoryEntityMergeAudit_projectId_target_idx" ON "MemoryEntityMergeAudit"("projectId", "targetEntityId");',
  },
  {
    name: "MemoryFact_projectId_subject_predicate_idx",
    table: "MemoryFact",
    sql: 'CREATE INDEX IF NOT EXISTS "MemoryFact_projectId_subject_predicate_idx" ON "MemoryFact"("projectId", "subjectEntityId", "predicate");',
  },
  {
    name: "MemoryFact_projectId_validity_idx",
    table: "MemoryFact",
    sql: 'CREATE INDEX IF NOT EXISTS "MemoryFact_projectId_validity_idx" ON "MemoryFact"("projectId", "validFromChapterOrder", "validToChapterOrder");',
  },
  {
    name: "MemoryFact_projectId_status_idx",
    table: "MemoryFact",
    sql: 'CREATE INDEX IF NOT EXISTS "MemoryFact_projectId_status_idx" ON "MemoryFact"("projectId", "status");',
  },
  {
    name: "MemoryFact_id_projectId_key",
    table: "MemoryFact",
    sql: 'CREATE UNIQUE INDEX IF NOT EXISTS "MemoryFact_id_projectId_key" ON "MemoryFact"("id", "projectId");',
  },
  {
    name: "MemoryFactEvidence_factId_idx",
    table: "MemoryFactEvidence",
    sql: 'CREATE INDEX IF NOT EXISTS "MemoryFactEvidence_factId_idx" ON "MemoryFactEvidence"("factId");',
  },
  {
    name: "MemoryFactInvalidation_invalidatedFactId_idx",
    table: "MemoryFactInvalidation",
    sql: 'CREATE INDEX IF NOT EXISTS "MemoryFactInvalidation_invalidatedFactId_idx" ON "MemoryFactInvalidation"("invalidatedFactId");',
  },
  {
    name: "MemoryRelationState_projectId_relation_idx",
    table: "MemoryRelationState",
    sql: 'CREATE INDEX IF NOT EXISTS "MemoryRelationState_projectId_relation_idx" ON "MemoryRelationState"("projectId", "relation");',
  },
  {
    name: "MemoryCharacterState_projectId_stateType_idx",
    table: "MemoryCharacterState",
    sql: 'CREATE INDEX IF NOT EXISTS "MemoryCharacterState_projectId_stateType_idx" ON "MemoryCharacterState"("projectId", "stateType");',
  },
  {
    name: "MemoryKnowledgeState_projectId_knower_idx",
    table: "MemoryKnowledgeState",
    sql: 'CREATE INDEX IF NOT EXISTS "MemoryKnowledgeState_projectId_knower_idx" ON "MemoryKnowledgeState"("projectId", "knowerEntityId");',
  },
  {
    name: "MemoryNarrativeSummary_projectId_type_idx",
    table: "MemoryNarrativeSummary",
    sql: 'CREATE INDEX IF NOT EXISTS "MemoryNarrativeSummary_projectId_type_idx" ON "MemoryNarrativeSummary"("projectId", "summaryType");',
  },
  {
    name: "MemoryNarrativeSummary_projectId_scope_idx",
    table: "MemoryNarrativeSummary",
    sql: 'CREATE INDEX IF NOT EXISTS "MemoryNarrativeSummary_projectId_scope_idx" ON "MemoryNarrativeSummary"("projectId", "scopeType", "scopeId");',
  },
  {
    name: "MemoryNarrativeSummary_projectId_status_idx",
    table: "MemoryNarrativeSummary",
    sql: 'CREATE INDEX IF NOT EXISTS "MemoryNarrativeSummary_projectId_status_idx" ON "MemoryNarrativeSummary"("projectId", "status");',
  },
  {
    name: "MemoryNarrativeSummary_id_projectId_key",
    table: "MemoryNarrativeSummary",
    sql: 'CREATE UNIQUE INDEX IF NOT EXISTS "MemoryNarrativeSummary_id_projectId_key" ON "MemoryNarrativeSummary"("id", "projectId");',
  },
  {
    name: "MemoryNarrativeSummarySource_summaryId_idx",
    table: "MemoryNarrativeSummarySource",
    sql: 'CREATE INDEX IF NOT EXISTS "MemoryNarrativeSummarySource_summaryId_idx" ON "MemoryNarrativeSummarySource"("summaryId");',
  },
  {
    name: "MemoryNarrativeSummarySource_projectId_sourceType_idx",
    table: "MemoryNarrativeSummarySource",
    sql: 'CREATE INDEX IF NOT EXISTS "MemoryNarrativeSummarySource_projectId_sourceType_idx" ON "MemoryNarrativeSummarySource"("projectId", "sourceType");',
  },
];
