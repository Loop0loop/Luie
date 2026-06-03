import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  dropPackagedCacheOptionalFtsArtifacts,
  ensurePackagedCacheSqliteSchema,
} from "../../../src/main/database/cache/cacheSchemaBootstrap.js";

const logger = {
  info: () => {},
  warn: () => {},
};

const tempDirs: string[] = [];

async function createTempDbPath(): Promise<string> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "luie-cache-db-"));
  tempDirs.push(tempDir);
  return path.join(tempDir, "cache.sqlite");
}

describe("cache Drizzle migration compatibility", () => {
  afterEach(async () => {
    await Promise.all(
      tempDirs.splice(0).map(async (tempDir) => {
        await fs.rm(tempDir, { recursive: true, force: true });
      }),
    );
  });

  it("drops unmanaged FTS artifacts before applying Drizzle cache migrations", async () => {
    const dbPath = await createTempDbPath();
    ensurePackagedCacheSqliteSchema(dbPath, logger);

    const database = await import("better-sqlite3").then((m) => new m.default(dbPath));
    try {
      const tables = database
        .prepare(
          "SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE '%fts%' ORDER BY name;",
        )
        .all() as Array<{ name: string }>;

      expect(tables.some((t) => t.name.includes("fts"))).toBe(true);

      dropPackagedCacheOptionalFtsArtifacts(dbPath, logger);

      const tablesAfterDrop = database
        .prepare(
          "SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE '%fts%' ORDER BY name;",
        )
        .all() as Array<{ name: string }>;

      expect(tablesAfterDrop.some((t) => t.name.includes("fts"))).toBe(false);
    } finally {
      database.close();
    }
  });

  it("applies Drizzle baseline migration on new cache database", async () => {
    const dbPath = await createTempDbPath();
    ensurePackagedCacheSqliteSchema(dbPath, logger);

    const database = await import("better-sqlite3").then((m) => new m.default(dbPath));
    try {
      const hasChapterSearchDocument = database
        .prepare(
          "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'ChapterSearchDocument' LIMIT 1;",
        )
        .get();

      expect(hasChapterSearchDocument).toBeTruthy();

      const hasDrizzleMigrations = database
        .prepare(
          "SELECT name FROM sqlite_master WHERE type = 'table' AND name = '__drizzle_migrations' LIMIT 1;",
        )
        .get();

      expect(hasDrizzleMigrations).toBeTruthy();
    } finally {
      database.close();
    }
  });
});
