// TODO: Remove in Phase 7 — replaced by Drizzle migrations in drizzle/main/
import { ENTITY_RELATION_POINTER_TRIGGER_SQL } from "./entityRelationPointerSql.js";
// Packaged SQLite bootstrap schema mirrors the current local runtime surface.
// It includes canonical project tables, replica tables for detached/offline
// editing, and app-local attachment metadata. `Project.projectPath` remains as
// a legacy fallback column while attachment metadata moves to ProjectAttachment.
export const PACKAGED_SCHEMA_REQUIRED_TABLES = [
  "Project",
  "ProjectAttachment",
  "ProjectLocalState",
  "ProjectSettings",
  "Chapter",
  "Scene",
  "ChapterBody",
  "ChapterRevision",
  "SearchDirtyQueue",
  "MemoryChunk",
  "MemoryBuildJob",
  "MemoryEmbedding",
  "ChapterSummary",
  "Note",
  "Synopsis",
  "Plot",
  "Character",
  "Event",
  "Faction",
  "WorldDocument",
  "ScrapMemo",
  "Term",
  "Snapshot",
  "WorldEntity",
  "EntityRelation",
] as const;

type ColumnPatch = {
  table: string;
  column: string;
  sql: string;
};

type IndexPatch = {
  name: string;
  table: string;
  sql: string;
};

export const PACKAGED_SCHEMA_COLUMN_PATCHES: ReadonlyArray<ColumnPatch> = [
  {
    table: "Term",
    column: "order",
    sql: 'ALTER TABLE "Term" ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0;',
  },
  {
    table: "Snapshot",
    column: "contentLength",
    sql: 'ALTER TABLE "Snapshot" ADD COLUMN "contentLength" INTEGER NOT NULL DEFAULT 0;',
  },
  {
    table: "Snapshot",
    column: "description",
    sql: 'ALTER TABLE "Snapshot" ADD COLUMN "description" TEXT;',
  },
  {
    table: "Project",
    column: "projectPath",
    sql: 'ALTER TABLE "Project" ADD COLUMN "projectPath" TEXT;',
  },
  {
    table: "Chapter",
    column: "synopsis",
    sql: 'ALTER TABLE "Chapter" ADD COLUMN "synopsis" TEXT;',
  },
  {
    table: "MemoryChunk",
    column: "sceneId",
    sql: 'ALTER TABLE "MemoryChunk" ADD COLUMN "sceneId" TEXT;',
  },
  {
    table: "Chapter",
    column: "wordCount",
    sql: 'ALTER TABLE "Chapter" ADD COLUMN "wordCount" INTEGER NOT NULL DEFAULT 0;',
  },
  {
    table: "Chapter",
    column: "deletedAt",
    sql: 'ALTER TABLE "Chapter" ADD COLUMN "deletedAt" DATETIME;',
  },
  {
    table: "Character",
    column: "deletedAt",
    sql: 'ALTER TABLE "Character" ADD COLUMN "deletedAt" DATETIME;',
  },
  {
    table: "Character",
    column: "firstAppearance",
    sql: 'ALTER TABLE "Character" ADD COLUMN "firstAppearance" TEXT;',
  },
  {
    table: "Character",
    column: "attributes",
    sql: 'ALTER TABLE "Character" ADD COLUMN "attributes" TEXT;',
  },
  {
    table: "Event",
    column: "deletedAt",
    sql: 'ALTER TABLE "Event" ADD COLUMN "deletedAt" DATETIME;',
  },
  {
    table: "Faction",
    column: "deletedAt",
    sql: 'ALTER TABLE "Faction" ADD COLUMN "deletedAt" DATETIME;',
  },
  {
    table: "Term",
    column: "deletedAt",
    sql: 'ALTER TABLE "Term" ADD COLUMN "deletedAt" DATETIME;',
  },
  {
    table: "WorldEntity",
    column: "deletedAt",
    sql: 'ALTER TABLE "WorldEntity" ADD COLUMN "deletedAt" DATETIME;',
  },
  {
    table: "Scene",
    column: "deletedAt",
    sql: 'ALTER TABLE "Scene" ADD COLUMN "deletedAt" DATETIME;',
  },
  {
    table: "Note",
    column: "deletedAt",
    sql: 'ALTER TABLE "Note" ADD COLUMN "deletedAt" DATETIME;',
  },
  {
    table: "Synopsis",
    column: "deletedAt",
    sql: 'ALTER TABLE "Synopsis" ADD COLUMN "deletedAt" DATETIME;',
  },
  {
    table: "Plot",
    column: "deletedAt",
    sql: 'ALTER TABLE "Plot" ADD COLUMN "deletedAt" DATETIME;',
  },
  {
    table: "ScrapMemo",
    column: "deletedAt",
    sql: 'ALTER TABLE "ScrapMemo" ADD COLUMN "deletedAt" DATETIME;',
  },
  {
    table: "ProjectSettings",
    column: "llmModelPath",
    sql: 'ALTER TABLE "ProjectSettings" ADD COLUMN "llmModelPath" TEXT;',
  },
  {
    table: "ProjectSettings",
    column: "llmEmbeddingModelPath",
    sql: 'ALTER TABLE "ProjectSettings" ADD COLUMN "llmEmbeddingModelPath" TEXT;',
  },
  {
    table: "ProjectSettings",
    column: "llmEmbeddingDimension",
    sql: 'ALTER TABLE "ProjectSettings" ADD COLUMN "llmEmbeddingDimension" INTEGER NOT NULL DEFAULT 1024;',
  },
  {
    table: "ProjectSettings",
    column: "llmProviderHint",
    sql: 'ALTER TABLE "ProjectSettings" ADD COLUMN "llmProviderHint" TEXT;',
  },
  {
    table: "ChapterSummary",
    column: "contentHash",
    sql: 'ALTER TABLE "ChapterSummary" ADD COLUMN "contentHash" TEXT NOT NULL DEFAULT "";',
  },
];

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
    name: "ScrapMemo_projectId_sortOrder_updatedAt_desc_idx",
    table: "ScrapMemo",
    sql: 'CREATE INDEX IF NOT EXISTS "ScrapMemo_projectId_sortOrder_updatedAt_desc_idx" ON "ScrapMemo"("projectId", "sortOrder", "updatedAt" DESC);',
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
];

