// TODO: Remove in Phase 7 — replaced by Drizzle migrations in drizzle/main/
import { ENTITY_RELATION_POINTER_TRIGGER_SQL } from "./entityRelationPointerSql.js";
// Packaged SQLite bootstrap schema mirrors the current local runtime surface.
// It includes canonical project tables, replica tables for detached/offline
// editing, and app-local attachment metadata. `Project.projectPath` remains as
// a legacy fallback column while attachment metadata moves to ProjectAttachment.
export {
  PACKAGED_SCHEMA_COLUMN_PATCHES,
  PACKAGED_SCHEMA_INDEX_PATCHES,
  PACKAGED_SCHEMA_REQUIRED_COLUMNS,
  PACKAGED_SCHEMA_REQUIRED_TABLES,
} from "../packagedSchema/index.js";

export const PACKAGED_SCHEMA_BOOTSTRAP_SQL = `
CREATE TABLE IF NOT EXISTS "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "projectPath" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE TABLE IF NOT EXISTS "ProjectAttachment" (
    "projectId" TEXT NOT NULL PRIMARY KEY,
    "projectPath" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProjectAttachment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "ProjectLocalState" (
    "projectId" TEXT NOT NULL PRIMARY KEY,
    "lastOpenedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProjectLocalState_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "ProjectSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "autoSave" BOOLEAN NOT NULL DEFAULT 1,
    "autoSaveInterval" INTEGER NOT NULL DEFAULT 30,
    "llmModelPath" TEXT,
    "llmEmbeddingModelPath" TEXT,
    "llmEmbeddingDimension" INTEGER NOT NULL DEFAULT 1024,
    "llmProviderHint" TEXT,
    CONSTRAINT "ProjectSettings_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "Chapter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "synopsis" TEXT,
    "order" INTEGER NOT NULL,
    "wordCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "Chapter_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "Scene" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "startOffset" INTEGER,
    "endOffset" INTEGER,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "Scene_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Scene_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "ChapterBody" (
    "chapterId" TEXT NOT NULL PRIMARY KEY,
    "content" TEXT NOT NULL DEFAULT '',
    "contentHash" TEXT NOT NULL DEFAULT '',
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ChapterBody_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "ChapterRevision" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chapterId" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChapterRevision_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "SearchDirtyQueue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SearchDirtyQueue_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "MemoryChunk" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "chapterId" TEXT,
    "sceneId" TEXT,
    "chunkIndex" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "indexText" TEXT NOT NULL DEFAULT '',
    "indexTextHash" TEXT NOT NULL DEFAULT '',
    "contextLabel" TEXT,
    "sourceContentHash" TEXT NOT NULL DEFAULT '',
    "startOffset" INTEGER,
    "endOffset" INTEGER,
    "tokenCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MemoryChunk_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "MemoryBuildJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "jobType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "priority" INTEGER NOT NULL DEFAULT 50,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MemoryBuildJob_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "MemoryEmbedding" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chunkId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL DEFAULT '',
    "vec" BLOB NOT NULL,
    "dimension" INTEGER NOT NULL,
    "model" TEXT,
    "createdAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TEXT NOT NULL,
    CONSTRAINT "MemoryEmbedding_chunkId_fkey" FOREIGN KEY ("chunkId") REFERENCES "MemoryChunk" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "ChapterSummary" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "chapterNumber" INTEGER NOT NULL DEFAULT 0,
    "summary" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL DEFAULT '',
    "isFallback" INTEGER NOT NULL DEFAULT false,
    "model" TEXT,
    "generatedAt" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ChapterSummary_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "MemoryEvalCase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "caseType" TEXT NOT NULL DEFAULT 'qa',
    "expectedAnswer" TEXT,
    "temporalScopeStartChapterId" TEXT,
    "temporalScopeEndChapterId" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'p1',
    "createdAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TEXT NOT NULL,
    CONSTRAINT "MemoryEvalCase_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "MemoryEvalEvidence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "chapterId" TEXT,
    "expectedChunkId" TEXT,
    "startOffset" INTEGER,
    "endOffset" INTEGER,
    "quote" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TEXT NOT NULL,
    CONSTRAINT "MemoryEvalEvidence_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "MemoryEvalCase" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MemoryEvalEvidence_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MemoryEvalEvidence_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "MemoryEvalEntity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "expectedAttributes" TEXT,
    "createdAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TEXT NOT NULL,
    CONSTRAINT "MemoryEvalEntity_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "MemoryEvalCase" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MemoryEvalEntity_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "MemoryEvalRelation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "targetName" TEXT NOT NULL,
    "relation" TEXT NOT NULL,
    "temporalScope" TEXT,
    "expectedAttributes" TEXT,
    "createdAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TEXT NOT NULL,
    CONSTRAINT "MemoryEvalRelation_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "MemoryEvalCase" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MemoryEvalRelation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "MemoryEvalRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "engineVersion" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'running',
    "startedAt" TEXT NOT NULL,
    "completedAt" TEXT,
    "createdAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TEXT NOT NULL,
    CONSTRAINT "MemoryEvalRun_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "MemoryEvalResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "groundingStatus" TEXT NOT NULL,
    "evidenceHitCount" INTEGER NOT NULL DEFAULT 0,
    "evidenceMissCount" INTEGER NOT NULL DEFAULT 0,
    "contextRecallAtK" REAL NOT NULL DEFAULT 0,
    "p0FailureCount" INTEGER NOT NULL DEFAULT 0,
    "p0Failures" TEXT NOT NULL DEFAULT '[]',
    "answer" TEXT,
    "createdAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TEXT NOT NULL,
    CONSTRAINT "MemoryEvalResult_runId_fkey" FOREIGN KEY ("runId") REFERENCES "MemoryEvalRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MemoryEvalResult_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "MemoryEvalCase" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MemoryEvalResult_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
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
    "positionX" REAL NOT NULL DEFAULT 0,
    "positionY" REAL NOT NULL DEFAULT 0,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WorldEntity_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
CREATE INDEX IF NOT EXISTS "MemoryChunk_projectId_source_idx" ON "MemoryChunk"("projectId", "sourceType", "sourceId");
CREATE INDEX IF NOT EXISTS "MemoryChunk_projectId_chapterId_idx" ON "MemoryChunk"("projectId", "chapterId");
CREATE INDEX IF NOT EXISTS "MemoryChunk_projectId_sceneId_idx" ON "MemoryChunk"("projectId", "sceneId");
CREATE INDEX IF NOT EXISTS "MemoryBuildJob_projectId_status_priority_idx" ON "MemoryBuildJob"("projectId", "status", "priority");
CREATE INDEX IF NOT EXISTS "MemoryBuildJob_target_idx" ON "MemoryBuildJob"("targetType", "targetId");
CREATE UNIQUE INDEX IF NOT EXISTS "MemoryEmbedding_chunkId_key" ON "MemoryEmbedding"("chunkId");
CREATE INDEX IF NOT EXISTS "MemoryEmbedding_projectId_idx" ON "MemoryEmbedding"("projectId");
CREATE UNIQUE INDEX IF NOT EXISTS "ChapterSummary_chapterId_key" ON "ChapterSummary"("chapterId");
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
CREATE INDEX IF NOT EXISTS "MemoryEntity_projectId_type_idx" ON "MemoryEntity"("projectId", "entityType");
CREATE INDEX IF NOT EXISTS "MemoryEntity_projectId_status_idx" ON "MemoryEntity"("projectId", "status");
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
CREATE INDEX IF NOT EXISTS "MemoryEpisodeParticipant_episodeId_idx" ON "MemoryEpisodeParticipant"("episodeId");
CREATE INDEX IF NOT EXISTS "MemoryEpisodeEvidence_episodeId_idx" ON "MemoryEpisodeEvidence"("episodeId");
CREATE INDEX IF NOT EXISTS "MemoryEpisodeEvidence_projectId_chapterId_idx" ON "MemoryEpisodeEvidence"("projectId", "chapterId");
CREATE INDEX IF NOT EXISTS "MemoryStateChangeCandidate_episodeId_idx" ON "MemoryStateChangeCandidate"("episodeId");
CREATE INDEX IF NOT EXISTS "MemoryStateChangeCandidate_projectId_status_idx" ON "MemoryStateChangeCandidate"("projectId", "status");
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
${ENTITY_RELATION_POINTER_TRIGGER_SQL}
`;
