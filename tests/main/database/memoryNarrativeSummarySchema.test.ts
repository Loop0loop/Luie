import { createRequire } from "node:module";
import * as os from "node:os";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { PACKAGED_SCHEMA_BOOTSTRAP_SQL } from "../../../src/main/database/main/packagedSchema.js";

type DatabaseSyncInstance = {
  close: () => void;
  exec: (sql: string) => void;
};

type DatabaseSyncConstructor = new (path: string) => DatabaseSyncInstance;

const require = createRequire(import.meta.url);

function loadDatabaseSync(): DatabaseSyncConstructor | undefined {
  try {
    return (require("node:sqlite") as { DatabaseSync: DatabaseSyncConstructor }).DatabaseSync;
  } catch {
    return undefined;
  }
}

const DatabaseSync = loadDatabaseSync();
const describeWithNodeSqlite = DatabaseSync ? describe : describe.skip;

function createDatabase(): DatabaseSyncInstance {
  if (!DatabaseSync) {
    throw new Error("node:sqlite DatabaseSync requires Node.js 22.5.0 or newer");
  }
  const dbPath = path.join(os.tmpdir(), `luie-memory-summary-${Date.now()}-${Math.random()}.sqlite`);
  const db = new DatabaseSync(dbPath);
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec(PACKAGED_SCHEMA_BOOTSTRAP_SQL);
  return db;
}

function seedProjectAndSummary(db: DatabaseSyncInstance, projectId: string, summaryId: string): void {
  db.exec(`
    INSERT INTO "Project" ("id", "title", "updatedAt") VALUES ('${projectId}', '${projectId}', CURRENT_TIMESTAMP);
    INSERT INTO "MemoryNarrativeSummary" (
      "id", "projectId", "summaryType", "scopeType", "title", "summary",
      "extractorVersion", "sourceContentHash", "updatedAt"
    ) VALUES (
      '${summaryId}', '${projectId}', 'project', 'project', 'Summary', 'Body',
      'test', 'hash-${summaryId}', CURRENT_TIMESTAMP
    );
  `);
}

function seedChapterSummary(db: DatabaseSyncInstance, projectId: string, chapterId: string, summaryId: string): void {
  db.exec(`
    INSERT INTO "Chapter" ("id", "projectId", "title", "order", "updatedAt")
    VALUES ('${chapterId}', '${projectId}', '${chapterId}', 1, CURRENT_TIMESTAMP);
    INSERT INTO "ChapterSummary" (
      "id", "projectId", "chapterId", "chapterNumber", "summary", "generatedAt", "updatedAt"
    ) VALUES (
      '${summaryId}', '${projectId}', '${chapterId}', 1, 'chapter summary', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    );
  `);
}

describeWithNodeSqlite("MemoryNarrativeSummary schema constraints", () => {
  it("rejects summary sources without exactly one source pointer", () => {
    const db = createDatabase();
    try {
      seedProjectAndSummary(db, "project-a", "summary-a");

      expect(() => db.exec(`
        INSERT INTO "MemoryNarrativeSummarySource" (
          "id", "projectId", "summaryId", "sourceType", "contentHash", "updatedAt"
        ) VALUES (
          'source-a', 'project-a', 'summary-a', 'fact', 'hash-source-a', CURRENT_TIMESTAMP
        );
      `)).toThrow();
    } finally {
      db.close();
    }
  });

  it("rejects cross-project summary source links", () => {
    const db = createDatabase();
    try {
      seedProjectAndSummary(db, "project-a", "summary-a");
      seedProjectAndSummary(db, "project-b", "summary-b");
      seedChapterSummary(db, "project-a", "chapter-a", "chapter-summary-a");

      expect(() => db.exec(`
        INSERT INTO "MemoryNarrativeSummarySource" (
          "id", "projectId", "summaryId", "sourceType", "chapterSummaryId", "contentHash", "updatedAt"
        ) VALUES (
          'source-cross', 'project-a', 'summary-b', 'chapter_summary', 'chapter-summary-a',
          'hash-source-cross', CURRENT_TIMESTAMP
        );
      `)).toThrow();
    } finally {
      db.close();
    }
  });
});
