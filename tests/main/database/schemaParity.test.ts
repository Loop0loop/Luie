import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import {
  PACKAGED_SCHEMA_BOOTSTRAP_SQL,
  PACKAGED_SCHEMA_REQUIRED_TABLES,
} from "../../../src/main/database/main/packagedSchema.js";
import {
  CACHE_PACKAGED_SCHEMA_BOOTSTRAP_SQL,
  CACHE_PACKAGED_SCHEMA_REQUIRED_TABLES,
} from "../../../src/main/database/cache/cachePackagedSchema.js";
import * as mainSchema from "../../../src/main/database/schema/index.js";
import * as cacheSchemaModule from "../../../src/main/database/cache/cacheSchema.js";
import {
  DRIZZLE_COLUMNS,
  DRIZZLE_EXTRA_CONFIG_BUILDER,
  DRIZZLE_TABLE_NAME,
  DatabaseSyncInstance,
  createDatabase,
  describeWithNodeSqlite,
  executeSql,
  getAllUserTables,
  getDatabaseSchema,
  getDrizzleTables,
  extractDrizzleColumns,
  extractDrizzleForeignKeys,
  extractDrizzleIndexes,
  readMigrationSql,
} from "./schemaParity.shared.js";

describeWithNodeSqlite("main DB schema parity (Drizzle vs bootstrap SQL)", () => {
  const tempDirs: string[] = [];

  afterAll(() => {
    for (const dir of tempDirs) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  function createTempDb(): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "luie-schema-parity-"));
    tempDirs.push(dir);
    return path.join(dir, "test.db");
  }

  it("main DB: bootstrap SQL creates all tables declared in PACKAGED_SCHEMA_REQUIRED_TABLES", () => {
    const dbPath = createTempDb();
    const db = createDatabase(dbPath);
    try {
      db.exec(PACKAGED_SCHEMA_BOOTSTRAP_SQL);
      const tables = getAllUserTables(db);
      for (const expected of PACKAGED_SCHEMA_REQUIRED_TABLES) {
        expect(tables).toContain(expected);
      }
    } finally {
      db.close();
    }
  });

  it("main DB: each table has columns matching Drizzle schema definition", () => {
    const dbPath = createTempDb();
    const db = createDatabase(dbPath);
    try {
      db.exec(PACKAGED_SCHEMA_BOOTSTRAP_SQL);

      for (const table of getDrizzleTables(mainSchema)) {
        const tableName = table[DRIZZLE_TABLE_NAME];
        const expectedCols = extractDrizzleColumns(table);
        const actual = getTableInfo(db, tableName);
        const actualColNames = new Set(actual.columns.map((c) => c.name));

        for (const col of expectedCols) {
          expect(actualColNames.has(col.name), `${tableName}.${col.name} missing`).toBe(true);
        }
      }
    } finally {
      db.close();
    }
  });

  it("main DB: each table has indexes matching Drizzle schema definition", () => {
    const dbPath = createTempDb();
    const db = createDatabase(dbPath);
    try {
      db.exec(PACKAGED_SCHEMA_BOOTSTRAP_SQL);

      for (const table of getDrizzleTables(mainSchema)) {
        const tableName = table[DRIZZLE_TABLE_NAME];
        const expectedIndexes = extractDrizzleIndexes(table);
        if (expectedIndexes.length === 0) continue;

        const actual = getTableInfo(db, tableName);
        const actualIndexNames = new Set(actual.indexes.map((i) => i.name));

        for (const idx of expectedIndexes) {
          expect(actualIndexNames.has(idx.name), `Index ${idx.name} missing on ${tableName}`).toBe(true);
        }
      }
    } finally {
      db.close();
    }
  });

  it("main DB: each table has foreign keys matching Drizzle schema definition", () => {
    const dbPath = createTempDb();
    const db = createDatabase(dbPath);
    try {
      db.exec(PACKAGED_SCHEMA_BOOTSTRAP_SQL);

      for (const table of getDrizzleTables(mainSchema)) {
        const tableName = table[DRIZZLE_TABLE_NAME];
        const expectedFks = extractDrizzleForeignKeys(table);
        if (expectedFks.length === 0) continue;

        const actual = getTableInfo(db, tableName);

        for (const expectedFk of expectedFks) {
          const match = actual.foreignKeys.find(
            (fk) =>
              fk.fromColumn === expectedFk.columns[0] &&
              fk.toTable === expectedFk.foreignTable &&
              fk.toColumn === expectedFk.foreignColumns[0],
          );
          expect(match, `FK ${expectedFk.name} missing on ${tableName}`).toBeDefined();
          if (match) {
            expect(match.onDelete).toBe(expectedFk.onDelete);
            expect(match.onUpdate).toBe(expectedFk.onUpdate);
          }
        }
      }
    } finally {
      db.close();
    }
  });

  it("main DB: bootstrap SQL matches generated Drizzle migration schema", () => {
    const bootstrapDbPath = createTempDb();
    const migrationDbPath = createTempDb();
    const bootstrapDb = createDatabase(bootstrapDbPath);
    const migrationDb = createDatabase(migrationDbPath);
    try {
      executeSql(bootstrapDb, PACKAGED_SCHEMA_BOOTSTRAP_SQL);
      executeSql(migrationDb, readMigrationSql("main"));

      expect(getDatabaseSchema(bootstrapDb)).toEqual(getDatabaseSchema(migrationDb));
    } finally {
      bootstrapDb.close();
      migrationDb.close();
    }
  });
});

