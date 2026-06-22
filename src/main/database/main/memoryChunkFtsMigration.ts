/**
 * memoryChunkFtsMigration — MemoryChunkFts 토크나이저 업그레이드.
 *
 * 배경:
 *   기존 MemoryChunkFts 는 `tokenize='unicode61'` 로 생성되어 있었다.
 *   unicode61 은 공백/구두점 단위로만 토큰을 끊기 때문에 한국어에서
 *   "진서"(부분) → "진서가"(저장 토큰) 같은 부분 일치가 불가능하다.
 *   (검증: unicode61 에서 `진서` MATCH → 0건, `진서가` 전체일치만 매칭)
 *
 *   trigram 토크나이저는 3-그램 부분 문자열 인덱싱이라 한국어 부분 매칭이
 *   가능하다. (검증: trigram 에서 `마차를`/`습격했` 등 3글자+ MATCH 성공)
 *   단, trigram 은 2글자 이하 쿼리에 대해 결과가 비며(에러는 아님),
 *   이는 검색 레이어의 LIKE 폴백으로 보완한다.
 *
 * FTS5 가상 테이블은 tokenizer 를 ALTER 로 바꿀 수 없으므로,
 * 기존 테이블을 DROP 후 trigram 으로 재생성하고 MemoryChunk 에서 재색인한다.
 *
 * 이 마이그레이션은 idempotent 하다:
 *   - 이미 trigram 이면 아무것도 하지 않는다.
 *   - 테이블이 없으면(최초 부트스트랩) 호출측에서 trigram 으로 생성하므로 skip.
 */

import type Database from "better-sqlite3";

type LoggerLike = {
  info: (message: string, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown>) => void;
};

export const MEMORY_CHUNK_FTS_TOKENIZER = "trigram" as const;
const MEMORY_CHUNK_INDEX_SQL = 'COALESCE(NULLIF("indexText", \'\'), "content")';

/** trigram 토크나이저로 MemoryChunkFts 를 생성하는 표준 DDL. */
export const MEMORY_CHUNK_FTS_CREATE_SQL = `CREATE VIRTUAL TABLE IF NOT EXISTS "MemoryChunkFts"
USING fts5(
    "chunkId" UNINDEXED,
    "projectId" UNINDEXED,
    "chapterId" UNINDEXED,
    "content",
    tokenize = 'trigram'
);`;

type SqliteMasterRow = { sql?: string | null };
type CountRow = { count?: number | bigint };

/** 현재 MemoryChunkFts 의 생성 SQL 을 조회한다(없으면 null). */
function readFtsCreateSql(
  database: InstanceType<typeof Database>,
): string | null {
  const row = database
    .prepare(
      "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'MemoryChunkFts' LIMIT 1;",
    )
    .get() as SqliteMasterRow | undefined;
  return row?.sql ?? null;
}

/** 생성 SQL 에 trigram 토크나이저가 적용되어 있는지 판별한다. */
function usesTrigramTokenizer(createSql: string): boolean {
  return /tokenize\s*=\s*['"]?trigram/i.test(createSql);
}

function hasMemoryChunkIndexTextColumns(database: InstanceType<typeof Database>): boolean {
  const rows = database
    .prepare('PRAGMA table_info("MemoryChunk");')
    .all() as Array<{ name?: string }>;
  const columns = new Set(rows.map((row) => row.name));
  return columns.has("indexText") && columns.has("indexTextHash") && columns.has("sourceContentHash");
}

export function backfillMemoryChunkIndexText(
  database: InstanceType<typeof Database>,
  logger: LoggerLike,
): number {
  if (!hasMemoryChunkIndexTextColumns(database)) return 0;

  const result = database
    .prepare(
      `UPDATE "MemoryChunk"
       SET
         "indexText" = "content",
         "indexTextHash" = "contentHash",
         "sourceContentHash" = ''
       WHERE "indexText" = '';`,
    )
    .run();
  const changed = Number(result.changes ?? 0);
  if (changed > 0) {
    logger.info("Backfilled MemoryChunk index text", { changedChunks: changed });
  }
  return changed;
}

function hasStaleFtsRows(database: InstanceType<typeof Database>): boolean {
  if (!hasMemoryChunkIndexTextColumns(database)) return false;
  const row = database
    .prepare(
      `SELECT COUNT(*) AS count
       FROM "MemoryChunk" chunk
       WHERE chunk."indexText" <> ''
         AND NOT EXISTS (
           SELECT 1
           FROM "MemoryChunkFts" fts
           WHERE fts."chunkId" = chunk."id"
             AND fts."content" = chunk."indexText"
         );`,
    )
    .get() as CountRow | undefined;
  return Number(row?.count ?? 0) > 0;
}

function reindexMemoryChunkFts(database: InstanceType<typeof Database>): number {
  database.exec('DELETE FROM "MemoryChunkFts";');
  const result = database
    .prepare(
      `INSERT INTO "MemoryChunkFts" ("chunkId","projectId","chapterId","content")
       SELECT "id","projectId","chapterId",${MEMORY_CHUNK_INDEX_SQL} FROM "MemoryChunk";`,
    )
    .run();
  return Number(result.changes ?? 0);
}

/**
 * MemoryChunkFts 토크나이저를 trigram 으로 보장한다.
 *
 * - 테이블이 없으면 trigram 으로 생성한다.
 * - unicode61(또는 trigram 이 아닌) 토크나이저면 DROP 후 trigram 재생성 +
 *   MemoryChunk 전체 재색인한다.
 * - 이미 trigram 이면 no-op.
 *
 * @returns 재색인된 청크 수(재생성이 일어나지 않으면 0).
 */
export function ensureMemoryChunkFtsTrigram(
  database: InstanceType<typeof Database>,
  logger: LoggerLike,
): number {
  const existingSql = readFtsCreateSql(database);

  // MemoryChunk 본체가 없으면 FTS 를 만들 의미가 없다(부트스트랩 순서 안전장치).
  const hasChunkTable = Boolean(
    database
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'MemoryChunk' LIMIT 1;",
      )
      .get(),
  );
  if (!hasChunkTable) {
    return 0;
  }

  if (existingSql === null) {
    // 최초 생성: 곧장 trigram 으로.
    database.exec(MEMORY_CHUNK_FTS_CREATE_SQL);
    logger.info("Created MemoryChunkFts with trigram tokenizer");
    return 0;
  }

  if (usesTrigramTokenizer(existingSql)) {
    if (hasStaleFtsRows(database)) {
      const reindexed = reindexMemoryChunkFts(database);
      logger.info("Reindexed stale MemoryChunkFts rows", {
        reindexedChunks: reindexed,
      });
      return reindexed;
    }
    return 0;
  }

  // 레거시 토크나이저(unicode61 등) → DROP 후 trigram 재생성 + 재색인.
  const migrate = database.transaction((): number => {
    database.exec('DROP TABLE IF EXISTS "MemoryChunkFts";');
    database.exec(MEMORY_CHUNK_FTS_CREATE_SQL);
    return reindexMemoryChunkFts(database);
  });

  const reindexed = migrate();
  logger.info("Migrated MemoryChunkFts tokenizer to trigram", {
    reindexedChunks: reindexed,
  });
  return reindexed;
}
