import { createRequire } from "node:module";
import {
  CACHE_PACKAGED_SCHEMA_BOOTSTRAP_SQL,
  CACHE_PACKAGED_SCHEMA_COLUMN_PATCHES,
  CACHE_PACKAGED_SCHEMA_FTS_BOOTSTRAP_SQL,
  CACHE_PACKAGED_SCHEMA_OPTIONAL_FTS_COLUMNS,
  CACHE_PACKAGED_SCHEMA_OPTIONAL_FTS_SHADOW_TABLES,
  CACHE_PACKAGED_SCHEMA_OPTIONAL_FTS_TABLES,
  CACHE_PACKAGED_SCHEMA_REQUIRED_COLUMNS,
  CACHE_PACKAGED_SCHEMA_REQUIRED_TABLES,
} from "./cachePackagedSchema.js";

const require = createRequire(import.meta.url);

type LoggerLike = {
  info: (message: string, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown>) => void;
};

type SqliteStatementLike = {
  get: (params?: unknown) => unknown;
  all: (params?: unknown) => unknown[];
};

type SqliteDatabaseLike = {
  exec: (sql: string) => void;
  prepare: (sql: string) => SqliteStatementLike;
  close: () => void;
};

function openSqliteDatabase(dbPath: string): SqliteDatabaseLike {
  try {
    const BetterSqlite3 = require("better-sqlite3") as new (
      path: string,
    ) => {
      exec: (sql: string) => void;
      prepare: (sql: string) => {
        get: (params?: unknown) => unknown;
        all: (params?: unknown) => unknown[];
      };
      close: () => void;
      pragma: (sql: string) => unknown;
    };
    const database = new BetterSqlite3(dbPath);
    return {
      exec: (sql) => database.exec(sql),
      prepare: (sql) => database.prepare(sql),
      close: () => database.close(),
    };
  } catch {
    const { DatabaseSync } = require("node:sqlite") as {
      DatabaseSync: new (path: string) => {
        exec: (sql: string) => void;
        prepare: (sql: string) => {
          get: (params?: unknown) => unknown;
          all: (params?: unknown) => unknown[];
        };
        close: () => void;
      };
    };
    const database = new DatabaseSync(dbPath);
    return {
      exec: (sql) => database.exec(sql),
      prepare: (sql) => database.prepare(sql),
      close: () => database.close(),
    };
  }
}

function escapeSqlIdentifier(value: string): string {
  return value.replaceAll('"', '""');
}

function sqliteTableExists(
  database: SqliteDatabaseLike,
  tableName: string,
): boolean {
  const row = database
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1;",
    )
    .get(tableName);
  return Boolean(row);
}

function sqliteTableHasColumn(
  database: SqliteDatabaseLike,
  tableName: string,
  columnName: string,
): boolean {
  const escapedTableName = escapeSqlIdentifier(tableName);
  const rows = database
    .prepare(`PRAGMA table_info("${escapedTableName}")`)
    .all() as Array<{ name?: string }>;
  return rows.some((row) => row.name === columnName);
}

export function dropPackagedCacheOptionalFtsArtifacts(
  dbPath: string,
  logger: LoggerLike,
): void {
  const database = openSqliteDatabase(dbPath);

  try {
    database.exec("PRAGMA trusted_schema = ON;");

    const droppedTables = new Set<string>();

    for (const tableName of CACHE_PACKAGED_SCHEMA_OPTIONAL_FTS_TABLES) {
      if (!sqliteTableExists(database, tableName)) continue;
      const escapedTableName = escapeSqlIdentifier(tableName);
      database.exec(`DROP TABLE IF EXISTS "${escapedTableName}";`);
      droppedTables.add(tableName);
    }

    for (const shadowTables of Object.values(
      CACHE_PACKAGED_SCHEMA_OPTIONAL_FTS_SHADOW_TABLES,
    )) {
      for (const shadowTableName of shadowTables) {
        if (!sqliteTableExists(database, shadowTableName)) continue;
        const escapedTableName = escapeSqlIdentifier(shadowTableName);
        database.exec(`DROP TABLE IF EXISTS "${escapedTableName}";`);
        droppedTables.add(shadowTableName);
      }
    }

    if (droppedTables.size > 0) {
      logger.info("Dropped unmanaged cache FTS artifacts before Prisma schema push", {
        dbPath,
        droppedTables: Array.from(droppedTables),
      });
    }
  } finally {
    database.close();
  }
}

export function ensurePackagedCacheSqliteSchema(
  dbPath: string,
  logger: LoggerLike,
): void {
  const database = openSqliteDatabase(dbPath);

  try {
    database.exec("PRAGMA journal_mode = WAL;");
    database.exec(CACHE_PACKAGED_SCHEMA_BOOTSTRAP_SQL);

    let optionalFtsEnabled = true;
    try {
      database.exec(CACHE_PACKAGED_SCHEMA_FTS_BOOTSTRAP_SQL);
    } catch (error) {
      optionalFtsEnabled = false;
      logger.warn("Cache SQLite FTS bootstrap unavailable; continuing with fallback search", {
        dbPath,
        error,
      });
    }

    let patchedColumns = 0;
    for (const patch of CACHE_PACKAGED_SCHEMA_COLUMN_PATCHES) {
      if (!sqliteTableExists(database, patch.table)) continue;
      if (sqliteTableHasColumn(database, patch.table, patch.column)) continue;
      database.exec(patch.sql);
      patchedColumns += 1;
    }

    const missingTables = CACHE_PACKAGED_SCHEMA_REQUIRED_TABLES.filter(
      (tableName) => !sqliteTableExists(database, tableName),
    );
    const missingColumns = Object.entries(CACHE_PACKAGED_SCHEMA_REQUIRED_COLUMNS)
      .flatMap(([tableName, columns]) =>
        columns
          .filter((columnName) => !sqliteTableHasColumn(database, tableName, columnName))
          .map((columnName) => `${tableName}.${columnName}`),
      );
    const missingOptionalFtsTables = optionalFtsEnabled
      ? CACHE_PACKAGED_SCHEMA_OPTIONAL_FTS_TABLES.filter(
          (tableName) => !sqliteTableExists(database, tableName),
        )
      : [];
    const missingOptionalFtsColumns = optionalFtsEnabled
      ? Object.entries(CACHE_PACKAGED_SCHEMA_OPTIONAL_FTS_COLUMNS)
          .flatMap(([tableName, columns]) =>
            columns
              .filter((columnName) => !sqliteTableHasColumn(database, tableName, columnName))
              .map((columnName) => `${tableName}.${columnName}`),
          )
      : [];

    if (missingTables.length > 0 || missingColumns.length > 0) {
      logger.warn("Packaged cache SQLite bootstrap completed with schema gaps", {
        dbPath,
        missingTables,
        missingColumns,
        missingOptionalFtsTables,
        missingOptionalFtsColumns,
        patchedColumns,
        optionalFtsEnabled,
      });
      return;
    }

    logger.info("Packaged cache SQLite bootstrap schema ensured", {
      dbPath,
      patchedColumns,
      optionalFtsEnabled,
    });
  } finally {
    database.close();
  }
}
