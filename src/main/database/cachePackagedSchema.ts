export const CACHE_PACKAGED_SCHEMA_REQUIRED_TABLES = [
  "CharacterAppearance",
  "TermAppearance",
  "ChapterSearchDocument",
] as const;

export const CACHE_PACKAGED_SCHEMA_OPTIONAL_FTS_TABLES = [
  "ChapterSearchDocumentFts",
] as const;

type ColumnPatch = {
  table: string;
  column: string;
  sql: string;
};

export const CACHE_PACKAGED_SCHEMA_COLUMN_PATCHES: ReadonlyArray<ColumnPatch> = [
  {
    table: "CharacterAppearance",
    column: "projectId",
    sql: 'ALTER TABLE "CharacterAppearance" ADD COLUMN "projectId" TEXT NOT NULL DEFAULT "";',
  },
  {
    table: "TermAppearance",
    column: "projectId",
    sql: 'ALTER TABLE "TermAppearance" ADD COLUMN "projectId" TEXT NOT NULL DEFAULT "";',
  },
];

export const CACHE_PACKAGED_SCHEMA_REQUIRED_COLUMNS: Readonly<
  Record<string, ReadonlyArray<string>>
> = {
  CharacterAppearance: [
    "id",
    "projectId",
    "characterId",
    "chapterId",
    "position",
  ],
  TermAppearance: ["id", "projectId", "termId", "chapterId", "position"],
  ChapterSearchDocument: [
    "chapterId",
    "projectId",
    "title",
    "searchText",
    "wordCount",
    "chapterOrder",
  ],
};

export const CACHE_PACKAGED_SCHEMA_OPTIONAL_FTS_COLUMNS: Readonly<
  Record<string, ReadonlyArray<string>>
> = {
  ChapterSearchDocumentFts: [
    "chapterId",
    "projectId",
    "title",
    "synopsis",
    "searchText",
  ],
};

export const CACHE_PACKAGED_SCHEMA_BOOTSTRAP_SQL = `
CREATE TABLE IF NOT EXISTS "CharacterAppearance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "context" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS "TermAppearance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "context" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS "ChapterSearchDocument" (
    "chapterId" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "synopsis" TEXT,
    "searchText" TEXT NOT NULL,
    "wordCount" INTEGER NOT NULL,
    "chapterOrder" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "CharacterAppearance_characterId_chapterId_position_key"
  ON "CharacterAppearance"("characterId", "chapterId", "position");
CREATE INDEX IF NOT EXISTS "CharacterAppearance_projectId_chapterId_idx"
  ON "CharacterAppearance"("projectId", "chapterId");
CREATE INDEX IF NOT EXISTS "CharacterAppearance_projectId_characterId_chapterId_idx"
  ON "CharacterAppearance"("projectId", "characterId", "chapterId");
CREATE UNIQUE INDEX IF NOT EXISTS "TermAppearance_termId_chapterId_position_key"
  ON "TermAppearance"("termId", "chapterId", "position");
CREATE INDEX IF NOT EXISTS "TermAppearance_projectId_chapterId_idx"
  ON "TermAppearance"("projectId", "chapterId");
CREATE INDEX IF NOT EXISTS "TermAppearance_projectId_termId_chapterId_idx"
  ON "TermAppearance"("projectId", "termId", "chapterId");
CREATE INDEX IF NOT EXISTS "ChapterSearchDocument_projectId_idx"
  ON "ChapterSearchDocument"("projectId");
CREATE INDEX IF NOT EXISTS "ChapterSearchDocument_projectId_chapterOrder_idx"
  ON "ChapterSearchDocument"("projectId", "chapterOrder");
`;

export const CACHE_PACKAGED_SCHEMA_FTS_BOOTSTRAP_SQL = `
CREATE VIRTUAL TABLE IF NOT EXISTS "ChapterSearchDocumentFts"
USING fts5(
    "chapterId" UNINDEXED,
    "projectId" UNINDEXED,
    "title",
    "synopsis",
    "searchText",
    tokenize = 'unicode61'
);
`;
