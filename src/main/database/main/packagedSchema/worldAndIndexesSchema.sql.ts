export const PACKAGED_SCHEMA_BOOTSTRAP_WORLD_SQL = `
CREATE TABLE IF NOT EXISTS "Note" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "chapterId" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "Note_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Note_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "Synopsis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "chapterId" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "Synopsis_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Synopsis_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "Plot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "Plot_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "Character" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "firstAppearance" TEXT,
    "attributes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "Character_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "firstAppearance" TEXT,
    "attributes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "Event_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "Faction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "firstAppearance" TEXT,
    "attributes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "Faction_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "WorldDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "docType" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WorldDocument_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "ScrapMemo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "ScrapMemo_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "Term" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "definition" TEXT,
    "category" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "firstAppearance" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "Term_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "Snapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "chapterId" TEXT,
    "content" TEXT NOT NULL,
    "contentLength" INTEGER NOT NULL DEFAULT 0,
    "type" TEXT NOT NULL DEFAULT 'AUTO',
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Snapshot_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Snapshot_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "WorldEntity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "firstAppearance" TEXT,
    "attributes" TEXT,
    "memoryEntityId" TEXT,
    "positionX" REAL NOT NULL DEFAULT 0,
    "positionY" REAL NOT NULL DEFAULT 0,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WorldEntity_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WorldEntity_memoryEntityId_fkey" FOREIGN KEY ("memoryEntityId", "projectId") REFERENCES "MemoryEntity" ("id", "projectId") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "EntityRelation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "relation" TEXT NOT NULL,
    "attributes" TEXT,
    "sourceWorldEntityId" TEXT,
    "targetWorldEntityId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EntityRelation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EntityRelation_sourceWorldEntityId_fkey" FOREIGN KEY ("sourceWorldEntityId") REFERENCES "WorldEntity" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EntityRelation_targetWorldEntityId_fkey" FOREIGN KEY ("targetWorldEntityId") REFERENCES "WorldEntity" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "ProjectAttachment_projectPath_key" ON "ProjectAttachment"("projectPath");
CREATE UNIQUE INDEX IF NOT EXISTS "ProjectSettings_projectId_key" ON "ProjectSettings"("projectId");
CREATE INDEX IF NOT EXISTS "ProjectLocalState_lastOpenedAt_idx" ON "ProjectLocalState"("lastOpenedAt");
CREATE INDEX IF NOT EXISTS "Chapter_projectId_order_idx" ON "Chapter"("projectId", "order");
CREATE INDEX IF NOT EXISTS "Scene_projectId_chapterId_order_idx" ON "Scene"("projectId", "chapterId", "order");
CREATE INDEX IF NOT EXISTS "ChapterRevision_chapterId_createdAt_idx" ON "ChapterRevision"("chapterId", "createdAt");
CREATE INDEX IF NOT EXISTS "SearchDirtyQueue_projectId_status_idx" ON "SearchDirtyQueue"("projectId", "status");
CREATE INDEX IF NOT EXISTS "SearchDirtyQueue_source_idx" ON "SearchDirtyQueue"("sourceType", "sourceId");
CREATE UNIQUE INDEX IF NOT EXISTS "MemoryChunk_source_chunkIndex_key" ON "MemoryChunk"("sourceType", "sourceId", "chunkIndex");
CREATE UNIQUE INDEX IF NOT EXISTS "MemoryChunk_id_projectId_key" ON "MemoryChunk"("id", "projectId");
CREATE INDEX IF NOT EXISTS "MemoryChunk_projectId_source_idx" ON "MemoryChunk"("projectId", "sourceType", "sourceId");
CREATE INDEX IF NOT EXISTS "MemoryChunk_projectId_source_paragraph_idx" ON "MemoryChunk"("projectId", "sourceType", "sourceId", "paragraphStartIndex", "paragraphEndIndex");
CREATE INDEX IF NOT EXISTS "MemoryChunk_projectId_chapterId_idx" ON "MemoryChunk"("projectId", "chapterId");
CREATE INDEX IF NOT EXISTS "MemoryChunk_projectId_sceneId_idx" ON "MemoryChunk"("projectId", "sceneId");
CREATE INDEX IF NOT EXISTS "MemoryBuildJob_projectId_status_priority_idx" ON "MemoryBuildJob"("projectId", "status", "priority");
CREATE INDEX IF NOT EXISTS "MemoryBuildJob_target_idx" ON "MemoryBuildJob"("targetType", "targetId");
CREATE UNIQUE INDEX IF NOT EXISTS "MemoryEmbedding_chunkId_key" ON "MemoryEmbedding"("chunkId");
CREATE INDEX IF NOT EXISTS "MemoryEmbedding_projectId_idx" ON "MemoryEmbedding"("projectId");
CREATE UNIQUE INDEX IF NOT EXISTS "ChapterSummary_chapterId_key" ON "ChapterSummary"("chapterId");
CREATE UNIQUE INDEX IF NOT EXISTS "ChapterSummary_id_projectId_key" ON "ChapterSummary"("id", "projectId");
CREATE INDEX IF NOT EXISTS "ChapterSummary_projectId_idx" ON "ChapterSummary"("projectId");
CREATE INDEX IF NOT EXISTS "MemoryEvalCase_projectId_caseType_idx" ON "MemoryEvalCase"("projectId", "caseType");
CREATE INDEX IF NOT EXISTS "MemoryEvalCase_projectId_severity_idx" ON "MemoryEvalCase"("projectId", "severity");
CREATE INDEX IF NOT EXISTS "MemoryEvalEvidence_caseId_idx" ON "MemoryEvalEvidence"("caseId");
CREATE INDEX IF NOT EXISTS "MemoryEvalEvidence_projectId_chapterId_idx" ON "MemoryEvalEvidence"("projectId", "chapterId");
CREATE INDEX IF NOT EXISTS "MemoryEvalEntity_caseId_idx" ON "MemoryEvalEntity"("caseId");
CREATE INDEX IF NOT EXISTS "MemoryEvalEntity_projectId_name_idx" ON "MemoryEvalEntity"("projectId", "name");
CREATE INDEX IF NOT EXISTS "MemoryEvalRelation_caseId_idx" ON "MemoryEvalRelation"("caseId");
CREATE INDEX IF NOT EXISTS "MemoryEvalRelation_projectId_relation_idx" ON "MemoryEvalRelation"("projectId", "relation");
CREATE INDEX IF NOT EXISTS "MemoryEvalRun_projectId_startedAt_idx" ON "MemoryEvalRun"("projectId", "startedAt");
CREATE INDEX IF NOT EXISTS "MemoryEvalRun_projectId_status_idx" ON "MemoryEvalRun"("projectId", "status");
CREATE INDEX IF NOT EXISTS "MemoryEvalResult_runId_idx" ON "MemoryEvalResult"("runId");
CREATE INDEX IF NOT EXISTS "MemoryEvalResult_caseId_idx" ON "MemoryEvalResult"("caseId");
CREATE INDEX IF NOT EXISTS "MemoryEvalResult_projectId_p0_idx" ON "MemoryEvalResult"("projectId", "p0FailureCount");
CREATE INDEX IF NOT EXISTS "MemoryEvalFeedback_projectId_status_idx" ON "MemoryEvalFeedback"("projectId", "status");
CREATE INDEX IF NOT EXISTS "MemoryEvalFeedback_projectId_kind_idx" ON "MemoryEvalFeedback"("projectId", "feedbackKind");
CREATE INDEX IF NOT EXISTS "MemoryEvalFeedback_caseId_idx" ON "MemoryEvalFeedback"("caseId");
CREATE INDEX IF NOT EXISTS "MemoryEntity_projectId_type_idx" ON "MemoryEntity"("projectId", "entityType");
CREATE INDEX IF NOT EXISTS "MemoryEntity_projectId_status_idx" ON "MemoryEntity"("projectId", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "MemoryEntity_id_projectId_key" ON "MemoryEntity"("id", "projectId");
CREATE UNIQUE INDEX IF NOT EXISTS "MemoryEntity_projectId_type_name_key" ON "MemoryEntity"("projectId", "entityType", "canonicalName");
CREATE INDEX IF NOT EXISTS "MemoryEntityAlias_entityId_idx" ON "MemoryEntityAlias"("entityId");
CREATE UNIQUE INDEX IF NOT EXISTS "MemoryEntityAlias_projectId_alias_key" ON "MemoryEntityAlias"("projectId", "entityType", "normalizedAlias");
CREATE INDEX IF NOT EXISTS "MemoryEntityMention_entityId_idx" ON "MemoryEntityMention"("entityId");
CREATE INDEX IF NOT EXISTS "MemoryEntityMention_projectId_chapterId_idx" ON "MemoryEntityMention"("projectId", "chapterId");
CREATE INDEX IF NOT EXISTS "MemoryEpisodeExtractionJob_projectId_status_priority_idx" ON "MemoryEpisodeExtractionJob"("projectId", "status", "priority");
CREATE UNIQUE INDEX IF NOT EXISTS "MemoryEpisodeExtractionJob_source_version_key" ON "MemoryEpisodeExtractionJob"("projectId", "sourceType", "sourceId", "sourceContentHash", "extractorVersion");
CREATE INDEX IF NOT EXISTS "MemoryEpisode_projectId_source_idx" ON "MemoryEpisode"("projectId", "sourceType", "sourceId");
CREATE INDEX IF NOT EXISTS "MemoryEpisode_projectId_status_idx" ON "MemoryEpisode"("projectId", "status");
CREATE INDEX IF NOT EXISTS "MemoryEpisode_projectId_chapterId_idx" ON "MemoryEpisode"("projectId", "chapterId");
CREATE UNIQUE INDEX IF NOT EXISTS "MemoryEpisode_id_projectId_key" ON "MemoryEpisode"("id", "projectId");
CREATE INDEX IF NOT EXISTS "MemoryEpisodeParticipant_episodeId_idx" ON "MemoryEpisodeParticipant"("episodeId");
CREATE INDEX IF NOT EXISTS "MemoryEpisodeEvidence_episodeId_idx" ON "MemoryEpisodeEvidence"("episodeId");
CREATE INDEX IF NOT EXISTS "MemoryEpisodeEvidence_projectId_chapterId_idx" ON "MemoryEpisodeEvidence"("projectId", "chapterId");
CREATE UNIQUE INDEX IF NOT EXISTS "MemoryEpisodeEvidence_id_projectId_key" ON "MemoryEpisodeEvidence"("id", "projectId");
CREATE INDEX IF NOT EXISTS "MemoryStateChangeCandidate_episodeId_idx" ON "MemoryStateChangeCandidate"("episodeId");
CREATE INDEX IF NOT EXISTS "MemoryStateChangeCandidate_projectId_status_idx" ON "MemoryStateChangeCandidate"("projectId", "status");
CREATE INDEX IF NOT EXISTS "MemoryFact_projectId_subject_predicate_idx" ON "MemoryFact"("projectId", "subjectEntityId", "predicate");
CREATE INDEX IF NOT EXISTS "MemoryFact_projectId_validity_idx" ON "MemoryFact"("projectId", "validFromChapterOrder", "validToChapterOrder");
CREATE INDEX IF NOT EXISTS "MemoryFact_projectId_status_idx" ON "MemoryFact"("projectId", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "MemoryFact_id_projectId_key" ON "MemoryFact"("id", "projectId");
CREATE INDEX IF NOT EXISTS "MemoryFactEvidence_factId_idx" ON "MemoryFactEvidence"("factId");
CREATE INDEX IF NOT EXISTS "MemoryFactInvalidation_invalidatedFactId_idx" ON "MemoryFactInvalidation"("invalidatedFactId");
CREATE INDEX IF NOT EXISTS "MemoryRelationState_projectId_relation_idx" ON "MemoryRelationState"("projectId", "relation");
CREATE INDEX IF NOT EXISTS "MemoryCharacterState_projectId_stateType_idx" ON "MemoryCharacterState"("projectId", "stateType");
CREATE INDEX IF NOT EXISTS "MemoryKnowledgeState_projectId_knower_idx" ON "MemoryKnowledgeState"("projectId", "knowerEntityId");
CREATE INDEX IF NOT EXISTS "MemoryNarrativeSummary_projectId_type_idx" ON "MemoryNarrativeSummary"("projectId", "summaryType");
CREATE INDEX IF NOT EXISTS "MemoryNarrativeSummary_projectId_scope_idx" ON "MemoryNarrativeSummary"("projectId", "scopeType", "scopeId");
CREATE INDEX IF NOT EXISTS "MemoryNarrativeSummary_projectId_status_idx" ON "MemoryNarrativeSummary"("projectId", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "MemoryNarrativeSummary_id_projectId_key" ON "MemoryNarrativeSummary"("id", "projectId");
CREATE INDEX IF NOT EXISTS "MemoryNarrativeSummarySource_summaryId_idx" ON "MemoryNarrativeSummarySource"("summaryId");
CREATE INDEX IF NOT EXISTS "MemoryNarrativeSummarySource_projectId_sourceType_idx" ON "MemoryNarrativeSummarySource"("projectId", "sourceType");
CREATE INDEX IF NOT EXISTS "Note_projectId_updatedAt_idx" ON "Note"("projectId", "updatedAt");
CREATE INDEX IF NOT EXISTS "Synopsis_projectId_updatedAt_idx" ON "Synopsis"("projectId", "updatedAt");
CREATE INDEX IF NOT EXISTS "Plot_projectId_updatedAt_idx" ON "Plot"("projectId", "updatedAt");
CREATE INDEX IF NOT EXISTS "Character_projectId_name_idx" ON "Character"("projectId", "name");
CREATE INDEX IF NOT EXISTS "Character_projectId_createdAt_idx" ON "Character"("projectId", "createdAt");
CREATE INDEX IF NOT EXISTS "Event_projectId_name_idx" ON "Event"("projectId", "name");
CREATE INDEX IF NOT EXISTS "Event_projectId_createdAt_idx" ON "Event"("projectId", "createdAt");
CREATE INDEX IF NOT EXISTS "Faction_projectId_name_idx" ON "Faction"("projectId", "name");
CREATE INDEX IF NOT EXISTS "Faction_projectId_createdAt_idx" ON "Faction"("projectId", "createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "WorldDocument_projectId_docType_key" ON "WorldDocument"("projectId", "docType");
CREATE INDEX IF NOT EXISTS "WorldDocument_projectId_updatedAt_idx" ON "WorldDocument"("projectId", "updatedAt");
CREATE INDEX IF NOT EXISTS "ScrapMemo_projectId_sortOrder_idx" ON "ScrapMemo"("projectId", "sortOrder");
CREATE INDEX IF NOT EXISTS "ScrapMemo_projectId_updatedAt_idx" ON "ScrapMemo"("projectId", "updatedAt");
CREATE INDEX IF NOT EXISTS "ScrapMemo_projectId_sortOrder_updatedAt_idx" ON "ScrapMemo"("projectId", "sortOrder", "updatedAt");
CREATE INDEX IF NOT EXISTS "Term_projectId_term_idx" ON "Term"("projectId", "term");
CREATE INDEX IF NOT EXISTS "Term_projectId_createdAt_idx" ON "Term"("projectId", "createdAt");
CREATE INDEX IF NOT EXISTS "Snapshot_projectId_createdAt_idx" ON "Snapshot"("projectId", "createdAt");
CREATE INDEX IF NOT EXISTS "Snapshot_projectId_chapterId_createdAt_idx" ON "Snapshot"("projectId", "chapterId", "createdAt");
CREATE INDEX IF NOT EXISTS "Snapshot_projectId_type_createdAt_idx" ON "Snapshot"("projectId", "type", "createdAt");
CREATE INDEX IF NOT EXISTS "WorldEntity_projectId_type_idx" ON "WorldEntity"("projectId", "type");
CREATE INDEX IF NOT EXISTS "WorldEntity_projectId_name_idx" ON "WorldEntity"("projectId", "name");
CREATE INDEX IF NOT EXISTS "WorldEntity_projectId_createdAt_idx" ON "WorldEntity"("projectId", "createdAt");
CREATE INDEX IF NOT EXISTS "EntityRelation_projectId_sourceId_idx" ON "EntityRelation"("projectId", "sourceId");
CREATE INDEX IF NOT EXISTS "EntityRelation_projectId_targetId_idx" ON "EntityRelation"("projectId", "targetId");
CREATE INDEX IF NOT EXISTS "EntityRelation_projectId_relation_idx" ON "EntityRelation"("projectId", "relation");
`;
