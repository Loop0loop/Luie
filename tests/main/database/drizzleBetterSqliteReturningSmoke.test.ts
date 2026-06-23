/**
 * Drizzle returning() runtime smoke test — better-sqlite3 variant.
 *
 * Validates returning() behavior using the actual better-sqlite3
 * adapter that Drizzle uses at runtime.
 *
 * NOTE: Auto-skipped when better-sqlite3 has ABI mismatch in Node.js env.
 * The node:sqlite test (drizzleReturningSmoke.test.ts) covers CI/dev.
 *
 * Phase 6 blocker: Must pass from within Electron main process
 * before getClient() switches from Prisma to Drizzle.
 */
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq } from "drizzle-orm";

let hasNativeModule = false;

try {
  require("better-sqlite3");
  hasNativeModule = true;
} catch {
  hasNativeModule = false;
}

const testTable = sqliteTable("test_returning", {
  id: text("id").primaryKey(),
  value: text("value").notNull(),
  count: integer("count").default(0),
});

const describeWith = hasNativeModule ? describe : describe.skip;

describeWith("Drizzle returning() — better-sqlite3 runtime", () => {
  const tempDirs: string[] = [];

  afterAll(() => {
    for (const dir of tempDirs) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  function createTempDb(): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "luie-better-returning-"));
    tempDirs.push(dir);
    return path.join(dir, "test.db");
  }

  function createClient(dbPath: string) {
    const Database = require("better-sqlite3").default ?? require("better-sqlite3");
    const sqlite = new Database(dbPath);
    sqlite.exec(`CREATE TABLE IF NOT EXISTS test_returning (
      id TEXT PRIMARY KEY, value TEXT NOT NULL, count INTEGER DEFAULT 0
    )`);
    return drizzle(sqlite);
  }

  function insertRow(
    db: ReturnType<typeof createClient>,
    id: string,
    value: string,
  ) {
    db.insert(testTable).values({ id, value }).run();
  }

  it("insert().returning() returns inserted row", () => {
    const db = createClient(createTempDb());
    const result = db
      .insert(testTable)
      .values({ id: "bs-1", value: "hello" })
      .returning();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("bs-1");
    expect(result[0].value).toBe("hello");
  });

  it("update().set().where().returning() returns updated row", () => {
    const db = createClient(createTempDb());
    insertRow(db, "bs-2", "original");
    const result = db
      .update(testTable)
      .set({ value: "updated" })
      .where(eq(testTable.id, "bs-2"))
      .returning();
    expect(result).toHaveLength(1);
    expect(result[0].value).toBe("updated");
  });

  it("delete().where().returning() returns deleted row", () => {
    const db = createClient(createTempDb());
    insertRow(db, "bs-3", "todelete");
    const result = db
      .delete(testTable)
      .where(eq(testTable.id, "bs-3"))
      .returning();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("bs-3");
  });

  it("update().where().returning() on non-existent returns empty", () => {
    const db = createClient(createTempDb());
    const result = db
      .update(testTable)
      .set({ value: "x" })
      .where(eq(testTable.id, "nonexistent"))
      .returning();
    expect(result).toHaveLength(0);
  });

  it("delete().where().returning() on non-existent returns empty", () => {
    const db = createClient(createTempDb());
    const result = db
      .delete(testTable)
      .where(eq(testTable.id, "nonexistent"))
      .returning();
    expect(result).toHaveLength(0);
  });
});
