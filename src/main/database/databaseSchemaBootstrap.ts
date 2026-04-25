// TODO: Remove in Phase 7 — replaced by Drizzle migrate() baseline flow
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as fs from "node:fs";
import * as path from "node:path";
import { createHash } from "node:crypto";
import {
  resolveMigrationPathContext,
} from "./migrationPathResolver.js";

type LoggerLike = {
  info: (message: string, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown>) => void;
};

const DRIZZLE_MIGRATIONS_TABLE = "__drizzle_migrations";

function sqliteTableExists(
  database: InstanceType<typeof Database>,
  tableName: string,
): boolean {
  const row = database
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1;",
    )
    .get(tableName);
  return Boolean(row);
}

function computeMigrationHash(sqlContent: string): string {
  return createHash("sha256").update(sqlContent).digest("hex").slice(0, 16);
}

/**
 * Marks all existing Drizzle migrations as already applied.
 * Used when migrating from a Prisma-managed database that already has
 * the full schema — prevents "table already exists" errors.
 */
function markInitialMigrationAsApplied(
  database: InstanceType<typeof Database>,
  migrationsFolder: string,
  logger: LoggerLike,
): void {
  const journalPath = path.join(migrationsFolder, "meta", "_journal.json");
  if (!fs.existsSync(journalPath)) {
    logger.warn("Drizzle journal not found; skipping baseline migration marking", {
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

    insertStmt.run(hash, new Date().toISOString());
    appliedCount += 1;
  }

  logger.info("Marked initial Drizzle migrations as applied (baseline from Prisma)", {
    migrationsFolder,
    appliedCount,
  });
}

/**
 * Runs Drizzle migrations on the given database path.
 * Detects whether this is an existing Prisma database (has tables but no
 * __drizzle_migrations) and applies a baseline migration in that case.
 */
export function ensurePackagedSqliteSchema(
  dbPath: string,
  logger: LoggerLike,
): void {
  const database = new Database(dbPath);

  try {
    database.pragma("journal_mode = WAL");
    database.pragma("foreign_keys = ON");
    database.pragma("busy_timeout = 5000");

    const ctx = resolveMigrationPathContext("main");
    const migrationsFolder = ctx.migrationsFolder;

    const hasProjectTable = sqliteTableExists(database, "Project");
    const hasDrizzleMigrations = sqliteTableExists(database, DRIZZLE_MIGRATIONS_TABLE);

    const drizzleDb = drizzle(database);

    if (hasProjectTable && !hasDrizzleMigrations) {
      // Existing Prisma DB: mark all current migrations as already applied
      // so Drizzle doesn't try to create tables that already exist.
      markInitialMigrationAsApplied(database, migrationsFolder, logger);
    }

    // Run Drizzle migrate — applies only migrations not yet in __drizzle_migrations
    migrate(drizzleDb, { migrationsFolder });

    logger.info("Packaged SQLite Drizzle migration ensured", {
      dbPath,
      migrationsFolder,
      wasPrismaBaseline: hasProjectTable && !hasDrizzleMigrations,
    });
  } finally {
    database.close();
  }
}
