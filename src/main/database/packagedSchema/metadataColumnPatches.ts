import type { ColumnPatch } from "./metadataTypes.js";
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
    table: "MemoryChunk",
    column: "indexText",
    sql: 'ALTER TABLE "MemoryChunk" ADD COLUMN "indexText" TEXT NOT NULL DEFAULT \'\';',
  },
  {
    table: "MemoryChunk",
    column: "indexTextHash",
    sql: 'ALTER TABLE "MemoryChunk" ADD COLUMN "indexTextHash" TEXT NOT NULL DEFAULT \'\';',
  },
  {
    table: "MemoryChunk",
    column: "contextLabel",
    sql: 'ALTER TABLE "MemoryChunk" ADD COLUMN "contextLabel" TEXT;',
  },
  {
    table: "MemoryChunk",
    column: "sourceContentHash",
    sql: 'ALTER TABLE "MemoryChunk" ADD COLUMN "sourceContentHash" TEXT NOT NULL DEFAULT \'\';',
  },
  {
    table: "MemoryChunk",
    column: "paragraphStartIndex",
    sql: 'ALTER TABLE "MemoryChunk" ADD COLUMN "paragraphStartIndex" INTEGER NOT NULL DEFAULT 0;',
  },
  {
    table: "MemoryChunk",
    column: "paragraphEndIndex",
    sql: 'ALTER TABLE "MemoryChunk" ADD COLUMN "paragraphEndIndex" INTEGER NOT NULL DEFAULT 0;',
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
    table: "WorldEntity",
    column: "memoryEntityId",
    sql: 'ALTER TABLE "WorldEntity" ADD COLUMN "memoryEntityId" TEXT;',
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
    sql: "ALTER TABLE \"ChapterSummary\" ADD COLUMN \"contentHash\" TEXT NOT NULL DEFAULT '';",
  },
  {
    table: "MemoryEvalResult",
    column: "answerJudgeJson",
    sql: 'ALTER TABLE "MemoryEvalResult" ADD COLUMN "answerJudgeJson" TEXT;',
  },
  {
    table: "MemoryFact",
    column: "provenanceKind",
    sql: 'ALTER TABLE "MemoryFact" ADD COLUMN "provenanceKind" TEXT NOT NULL DEFAULT \'unknown\';',
  },
  {
    table: "MemoryFact",
    column: "canonStatus",
    sql: 'ALTER TABLE "MemoryFact" ADD COLUMN "canonStatus" TEXT NOT NULL DEFAULT \'unknown\';',
  },
];
