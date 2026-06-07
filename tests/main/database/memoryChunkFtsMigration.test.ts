/**
 * MemoryChunkFts trigram 토크나이저 마이그레이션 테스트.
 *
 * - unicode61(레거시) → trigram 재생성 + 재색인 검증
 * - 한국어 부분 일치(3자+) 매칭 검증
 * - idempotent(이미 trigram 이면 no-op) 검증
 *
 * better-sqlite3 ABI 불일치 환경(node 버전 mismatch)에서는 자동 skip.
 */
import { afterEach, describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import * as os from "node:os";
import * as path from "node:path";
import * as fs from "node:fs";
import {
  backfillMemoryChunkIndexText,
  ensureMemoryChunkFtsTrigram,
  MEMORY_CHUNK_FTS_CREATE_SQL,
} from "../../../src/main/database/main/memoryChunkFtsMigration.js";

const require = createRequire(import.meta.url);

type DatabaseSyncInstance = {
  close: () => void;
  exec: (sql: string) => void;
  prepare: (sql: string) => {
    get: (...params: unknown[]) => unknown;
    run: (...params: unknown[]) => { changes?: number | bigint };
    all: (...params: unknown[]) => unknown[];
  };
};
type DatabaseSyncConstructor = new (path: string) => DatabaseSyncInstance;

function loadDatabaseSync(): DatabaseSyncConstructor | undefined {
  try {
    return (require("node:sqlite") as { DatabaseSync: DatabaseSyncConstructor })
      .DatabaseSync;
  } catch {
    return undefined;
  }
}

const DatabaseSync = loadDatabaseSync();
const describeWithSqlite = DatabaseSync ? describe : describe.skip;

/**
 * node:sqlite 인스턴스를 better-sqlite3 와 호환되는 표면으로 감싼다.
 * 마이그레이션 모듈은 `.transaction(fn)` (better-sqlite3) 을 사용하므로
 * 즉시 실행 트랜잭션 래퍼를 제공한다.
 */
type MigrationDbLike = Parameters<typeof ensureMemoryChunkFtsTrigram>[0];

function wrapAsBetterSqlite(db: DatabaseSyncInstance): MigrationDbLike {
  return {
    prepare: (sql: string) => db.prepare(sql),
    exec: (sql: string) => db.exec(sql),
    transaction: (<Fn extends (...args: unknown[]) => unknown>(fn: Fn) => {
      return (...args: Parameters<Fn>) => {
        db.exec("BEGIN");
        try {
          const result = fn(...args);
          db.exec("COMMIT");
          return result;
        } catch (error) {
          db.exec("ROLLBACK");
          throw error;
        }
      };
    }) as unknown as MigrationDbLike["transaction"],
  } as unknown as MigrationDbLike;
}

const logger = { info: () => {}, warn: () => {} };

const tempFiles: string[] = [];
function tempDbPath(): string {
  const p = path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), "luie-fts-")),
    "test.sqlite",
  );
  tempFiles.push(p);
  return p;
}

function createChunkTable(db: DatabaseSyncInstance): void {
  db.exec(`CREATE TABLE "MemoryChunk" (
    "id" TEXT PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL DEFAULT 'chapter',
    "sourceId" TEXT NOT NULL DEFAULT '',
    "chapterId" TEXT,
    "chunkIndex" INTEGER NOT NULL DEFAULT 0,
    "content" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL DEFAULT '',
    "indexText" TEXT NOT NULL DEFAULT '',
    "indexTextHash" TEXT NOT NULL DEFAULT '',
    "contextLabel" TEXT,
    "sourceContentHash" TEXT NOT NULL DEFAULT '',
    "updatedAt" TEXT NOT NULL DEFAULT ''
  );`);
}

