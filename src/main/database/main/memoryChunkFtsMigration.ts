import type Database from "better-sqlite3";

type LoggerLike = {
  info: (message: string, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown>) => void;
};

export const MEMORY_CHUNK_FTS_TOKENIZER = "trigram" as const;
const MEMORY_CHUNK_INDEX_SQL = 'COALESCE(NULLIF("indexText", \'\'), "content")';

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
 * 한국어 부분 검색을 위해 `MemoryChunkFts`의 trigram tokenizer를 보장한다.
 * SQLite FTS tokenizer는 변경할 수 없으므로 다른 tokenizer면 table을 재생성하고 재색인한다.
 *
 * @returns 재색인된 chunk 수. 변경이 없으면 0
 */
export function ensureMemoryChunkFtsTrigram(
  database: InstanceType<typeof Database>,
  logger: LoggerLike,
): number {
  const existingSql = readFtsCreateSql(database);

  // NOTE: bootstrap 순서상 MemoryChunk가 없으면 FTS 생성을 미룬다.
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

  // NOTE: SQLite FTS tokenizer는 교체할 수 없어 legacy table을 재생성해야 한다.
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