export const PACKAGED_SCHEMA_REQUIRED_COLUMNS: Readonly<Record<string, ReadonlyArray<string>>> = {
  // `projectPath` stays as a legacy compatibility column for now, but it is not
  // a required canonical project field for bootstrap integrity checks.
  Project: ["id", "title"],
  ProjectAttachment: ["projectId", "projectPath"],
  ProjectLocalState: ["projectId", "lastOpenedAt"],
  ProjectSettings: [
    "id",
    "projectId",
    "autoSave",
    "autoSaveInterval",
    "llmModelPath",
    "llmEmbeddingModelPath",
    "llmEmbeddingDimension",
    "llmProviderHint",
  ],
  Chapter: ["id", "projectId", "order", "wordCount", "deletedAt"],
  Scene: ["id", "projectId", "chapterId", "title", "body", "order", "deletedAt"],
  ChapterBody: ["chapterId", "content", "contentHash", "updatedAt"],
  ChapterRevision: ["id", "chapterId", "contentHash", "content", "reason"],
  SearchDirtyQueue: [
    "id",
    "projectId",
    "sourceType",
    "sourceId",
    "reason",
    "status",
    "attempts",
  ],
  MemoryChunk: [
    "id",
    "projectId",
    "sourceType",
    "sourceId",
    "chunkIndex",
    "content",
    "contentHash",
    "sceneId",
  ],
  MemoryBuildJob: [
    "id",
    "projectId",
    "targetType",
    "targetId",
    "jobType",
    "status",
    "priority",
  ],
  MemoryEmbedding: [
    "id",
    "chunkId",
    "projectId",
    "contentHash",
    "vec",
    "dimension",
  ],
  ChapterSummary: [
    "id",
    "projectId",
    "chapterId",
    "chapterNumber",
    "summary",
    "contentHash",
    "isFallback",
    "model",
    "generatedAt",
  ],
  Note: ["id", "projectId", "title", "body", "deletedAt"],
  Synopsis: ["id", "projectId", "title", "body", "deletedAt"],
  Plot: ["id", "projectId", "title", "body", "deletedAt"],
  Character: ["id", "projectId", "firstAppearance", "attributes", "deletedAt"],
  Event: ["id", "projectId", "name", "deletedAt"],
  Faction: ["id", "projectId", "name", "deletedAt"],
  WorldDocument: ["id", "projectId", "docType", "payload"],
  ScrapMemo: ["id", "projectId", "title", "content", "tags", "sortOrder", "updatedAt", "deletedAt"],
  Term: ["id", "projectId", "term", "order", "deletedAt"],
  Snapshot: ["id", "projectId", "content", "contentLength", "type"],
  WorldEntity: ["id", "projectId", "type", "name", "positionX", "positionY", "deletedAt"],
  EntityRelation: ["id", "projectId", "sourceId", "targetId", "relation"],
};

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
    "contentHash" TEXT NOT NULL DEFAULT "",
    "isFallback" INTEGER NOT NULL DEFAULT 0,
    "model" TEXT,
    "generatedAt" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ChapterSummary_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
