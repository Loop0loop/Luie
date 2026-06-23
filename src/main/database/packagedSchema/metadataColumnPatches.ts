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
  {
    table: "MemoryEntity",
    column: "rejectedAt",
    sql: 'ALTER TABLE "MemoryEntity" ADD COLUMN "rejectedAt" TEXT;',
  },
  {
    table: "MemoryEntity",
    column: "rejectionReason",
    sql: 'ALTER TABLE "MemoryEntity" ADD COLUMN "rejectionReason" TEXT;',
  },
  {
    table: "MemoryEntityAlias",
    column: "rejectedAt",
    sql: 'ALTER TABLE "MemoryEntityAlias" ADD COLUMN "rejectedAt" TEXT;',
  },
  {
    table: "MemoryEntityAlias",
    column: "rejectionReason",
    sql: 'ALTER TABLE "MemoryEntityAlias" ADD COLUMN "rejectionReason" TEXT;',
  },
  {
    table: "MemoryEntity",
    column: "provenanceKind",
    sql: 'ALTER TABLE "MemoryEntity" ADD COLUMN "provenanceKind" TEXT NOT NULL DEFAULT \'unknown\';',
  },
  {
    table: "MemoryEntity",
    column: "canonStatus",
    sql: 'ALTER TABLE "MemoryEntity" ADD COLUMN "canonStatus" TEXT NOT NULL DEFAULT \'unknown\';',
  },
  {
    table: "MemoryEpisode",
    column: "provenanceKind",
    sql: 'ALTER TABLE "MemoryEpisode" ADD COLUMN "provenanceKind" TEXT NOT NULL DEFAULT \'unknown\';',
  },
  {
    table: "MemoryEpisode",
    column: "canonStatus",
    sql: 'ALTER TABLE "MemoryEpisode" ADD COLUMN "canonStatus" TEXT NOT NULL DEFAULT \'unknown\';',
  },
  {
    table: "MemoryEpisodeEvidence",
    column: "provenanceKind",
    sql: 'ALTER TABLE "MemoryEpisodeEvidence" ADD COLUMN "provenanceKind" TEXT NOT NULL DEFAULT \'unknown\';',
  },
  {
    table: "MemoryEpisodeEvidence",
    column: "canonStatus",
    sql: 'ALTER TABLE "MemoryEpisodeEvidence" ADD COLUMN "canonStatus" TEXT NOT NULL DEFAULT \'unknown\';',
  },
  {
    table: "MemoryEntityAlias",
    column: "provenanceKind",
    sql: 'ALTER TABLE "MemoryEntityAlias" ADD COLUMN "provenanceKind" TEXT NOT NULL DEFAULT \'unknown\';',
  },
  {
    table: "MemoryEntityAlias",
    column: "canonStatus",
    sql: 'ALTER TABLE "MemoryEntityAlias" ADD COLUMN "canonStatus" TEXT NOT NULL DEFAULT \'unknown\';',
  },
  {
    table: "MemoryEntityMention",
    column: "provenanceKind",
    sql: 'ALTER TABLE "MemoryEntityMention" ADD COLUMN "provenanceKind" TEXT NOT NULL DEFAULT \'unknown\';',
  },
  {
    table: "MemoryEntityMention",
    column: "canonStatus",
    sql: 'ALTER TABLE "MemoryEntityMention" ADD COLUMN "canonStatus" TEXT NOT NULL DEFAULT \'unknown\';',
  },
  {
    table: "MemoryEntityMention",
    column: "reviewStatus",
    sql: 'ALTER TABLE "MemoryEntityMention" ADD COLUMN "reviewStatus" TEXT NOT NULL DEFAULT \'pending\';',
  },
  {
    table: "MemoryEntityMention",
    column: "reviewerNote",
    sql: 'ALTER TABLE "MemoryEntityMention" ADD COLUMN "reviewerNote" TEXT;',
  },
  {
    table: "MemoryEntityMention",
    column: "reviewedAt",
    sql: 'ALTER TABLE "MemoryEntityMention" ADD COLUMN "reviewedAt" TEXT;',
  },
  {
    table: "MemoryEpisodeEvidence",
    column: "reviewStatus",
    sql: 'ALTER TABLE "MemoryEpisodeEvidence" ADD COLUMN "reviewStatus" TEXT NOT NULL DEFAULT \'pending\';',
  },
  {
    table: "MemoryEpisodeEvidence",
    column: "reviewerNote",
    sql: 'ALTER TABLE "MemoryEpisodeEvidence" ADD COLUMN "reviewerNote" TEXT;',
  },
  {
    table: "MemoryEpisodeEvidence",
    column: "reviewedAt",
    sql: 'ALTER TABLE "MemoryEpisodeEvidence" ADD COLUMN "reviewedAt" TEXT;',
  },
  {
    table: "MemoryEvalCase",
    column: "queryChapterOrder",
    sql: 'ALTER TABLE "MemoryEvalCase" ADD COLUMN "queryChapterOrder" INTEGER;',
  },
  {
    table: "MemoryFactInvalidation",
    column: "reviewStatus",
    sql: 'ALTER TABLE "MemoryFactInvalidation" ADD COLUMN "reviewStatus" TEXT NOT NULL DEFAULT \'pending\';',
  },
  {
    table: "MemoryFactInvalidation",
    column: "reviewerNote",
    sql: 'ALTER TABLE "MemoryFactInvalidation" ADD COLUMN "reviewerNote" TEXT;',
  },
  {
    table: "MemoryFactInvalidation",
    column: "reviewedAt",
    sql: 'ALTER TABLE "MemoryFactInvalidation" ADD COLUMN "reviewedAt" TEXT;',
  },
];
