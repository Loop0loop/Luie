// TODO: Remove in Phase 7 — replaced by Drizzle migrate() baseline flow
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import {
  CACHE_PACKAGED_SCHEMA_COLUMN_PATCHES,
  CACHE_PACKAGED_SCHEMA_FTS_BOOTSTRAP_SQL,
  CACHE_PACKAGED_SCHEMA_OPTIONAL_FTS_COLUMNS,
  CACHE_PACKAGED_SCHEMA_OPTIONAL_FTS_SHADOW_TABLES,
  CACHE_PACKAGED_SCHEMA_OPTIONAL_FTS_TABLES,
  CACHE_PACKAGED_SCHEMA_REQUIRED_COLUMNS,
  CACHE_PACKAGED_SCHEMA_REQUIRED_TABLES,
} from "./cachePackagedSchema.js";
import { resolveMigrationPathContext } from "./migrationPathResolver.js";

const require = createRequire(import.meta.url);

type LoggerLike = {
  info: (message: string, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown>) => void;
};

type SqliteStatementLike = {
  get: (params?: unknown) => unknown;
  all: (params?: unknown) => unknown[];
  run?: (...params: unknown[]) => unknown;
};

type SqliteDatabaseLike = {
  exec: (sql: string) => void;
  prepare: (sql: string) => SqliteStatementLike;
  close: () => void;
  pragma?: (sql: string) => unknown;
  supportsPreparedRun?: boolean;
};

const DRIZZLE_MIGRATIONS_TABLE = "__drizzle_migrations";

function openSqliteDatabase(dbPath: string): SqliteDatabaseLike {
  try {
    const BetterSqlite3 = require("better-sqlite3") as new (
      path: string,
    ) => {
      exec: (sql: string) => void;
      prepare: (sql: string) => {
        get: (params?: unknown) => unknown;
        all: (params?: unknown) => unknown[];
        run: (params?: unknown) => unknown;
      };
      close: () => void;
      pragma: (sql: string) => unknown;
    };
    const database = new BetterSqlite3(dbPath);
    return {
      exec: (sql) => database.exec(sql),
      prepare: (sql) => database.prepare(sql),
      close: () => database.close(),
      pragma: (sql) => database.pragma(sql),
      supportsPreparedRun: true,
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
      supportsPreparedRun: false,
    };
  }
}

function openBetterSqlite3ForDrizzle(dbPath: string): {
  database: unknown;
  available: boolean;
} {
  try {
    const BetterSqlite3Ctor = require("better-sqlite3") as new (
      p: string,
    ) => unknown;
    return { database: new BetterSqlite3Ctor(dbPath), available: true };
  } catch {
    return { database: null, available: false };
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

function computeMigrationHash(sqlContent: string): string {
  return createHash("sha256").update(sqlContent).digest("hex").slice(0, 16);
}

function markInitialMigrationAsApplied(
  database: SqliteDatabaseLike,
  migrationsFolder: string,
  logger: LoggerLike,
): void {
  const journalPath = path.join(migrationsFolder, "meta", "_journal.json");
  if (!fs.existsSync(journalPath)) {
    logger.warn("Drizzle cache journal not found; skipping baseline migration marking", {
      migrationsFolder,
    });
    return;
  }

  const journal = JSON.parse(
    fs.readFileSync(journalPath, "utf-8"),
  ) as {
    entries: Array<{ idx: number; tag: string; version: string }>;
  };

  database.exec(
    `CREATE TABLE IF NOT EXISTS "${DRIZZLE_MIGRATIONS_TABLE}" (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );`,
  );

  const existingHashes = database
    .prepare(`SELECT hash FROM "${DRIZZLE_MIGRATIONS_TABLE}"`)
    .all() as Array<{ hash: string }>;
  const existingHashSet = new Set(existingHashes.map((r) => r.hash));

  let appliedCount = 0;
  const insertStmt = database.prepare(
    `INSERT INTO "${DRIZZLE_MIGRATIONS_TABLE}" (hash, created_at) VALUES (?, ?)`,
  );

  for (const entry of journal.entries) {
    const migrationPath = path.join(migrationsFolder, `${entry.tag}.sql`);
    if (!fs.existsSync(migrationPath)) continue;

    const sqlContent = fs.readFileSync(migrationPath, "utf-8");
    const hash = computeMigrationHash(sqlContent);

    if (existingHashSet.has(hash)) continue;
    const createdAt = new Date().toISOString();
    if (database.supportsPreparedRun && insertStmt.run) {
      insertStmt.run(hash, createdAt);
    } else {
      const escapedHash = hash.replaceAll("'", "''");
      const escapedCreatedAt = createdAt.replaceAll("'", "''");
      database.exec(
        `INSERT INTO "${DRIZZLE_MIGRATIONS_TABLE}" (hash, created_at) VALUES ('${escapedHash}', '${escapedCreatedAt}');`,
      );
    }
    appliedCount += 1;
  }

  logger.info("Marked initial Drizzle cache migrations as applied (baseline from Prisma)", {
    migrationsFolder,
    appliedCount,
  });
}

function runDrizzleMigrate(
  dbPath: string,
  migrationsFolder: string,
  logger: LoggerLike,
): void {
  const drizzleResult = openBetterSqlite3ForDrizzle(dbPath);
  if (!drizzleResult.available) {
    logger.warn("better-sqlite3 unavailable for cache Drizzle migrate; skipping", {
      dbPath,
    });
    return;
  }

  try {
    const drizzleDb = drizzle(drizzleResult.database as any);
    migrate(drizzleDb, { migrationsFolder });
  } finally {
    (drizzleResult.database as { close: () => void }).close();
  }
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
      logger.info("Dropped unmanaged cache FTS artifacts before Drizzle migration", {
        dbPath,
        droppedTables: Array.from(droppedTables),
      });
    }
  } finally {
    try {
      database.exec("PRAGMA trusted_schema = OFF;");
    } catch {
      // `node:sqlite` fallback may not support this pragma on older runtimes.
    }
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

    const ctx = resolveMigrationPathContext("cache");
    const migrationsFolder = ctx.migrationsFolder;

    const hasCacheTable = sqliteTableExists(database, "ChapterSearchDocument");
    const hasDrizzleMigrations = sqliteTableExists(database, DRIZZLE_MIGRATIONS_TABLE);

    if (hasCacheTable && !hasDrizzleMigrations) {
      markInitialMigrationAsApplied(database, migrationsFolder, logger);
    }

    runDrizzleMigrate(dbPath, migrationsFolder, logger);

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

    logger.info("Packaged cache SQLite Drizzle migration ensured", {
      dbPath,
      patchedColumns,
      optionalFtsEnabled,
      wasPrismaBaseline: hasCacheTable && !hasDrizzleMigrations,
    });
  } finally {
    database.close();
  }
}
