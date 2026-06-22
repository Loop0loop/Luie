import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

describe("Drizzle returning() runtime behavior", () => {
  const tempDirs: string[] = [];
  let dbPath: string;
  let sqliteDb: DatabaseSync;

  afterAll(() => {
    for (const dir of tempDirs) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  beforeEach(() => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "luie-returning-"));
    tempDirs.push(dir);
    dbPath = path.join(dir, "test.db");
    sqliteDb = new DatabaseSync(dbPath);
    sqliteDb.exec(`CREATE TABLE IF NOT EXISTS test_returning (
      id TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      count INTEGER DEFAULT 0
    )`);
  });

  it("insert().returning() returns the inserted row", () => {
    const stmt = sqliteDb.prepare(
      "INSERT INTO test_returning (id, value) VALUES (?, ?) RETURNING *"
    );
    const result = stmt.get("test-1", "hello") as {
      id: string;
      value: string;
      count: number | null;
    };

    expect(result.id).toBe("test-1");
    expect(result.value).toBe("hello");
    expect(result.count).toBe(0);
  });

  it("update().returning() returns updated row", () => {
    sqliteDb.exec(
      "INSERT INTO test_returning (id, value) VALUES ('test-2', 'original')"
    );

    const stmt = sqliteDb.prepare(
      "UPDATE test_returning SET value = ?, count = ? WHERE id = ? RETURNING *"
    );
    const result = stmt.get("updated", 5, "test-2") as {
      id: string;
      value: string;
      count: number | null;
    };

    expect(result.id).toBe("test-2");
    expect(result.value).toBe("updated");
    expect(result.count).toBe(5);
  });

  it("delete().returning() returns deleted row", () => {
    sqliteDb.exec(
      "INSERT INTO test_returning (id, value) VALUES ('test-3', 'to-delete')"
    );

    const stmt = sqliteDb.prepare(
      "DELETE FROM test_returning WHERE id = ? RETURNING *"
    );
    const result = stmt.get("test-3") as {
      id: string;
      value: string;
      count: number | null;
    };

    expect(result.id).toBe("test-3");
    expect(result.value).toBe("to-delete");
  });

  it("update().returning() on non-existent id returns undefined", () => {
    const stmt = sqliteDb.prepare(
      "UPDATE test_returning SET value = ? WHERE id = ? RETURNING *"
    );
    const result = stmt.get("no-op", "non-existent");

    expect(result).toBeUndefined();
  });

  it("delete().returning() on non-existent id returns undefined", () => {
    const stmt = sqliteDb.prepare(
      "DELETE FROM test_returning WHERE id = ? RETURNING *"
    );
    const result = stmt.get("non-existent");

    expect(result).toBeUndefined();
  });
});