function insertChunk(
  db: DatabaseSyncInstance,
  id: string,
  projectId: string,
  content: string,
): void {
  db.prepare(
    `INSERT INTO "MemoryChunk" ("id","projectId","chapterId","content") VALUES (?,?,?,?)`,
  ).run(id, projectId, "ch-1", content);
}

function ftsTokenizer(db: DatabaseSyncInstance): string {
  const row = db
    .prepare(
      "SELECT sql FROM sqlite_master WHERE name='MemoryChunkFts' LIMIT 1;",
    )
    .get() as { sql?: string } | undefined;
  return row?.sql ?? "";
}

describeWithSqlite("ensureMemoryChunkFtsTrigram", () => {
  afterEach(() => {
    for (const p of tempFiles.splice(0)) {
      try {
        fs.rmSync(path.dirname(p), { recursive: true, force: true });
      } catch {
        /* noop */
      }
    }
  });

  it("re-indexes legacy FTS from indexText when contextual index text exists", () => {
    const db = new DatabaseSync!(tempDbPath());
    try {
      createChunkTable(db);
      insertChunk(db, "c1", "p1", "사절단은 조용히 문서를 접었다");
      db.prepare(
        `UPDATE "MemoryChunk" SET "indexText" = ?, "indexTextHash" = ? WHERE "id" = ?`,
      ).run("[chapter: 은하궁 회담]\n사절단은 조용히 문서를 접었다", "hash", "c1");
      db.exec(
        `CREATE VIRTUAL TABLE "MemoryChunkFts" USING fts5("chunkId" UNINDEXED, "projectId" UNINDEXED, "chapterId" UNINDEXED, "content", tokenize='unicode61');`,
      );

      const reindexed = ensureMemoryChunkFtsTrigram(wrapAsBetterSqlite(db), logger);
      expect(reindexed).toBe(1);

      const rows = db
        .prepare(
          `SELECT "chunkId" FROM "MemoryChunkFts" WHERE "MemoryChunkFts" MATCH ?`,
        )
        .all("은하궁") as Array<{ chunkId: string }>;
      expect(rows.map((r) => r.chunkId)).toEqual(["c1"]);
    } finally {
      db.close();
    }
  });

  it("backfills existing chunks without pretending chunk hash is source hash", () => {
    const db = new DatabaseSync!(tempDbPath());
    try {
      createChunkTable(db);
      insertChunk(db, "c1", "p1", "사절단은 조용히 문서를 접었다");
      const changed = backfillMemoryChunkIndexText(wrapAsBetterSqlite(db), logger);
      expect(changed).toBe(1);

      const row = db
        .prepare(
          `SELECT "indexText", "indexTextHash", "sourceContentHash", "contentHash"
           FROM "MemoryChunk" WHERE "id" = ?`,
        )
        .get("c1") as {
          indexText: string;
          indexTextHash: string;
          sourceContentHash: string;
          contentHash: string;
        };
      expect(row.indexText).toBe("사절단은 조용히 문서를 접었다");
      expect(row.indexTextHash).toBe(row.contentHash);
      expect(row.sourceContentHash).toBe("");
    } finally {
      db.close();
    }
  });

  it("re-indexes stale trigram FTS rows when indexText differs from FTS content", () => {
    const db = new DatabaseSync!(tempDbPath());
    try {
      createChunkTable(db);
      insertChunk(db, "c1", "p1", "사절단은 조용히 문서를 접었다");
      db.prepare(
        `UPDATE "MemoryChunk" SET "indexText" = ?, "indexTextHash" = ? WHERE "id" = ?`,
      ).run("[chapter: 은하궁 회담]\n사절단은 조용히 문서를 접었다", "hash", "c1");
      db.exec(MEMORY_CHUNK_FTS_CREATE_SQL);
      db.exec(
        `INSERT INTO "MemoryChunkFts" ("chunkId","projectId","chapterId","content") SELECT "id","projectId","chapterId","content" FROM "MemoryChunk";`,
      );

      const reindexed = ensureMemoryChunkFtsTrigram(wrapAsBetterSqlite(db), logger);
      expect(reindexed).toBe(1);

      const rows = db
        .prepare(
          `SELECT "chunkId" FROM "MemoryChunkFts" WHERE "MemoryChunkFts" MATCH ?`,
        )
        .all("은하궁") as Array<{ chunkId: string }>;
      expect(rows.map((r) => r.chunkId)).toEqual(["c1"]);
    } finally {
      db.close();
    }
  });

  it("migrates legacy unicode61 FTS to trigram and re-indexes chunks", () => {
    const db = new DatabaseSync!(tempDbPath());
    try {
      createChunkTable(db);
      insertChunk(db, "c1", "p1", "진서가 마차를 습격했다");
      insertChunk(db, "c2", "p1", "세린은 그림자 길드의 첩보원이다");

      // 레거시 unicode61 FTS 생성 + 색인
      db.exec(
        `CREATE VIRTUAL TABLE "MemoryChunkFts" USING fts5("chunkId" UNINDEXED, "projectId" UNINDEXED, "chapterId" UNINDEXED, "content", tokenize='unicode61');`,
      );
      db.exec(
        `INSERT INTO "MemoryChunkFts" ("chunkId","projectId","chapterId","content") SELECT "id","projectId","chapterId","content" FROM "MemoryChunk";`,
      );

      // unicode61 에서는 부분 일치 "마차" 가 안 됨(전제 검증)
      const beforeRows = db
        .prepare(
          `SELECT "chunkId" FROM "MemoryChunkFts" WHERE "MemoryChunkFts" MATCH ?`,
        )
        .all("마차") as Array<{ chunkId: string }>;
      expect(beforeRows.length).toBe(0);

      const reindexed = ensureMemoryChunkFtsTrigram(wrapAsBetterSqlite(db), logger);
      expect(reindexed).toBe(2);
      expect(ftsTokenizer(db)).toMatch(/trigram/);

      // trigram 에서는 부분 일치(3자+) 가 됨
      const afterRows = db
        .prepare(
          `SELECT "chunkId" FROM "MemoryChunkFts" WHERE "MemoryChunkFts" MATCH ?`,
        )
        .all("마차를") as Array<{ chunkId: string }>;
      expect(afterRows.map((r) => r.chunkId)).toContain("c1");

      const guildRows = db
        .prepare(
          `SELECT "chunkId" FROM "MemoryChunkFts" WHERE "MemoryChunkFts" MATCH ?`,
        )
        .all("첩보원") as Array<{ chunkId: string }>;
      expect(guildRows.map((r) => r.chunkId)).toContain("c2");
    } finally {
      db.close();
    }
  });

  it("is a no-op when FTS is already trigram", () => {
    const db = new DatabaseSync!(tempDbPath());
    try {
      createChunkTable(db);
      insertChunk(db, "c1", "p1", "진서가 마차를 습격했다");
      db.exec(MEMORY_CHUNK_FTS_CREATE_SQL);
      db.exec(
        `INSERT INTO "MemoryChunkFts" ("chunkId","projectId","chapterId","content") SELECT "id","projectId","chapterId","content" FROM "MemoryChunk";`,
      );

      const reindexed = ensureMemoryChunkFtsTrigram(wrapAsBetterSqlite(db), logger);
      expect(reindexed).toBe(0);
      expect(ftsTokenizer(db)).toMatch(/trigram/);
    } finally {
      db.close();
    }
  });

  it("creates trigram FTS when table is missing", () => {
    const db = new DatabaseSync!(tempDbPath());
    try {
      createChunkTable(db);
      const reindexed = ensureMemoryChunkFtsTrigram(wrapAsBetterSqlite(db), logger);
      expect(reindexed).toBe(0);
      expect(ftsTokenizer(db)).toMatch(/trigram/);
    } finally {
      db.close();
    }
  });
});