describeWithNodeSqlite("cache DB schema parity (Drizzle vs bootstrap SQL)", () => {
  const tempDirs: string[] = [];

  afterAll(() => {
    for (const dir of tempDirs) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  function createTempDb(): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "luie-cache-schema-parity-"));
    tempDirs.push(dir);
    return path.join(dir, "test-cache.db");
  }

  it("cache DB: bootstrap SQL creates all tables declared in CACHE_PACKAGED_SCHEMA_REQUIRED_TABLES", () => {
    const dbPath = createTempDb();
    const db = createDatabase(dbPath);
    try {
      db.exec(CACHE_PACKAGED_SCHEMA_BOOTSTRAP_SQL);
      const tables = getAllUserTables(db);
      for (const expected of CACHE_PACKAGED_SCHEMA_REQUIRED_TABLES) {
        expect(tables).toContain(expected);
      }
    } finally {
      db.close();
    }
  });

  it("cache DB: each table has columns matching Drizzle schema definition", () => {
    const dbPath = createTempDb();
    const db = createDatabase(dbPath);
    try {
      db.exec(CACHE_PACKAGED_SCHEMA_BOOTSTRAP_SQL);

      for (const table of getDrizzleTables(cacheSchemaModule)) {
        const tableName = table[DRIZZLE_TABLE_NAME];
        const expectedCols = extractDrizzleColumns(table);
        const actual = getTableInfo(db, tableName);
        const actualColNames = new Set(actual.columns.map((c) => c.name));

        for (const col of expectedCols) {
          expect(actualColNames.has(col.name), `${tableName}.${col.name} missing`).toBe(true);
        }
      }
    } finally {
      db.close();
    }
  });

  it("cache DB: each table has indexes matching Drizzle schema definition", () => {
    const dbPath = createTempDb();
    const db = createDatabase(dbPath);
    try {
      db.exec(CACHE_PACKAGED_SCHEMA_BOOTSTRAP_SQL);

      for (const table of getDrizzleTables(cacheSchemaModule)) {
        const tableName = table[DRIZZLE_TABLE_NAME];
        const expectedIndexes = extractDrizzleIndexes(table);
        if (expectedIndexes.length === 0) continue;

        const actual = getTableInfo(db, tableName);
        const actualIndexNames = new Set(actual.indexes.map((i) => i.name));

        for (const idx of expectedIndexes) {
          expect(actualIndexNames.has(idx.name), `Index ${idx.name} missing on ${tableName}`).toBe(true);
        }
      }
    } finally {
      db.close();
    }
  });

  it("cache DB: FTS5 virtual table is created by FTS bootstrap SQL", () => {
    const dbPath = createTempDb();
    const db = createDatabase(dbPath);
    try {
      db.exec(CACHE_PACKAGED_SCHEMA_BOOTSTRAP_SQL);
      db.exec(
        `CREATE VIRTUAL TABLE IF NOT EXISTS "ChapterSearchDocumentFts"
         USING fts5("chapterId" UNINDEXED, "projectId" UNINDEXED, "title", "synopsis", "searchText", tokenize = 'unicode61');`,
      );

      const tables = getAllUserTables(db);
      expect(tables).toContain("ChapterSearchDocumentFts");

      const ftsInfo = getTableInfo(db, "ChapterSearchDocumentFts");
      const ftsColNames = new Set(ftsInfo.columns.map((c) => c.name));
      for (const col of ["chapterId", "projectId", "title", "synopsis", "searchText"]) {
        expect(ftsColNames.has(col), `FTS5 column ${col} missing`).toBe(true);
      }
    } finally {
      db.close();
    }
  });

  it("cache DB: bootstrap SQL matches generated Drizzle migration schema", () => {
    const bootstrapDbPath = createTempDb();
    const migrationDbPath = createTempDb();
    const bootstrapDb = createDatabase(bootstrapDbPath);
    const migrationDb = createDatabase(migrationDbPath);
    try {
      executeSql(bootstrapDb, CACHE_PACKAGED_SCHEMA_BOOTSTRAP_SQL);
      executeSql(migrationDb, readMigrationSql("cache"));

      expect(getDatabaseSchema(bootstrapDb)).toEqual(getDatabaseSchema(migrationDb));
    } finally {
      bootstrapDb.close();
      migrationDb.close();
    }
  });
});
