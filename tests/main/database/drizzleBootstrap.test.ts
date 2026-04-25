import * as fsPromises from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ensurePackagedSqliteSchema } from "../../../src/main/database/databaseSchemaBootstrap.js";

const logger = {
  info: () => {},
  warn: () => {},
};

const tempDirs: string[] = [];

async function createTempDbPath(): Promise<string> {
  const tempDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), "luie-db-"));
  tempDirs.push(tempDir);
  return path.join(tempDir, "test.sqlite");
}

describe("Drizzle bootstrap migration", () => {
  afterEach(async () => {
    await Promise.all(
      tempDirs.splice(0).map(async (tempDir) => {
        await fsPromises.rm(tempDir, { recursive: true, force: true });
      }),
    );
  });

  it("applies full Drizzle migration on new database", async () => {
    const dbPath = await createTempDbPath();
    ensurePackagedSqliteSchema(dbPath, logger);

    const Database = (await import("better-sqlite3")).default;
    const database = new Database(dbPath);
    try {
      const hasProject = database
        .prepare(
          "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'Project' LIMIT 1;",
        )
        .get();
      expect(hasProject).toBeTruthy();

      const hasChapter = database
        .prepare(
          "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'Chapter' LIMIT 1;",
        )
        .get();
      expect(hasChapter).toBeTruthy();

      const hasDrizzleMigrations = database
        .prepare(
          "SELECT name FROM sqlite_master WHERE type = 'table' AND name = '__drizzle_migrations' LIMIT 1;",
        )
        .get();
      expect(hasDrizzleMigrations).toBeTruthy();

      const migrationCount = database
        .prepare("SELECT COUNT(*) as count FROM __drizzle_migrations")
        .get() as { count: number };
      expect(migrationCount.count).toBeGreaterThan(0);
    } finally {
      database.close();
    }
  });

  it("applies baseline migration on existing Prisma database", async () => {
    const dbPath = await createTempDbPath();

    // Simulate an existing Prisma database by creating the Project table manually
    const Database = (await import("better-sqlite3")).default;
    const preseedDb = new Database(dbPath);
    preseedDb.exec(`
      CREATE TABLE "Project" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "title" TEXT NOT NULL,
        "description" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL
      );
    `);
    preseedDb.close();

    // Now run the Drizzle bootstrap — should detect existing Prisma DB
    ensurePackagedSqliteSchema(dbPath, logger);

    const database = new Database(dbPath);
    try {
      // Project table should still exist (not recreated)
      const hasProject = database
        .prepare(
          "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'Project' LIMIT 1;",
        )
        .get();
      expect(hasProject).toBeTruthy();

      // __drizzle_migrations should now exist with baseline entries
      const hasDrizzleMigrations = database
        .prepare(
          "SELECT name FROM sqlite_master WHERE type = 'table' AND name = '__drizzle_migrations' LIMIT 1;",
        )
        .get();
      expect(hasDrizzleMigrations).toBeTruthy();

      const migrationCount = database
        .prepare("SELECT COUNT(*) as count FROM __drizzle_migrations")
        .get() as { count: number };
      expect(migrationCount.count).toBeGreaterThan(0);
    } finally {
      database.close();
    }
  });

  it("does not duplicate migration records on re-run", async () => {
    const dbPath = await createTempDbPath();
    ensurePackagedSqliteSchema(dbPath, logger);

    const Database = (await import("better-sqlite3")).default;
    const database = new Database(dbPath);
    try {
      const firstRun = database
        .prepare("SELECT COUNT(*) as count FROM __drizzle_migrations")
        .get() as { count: number };

      // Run again
      ensurePackagedSqliteSchema(dbPath, logger);

      const secondRun = database
        .prepare("SELECT COUNT(*) as count FROM __drizzle_migrations")
        .get() as { count: number };

      expect(secondRun.count).toBe(firstRun.count);
    } finally {
      database.close();
    }
  });
});
