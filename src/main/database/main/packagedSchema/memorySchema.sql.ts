export const PACKAGED_SCHEMA_BOOTSTRAP_MEMORY_SQL = `
CREATE TABLE IF NOT EXISTS "MemoryEntity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "canonicalName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'suggested',
    "confidence" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT NOT NULL DEFAULT 'system',
    "createdAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TEXT NOT NULL,
    "deletedAt" TEXT,
    CONSTRAINT "MemoryEntity_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "MemoryEntityAlias" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "normalizedAlias" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'suggested',
    "createdAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TEXT NOT NULL,
    CONSTRAINT "MemoryEntityAlias_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MemoryEntityAlias_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "MemoryEntity" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "MemoryEntityMention" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "aliasId" TEXT,
    "chapterId" TEXT,
    "chunkId" TEXT,
    "contentHash" TEXT NOT NULL DEFAULT '',
    "sourceContentHash" TEXT NOT NULL DEFAULT '',
    "startOffset" INTEGER,
    "endOffset" INTEGER,
    "quote" TEXT NOT NULL,
    "extractorVersion" TEXT NOT NULL DEFAULT 'manual',
    "confidence" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'suggested',
    "createdAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TEXT NOT NULL,
    CONSTRAINT "MemoryEntityMention_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MemoryEntityMention_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "MemoryEntity" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MemoryEntityMention_aliasId_fkey" FOREIGN KEY ("aliasId") REFERENCES "MemoryEntityAlias" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "MemoryEntityMention_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "MemoryEntityMergeAudit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "sourceEntityId" TEXT NOT NULL,
    "targetEntityId" TEXT NOT NULL,
    "aliasId" TEXT,
    "action" TEXT NOT NULL,
    "reason" TEXT,
    "createdBy" TEXT NOT NULL DEFAULT 'user',
    "createdAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TEXT NOT NULL,
    CONSTRAINT "MemoryEntityMergeAudit_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MemoryEntityMergeAudit_sourceEntityId_fkey" FOREIGN KEY ("sourceEntityId") REFERENCES "MemoryEntity" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MemoryEntityMergeAudit_targetEntityId_fkey" FOREIGN KEY ("targetEntityId") REFERENCES "MemoryEntity" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MemoryEntityMergeAudit_aliasId_fkey" FOREIGN KEY ("aliasId") REFERENCES "MemoryEntityAlias" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "MemoryEntityMergeAudit_projectId_source_idx" ON "MemoryEntityMergeAudit"("projectId", "sourceEntityId");
CREATE INDEX IF NOT EXISTS "MemoryEntityMergeAudit_projectId_target_idx" ON "MemoryEntityMergeAudit"("projectId", "targetEntityId");
CREATE TABLE IF NOT EXISTS "MemoryEpisodeExtractionJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "sourceContentHash" TEXT NOT NULL,
    "extractorVersion" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "priority" INTEGER NOT NULL DEFAULT 50,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "createdAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TEXT NOT NULL,
    CONSTRAINT "MemoryEpisodeExtractionJob_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "MemoryEpisode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "chapterId" TEXT,
    "sceneId" TEXT,
    "sourceContentHash" TEXT NOT NULL,
    "extractorVersion" TEXT NOT NULL,
    "episodeType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'suggested',
    "confidence" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TEXT NOT NULL,
    "rejectedAt" TEXT,
    "rejectionReason" TEXT,
    CONSTRAINT "MemoryEpisode_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MemoryEpisode_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "MemoryEpisode_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "Scene" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "MemoryEpisodeParticipant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "episodeId" TEXT NOT NULL,
    "entityId" TEXT,
    "surfaceName" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'mentioned',
    "status" TEXT NOT NULL DEFAULT 'suggested',
    "createdAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TEXT NOT NULL,
    "rejectedAt" TEXT,
    "rejectionReason" TEXT,
    CONSTRAINT "MemoryEpisodeParticipant_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MemoryEpisodeParticipant_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "MemoryEpisode" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MemoryEpisodeParticipant_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "MemoryEntity" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "MemoryEpisodeEvidence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "episodeId" TEXT NOT NULL,
    "chapterId" TEXT,
    "chunkId" TEXT,
    "contentHash" TEXT NOT NULL,
    "sourceContentHash" TEXT NOT NULL,
    "startOffset" INTEGER,
    "endOffset" INTEGER,
    "quote" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TEXT NOT NULL,
    CONSTRAINT "MemoryEpisodeEvidence_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MemoryEpisodeEvidence_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "MemoryEpisode" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MemoryEpisodeEvidence_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "MemoryStateChangeCandidate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "episodeId" TEXT NOT NULL,
    "evidenceId" TEXT NOT NULL,
    "subjectEntityId" TEXT,
    "stateType" TEXT NOT NULL,
    "beforeValue" TEXT,
    "afterValue" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'suggested',
    "confidence" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TEXT NOT NULL,
    "rejectedAt" TEXT,
    "rejectionReason" TEXT,
    CONSTRAINT "MemoryStateChangeCandidate_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MemoryStateChangeCandidate_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "MemoryEpisode" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MemoryStateChangeCandidate_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "MemoryEpisodeEvidence" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MemoryStateChangeCandidate_subjectEntityId_fkey" FOREIGN KEY ("subjectEntityId") REFERENCES "MemoryEntity" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "MemoryFact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "subjectEntityId" TEXT NOT NULL,
    "predicate" TEXT NOT NULL,
    "objectEntityId" TEXT,
    "objectValue" TEXT,
    "valueType" TEXT NOT NULL,
    "validFromChapterId" TEXT NOT NULL,
    "validFromChapterOrder" INTEGER NOT NULL,
    "validToChapterId" TEXT,
    "validToChapterOrder" INTEGER,
    "observedAtChapterId" TEXT NOT NULL,
    "observedAtChapterOrder" INTEGER NOT NULL,
    "confidence" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'suggested',
    "extractorVersion" TEXT NOT NULL,
    "sourceContentHash" TEXT NOT NULL,
    "invalidatedByFactId" TEXT,
    "createdAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TEXT NOT NULL,
    "rejectedAt" TEXT,
    "rejectionReason" TEXT,
    CONSTRAINT "MemoryFact_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MemoryFact_subjectEntityId_fkey" FOREIGN KEY ("subjectEntityId", "projectId") REFERENCES "MemoryEntity" ("id", "projectId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MemoryFact_objectEntityId_fkey" FOREIGN KEY ("objectEntityId", "projectId") REFERENCES "MemoryEntity" ("id", "projectId") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MemoryFact_validFromChapterId_fkey" FOREIGN KEY ("validFromChapterId") REFERENCES "Chapter" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MemoryFact_validToChapterId_fkey" FOREIGN KEY ("validToChapterId") REFERENCES "Chapter" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "MemoryFact_observedAtChapterId_fkey" FOREIGN KEY ("observedAtChapterId") REFERENCES "Chapter" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MemoryFact_invalidatedByFactId_fkey" FOREIGN KEY ("invalidatedByFactId", "projectId") REFERENCES "MemoryFact" ("id", "projectId") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "MemoryFactEvidence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "factId" TEXT NOT NULL,
    "evidenceId" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TEXT NOT NULL,
    CONSTRAINT "MemoryFactEvidence_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MemoryFactEvidence_factId_fkey" FOREIGN KEY ("factId", "projectId") REFERENCES "MemoryFact" ("id", "projectId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MemoryFactEvidence_evidenceId_fkey" FOREIGN KEY ("evidenceId", "projectId") REFERENCES "MemoryEpisodeEvidence" ("id", "projectId") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "MemoryFactInvalidation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "invalidatedFactId" TEXT NOT NULL,
    "invalidatingFactId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TEXT NOT NULL,
    CONSTRAINT "MemoryFactInvalidation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MemoryFactInvalidation_invalidatedFactId_fkey" FOREIGN KEY ("invalidatedFactId", "projectId") REFERENCES "MemoryFact" ("id", "projectId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MemoryFactInvalidation_invalidatingFactId_fkey" FOREIGN KEY ("invalidatingFactId", "projectId") REFERENCES "MemoryFact" ("id", "projectId") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "MemoryRelationState" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "factId" TEXT NOT NULL,
    "sourceEntityId" TEXT NOT NULL,
    "targetEntityId" TEXT NOT NULL,
    "relation" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TEXT NOT NULL,
    CONSTRAINT "MemoryRelationState_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MemoryRelationState_factId_fkey" FOREIGN KEY ("factId", "projectId") REFERENCES "MemoryFact" ("id", "projectId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MemoryRelationState_sourceEntityId_fkey" FOREIGN KEY ("sourceEntityId", "projectId") REFERENCES "MemoryEntity" ("id", "projectId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MemoryRelationState_targetEntityId_fkey" FOREIGN KEY ("targetEntityId", "projectId") REFERENCES "MemoryEntity" ("id", "projectId") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "MemoryCharacterState" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "factId" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "stateType" TEXT NOT NULL,
    "stateValue" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TEXT NOT NULL,
    CONSTRAINT "MemoryCharacterState_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MemoryCharacterState_factId_fkey" FOREIGN KEY ("factId", "projectId") REFERENCES "MemoryFact" ("id", "projectId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MemoryCharacterState_entityId_fkey" FOREIGN KEY ("entityId", "projectId") REFERENCES "MemoryEntity" ("id", "projectId") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "MemoryKnowledgeState" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "factId" TEXT NOT NULL,
    "knowerEntityId" TEXT NOT NULL,
    "secretEntityId" TEXT,
    "knowledgeKey" TEXT NOT NULL,
    "knowledgeValue" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TEXT NOT NULL,
    CONSTRAINT "MemoryKnowledgeState_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MemoryKnowledgeState_factId_fkey" FOREIGN KEY ("factId", "projectId") REFERENCES "MemoryFact" ("id", "projectId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MemoryKnowledgeState_knowerEntityId_fkey" FOREIGN KEY ("knowerEntityId", "projectId") REFERENCES "MemoryEntity" ("id", "projectId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MemoryKnowledgeState_secretEntityId_fkey" FOREIGN KEY ("secretEntityId", "projectId") REFERENCES "MemoryEntity" ("id", "projectId") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "MemoryNarrativeSummary" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "summaryType" TEXT NOT NULL,
    "scopeType" TEXT NOT NULL,
    "scopeId" TEXT,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'suggested',
    "confidence" INTEGER NOT NULL DEFAULT 0,
    "extractorVersion" TEXT NOT NULL,
    "sourceContentHash" TEXT NOT NULL,
    "generatedAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TEXT NOT NULL,
    "rejectedAt" TEXT,
    "rejectionReason" TEXT,
    CONSTRAINT "MemoryNarrativeSummary_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "MemoryNarrativeSummarySource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "summaryId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "episodeId" TEXT,
    "factId" TEXT,
    "chunkId" TEXT,
    "chapterSummaryId" TEXT,
    "quote" TEXT,
    "contentHash" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TEXT NOT NULL,
    CONSTRAINT "MemoryNarrativeSummarySource_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MemoryNarrativeSummarySource_summaryId_fkey" FOREIGN KEY ("summaryId", "projectId") REFERENCES "MemoryNarrativeSummary" ("id", "projectId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MemoryNarrativeSummarySource_episodeId_fkey" FOREIGN KEY ("episodeId", "projectId") REFERENCES "MemoryEpisode" ("id", "projectId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MemoryNarrativeSummarySource_factId_fkey" FOREIGN KEY ("factId", "projectId") REFERENCES "MemoryFact" ("id", "projectId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MemoryNarrativeSummarySource_chunkId_fkey" FOREIGN KEY ("chunkId", "projectId") REFERENCES "MemoryChunk" ("id", "projectId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MemoryNarrativeSummarySource_chapterSummaryId_fkey" FOREIGN KEY ("chapterSummaryId", "projectId") REFERENCES "ChapterSummary" ("id", "projectId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MemoryNarrativeSummarySource_single_source_check" CHECK (
        ("sourceType" = 'episode' AND "episodeId" IS NOT NULL AND "factId" IS NULL AND "chunkId" IS NULL AND "chapterSummaryId" IS NULL) OR
        ("sourceType" = 'fact' AND "episodeId" IS NULL AND "factId" IS NOT NULL AND "chunkId" IS NULL AND "chapterSummaryId" IS NULL) OR
        ("sourceType" = 'chunk' AND "episodeId" IS NULL AND "factId" IS NULL AND "chunkId" IS NOT NULL AND "chapterSummaryId" IS NULL) OR
        ("sourceType" = 'chapter_summary' AND "episodeId" IS NULL AND "factId" IS NULL AND "chunkId" IS NULL AND "chapterSummaryId" IS NOT NULL)
    )
);
`;