CREATE INDEX IF NOT EXISTS "MemoryBuildJob_projectId_status_priority_idx" ON "MemoryBuildJob"("projectId", "status", "priority");
CREATE INDEX IF NOT EXISTS "MemoryBuildJob_target_idx" ON "MemoryBuildJob"("targetType", "targetId");
CREATE UNIQUE INDEX IF NOT EXISTS "MemoryEmbedding_chunkId_key" ON "MemoryEmbedding"("chunkId");
CREATE INDEX IF NOT EXISTS "MemoryEmbedding_projectId_idx" ON "MemoryEmbedding"("projectId");
CREATE UNIQUE INDEX IF NOT EXISTS "ChapterSummary_chapterId_key" ON "ChapterSummary"("chapterId");
CREATE INDEX IF NOT EXISTS "ChapterSummary_projectId_idx" ON "ChapterSummary"("projectId");
CREATE INDEX IF NOT EXISTS "Note_projectId_updatedAt_idx" ON "Note"("projectId", "updatedAt");
CREATE INDEX IF NOT EXISTS "Synopsis_projectId_updatedAt_idx" ON "Synopsis"("projectId", "updatedAt");
CREATE INDEX IF NOT EXISTS "Plot_projectId_updatedAt_idx" ON "Plot"("projectId", "updatedAt");
CREATE INDEX IF NOT EXISTS "Character_projectId_name_idx" ON "Character"("projectId", "name");
CREATE INDEX IF NOT EXISTS "Event_projectId_name_idx" ON "Event"("projectId", "name");
CREATE INDEX IF NOT EXISTS "Faction_projectId_name_idx" ON "Faction"("projectId", "name");
CREATE UNIQUE INDEX IF NOT EXISTS "WorldDocument_projectId_docType_key" ON "WorldDocument"("projectId", "docType");
CREATE INDEX IF NOT EXISTS "WorldDocument_projectId_updatedAt_idx" ON "WorldDocument"("projectId", "updatedAt");
CREATE INDEX IF NOT EXISTS "ScrapMemo_projectId_sortOrder_idx" ON "ScrapMemo"("projectId", "sortOrder");
CREATE INDEX IF NOT EXISTS "ScrapMemo_projectId_updatedAt_idx" ON "ScrapMemo"("projectId", "updatedAt");
CREATE INDEX IF NOT EXISTS "Term_projectId_term_idx" ON "Term"("projectId", "term");
CREATE INDEX IF NOT EXISTS "Snapshot_projectId_createdAt_idx" ON "Snapshot"("projectId", "createdAt");
CREATE INDEX IF NOT EXISTS "Snapshot_projectId_chapterId_createdAt_idx" ON "Snapshot"("projectId", "chapterId", "createdAt");
CREATE INDEX IF NOT EXISTS "Snapshot_projectId_type_createdAt_idx" ON "Snapshot"("projectId", "type", "createdAt");
CREATE INDEX IF NOT EXISTS "WorldEntity_projectId_type_idx" ON "WorldEntity"("projectId", "type");
CREATE INDEX IF NOT EXISTS "WorldEntity_projectId_name_idx" ON "WorldEntity"("projectId", "name");
CREATE INDEX IF NOT EXISTS "EntityRelation_projectId_sourceId_idx" ON "EntityRelation"("projectId", "sourceId");
CREATE INDEX IF NOT EXISTS "EntityRelation_projectId_targetId_idx" ON "EntityRelation"("projectId", "targetId");
CREATE INDEX IF NOT EXISTS "EntityRelation_projectId_relation_idx" ON "EntityRelation"("projectId", "relation");
${ENTITY_RELATION_POINTER_TRIGGER_SQL}
`;
