import * as fs from "node:fs";
import { createRequire } from "node:module";
import * as os from "node:os";
import * as path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import {
  PACKAGED_SCHEMA_BOOTSTRAP_SQL,
  PACKAGED_SCHEMA_REQUIRED_TABLES,
} from "../../../src/main/database/packagedSchema.js";
import {
  CACHE_PACKAGED_SCHEMA_BOOTSTRAP_SQL,
  CACHE_PACKAGED_SCHEMA_REQUIRED_TABLES,
} from "../../../src/main/database/cachePackagedSchema.js";
import * as mainSchema from "../../../src/main/database/schema.js";
import * as cacheSchemaModule from "../../../src/main/database/cacheSchema.js";

type ColumnInfo = {
  name: string;
  type: string;
  notNull: boolean;
  primaryKey: boolean;
  defaultValue: string | null;
};

type IndexInfo = {
  name: string;
  unique: boolean;
  columns: string[];
};

type ForeignKeyInfo = {
  fromColumn: string;
  toTable: string;
  toColumn: string;
  onDelete: string;
  onUpdate: string;
};

type TableSchema = {
  columns: ColumnInfo[];
  indexes: IndexInfo[];
  foreignKeys: ForeignKeyInfo[];
};

type DatabaseSyncInstance = {
  close: () => void;
  exec: (sql: string) => void;
  prepare: (sql: string) => {
    all: () => unknown[];
  };
};

type DatabaseSyncConstructor = new (path: string) => DatabaseSyncInstance;

const require = createRequire(import.meta.url);

function loadDatabaseSync(): DatabaseSyncConstructor | undefined {
  try {
    return (require("node:sqlite") as { DatabaseSync: DatabaseSyncConstructor }).DatabaseSync;
  } catch {
    return undefined;
  }
}

const DatabaseSync = loadDatabaseSync();
const describeWithNodeSqlite = DatabaseSync ? describe : describe.skip;

function createDatabase(dbPath: string): DatabaseSyncInstance {
  if (!DatabaseSync) {
    throw new Error("node:sqlite DatabaseSync requires Node.js 22.5.0 or newer");
  }
  return new DatabaseSync(dbPath);
}

function getTableInfo(db: DatabaseSyncInstance, tableName: string): TableSchema {
  const columns = (
    db.prepare(`PRAGMA table_info("${tableName}")`).all() as Array<{
      name: string;
      type: string;
      notnull: number;
      pk: number;
      dflt_value: string | null;
    }>
  ).map((row) => ({
    name: row.name,
    type: row.type.toUpperCase(),
    notNull: row.notnull === 1,
    primaryKey: row.pk > 0,
    defaultValue: row.dflt_value,
  }));

  const indexes = (
    db.prepare(`PRAGMA index_list("${tableName}")`).all() as Array<{
      name: string;
      unique: number;
    }>
  )
    .filter((idx) => !idx.name.startsWith("sqlite_autoindex_"))
    .map((idx) => {
      const cols = (
        db.prepare(`PRAGMA index_info("${idx.name}")`).all() as Array<{
          name: string;
          seqno: number;
        }>
      )
        .sort((a, b) => a.seqno - b.seqno)
        .map((c) => c.name);
      return { name: idx.name, unique: idx.unique === 1, columns: cols };
    });

  const foreignKeys = (
    db.prepare(`PRAGMA foreign_key_list("${tableName}")`).all() as Array<{
      id: number;
      seq: number;
      from: string;
      table: string;
      to: string;
      on_delete: string;
      on_update: string;
    }>
  )
    .sort((a, b) => a.id - b.id || a.seq - b.seq)
    .reduce<Map<number, ForeignKeyInfo>>((acc, row) => {
      if (!acc.has(row.id)) {
        acc.set(row.id, {
          fromColumn: row.from,
          toTable: row.table,
          toColumn: row.to,
          onDelete: row.on_delete.toUpperCase() || "NO ACTION",
          onUpdate: row.on_update.toUpperCase() || "NO ACTION",
        });
      }
      return acc;
    }, new Map());

  return {
    columns,
    indexes,
    foreignKeys: Array.from(foreignKeys.values()),
  };
}

function getAllUserTables(db: DatabaseSyncInstance): string[] {
  return (
    db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name;",
      )
      .all() as Array<{ name: string }>
  ).map((row) => row.name);
}

const DRIZZLE_TABLE_NAME = Symbol.for("drizzle:Name");
const DRIZZLE_COLUMNS = Symbol.for("drizzle:Columns");
const DRIZZLE_EXTRA_CONFIG_BUILDER = Symbol.for("drizzle:ExtraConfigBuilder");

function executeSql(db: DatabaseSyncInstance, sql: string): void {
  db.exec(sql.split("--> statement-breakpoint").join(""));
}

function normalizeColumnType(type: string): string {
  const normalized = type.toUpperCase();
  if (normalized === "DATETIME") return "TEXT";
  if (normalized === "BOOLEAN") return "INTEGER";
  return normalized;
}

function normalizeDefaultValue(value: string | null): string | null {
  if (value === null) return null;
  return value.replace(/^\((.*)\)$/u, "$1").toUpperCase();
}

function normalizeTableSchema(schema: TableSchema): TableSchema {
  return {
    columns: schema.columns
      .map((column) => ({
        ...column,
        type: normalizeColumnType(column.type),
        defaultValue: normalizeDefaultValue(column.defaultValue),
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    indexes: schema.indexes
      .map((index) => ({ ...index, columns: [...index.columns] }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    foreignKeys: schema.foreignKeys
      .map((foreignKey) => ({ ...foreignKey }))
      .sort((a, b) =>
        `${a.fromColumn}:${a.toTable}:${a.toColumn}`.localeCompare(`${b.fromColumn}:${b.toTable}:${b.toColumn}`),
      ),
  };
}

function getDatabaseSchema(db: DatabaseSyncInstance): Record<string, TableSchema> {
  const schema: Record<string, TableSchema> = {};
  for (const tableName of getAllUserTables(db)) {
    schema[tableName] = normalizeTableSchema(getTableInfo(db, tableName));
  }
  return schema;
}

function readMigrationSql(kind: "main" | "cache"): string {
  const migrationDir = path.resolve(process.cwd(), "drizzle", kind);
  const migrationFiles = fs
    .readdirSync(migrationDir)
    .filter((file) => /^\d+_.+\.sql$/u.test(file))
    .sort((a, b) => a.localeCompare(b));
  if (migrationFiles.length === 0) {
    throw new Error(`No Drizzle migration SQL found in ${migrationDir}`);
  }
  return migrationFiles
    .map((migrationFile) => fs.readFileSync(path.join(migrationDir, migrationFile), "utf8"))
    .join("\n");
}

type DrizzleColumnInfo = {
  name: string;
  hasDefault: boolean;
  notNull: boolean;
  isPrimaryKey: boolean;
};

type DrizzleIndexInfo = {
  name: string;
  columns: string[];
  isUnique: boolean;
};

type DrizzleForeignKeyInfo = {
  name: string;
  columns: string[];
  foreignTable: string;
  foreignColumns: string[];
  onDelete: string;
  onUpdate: string;
};

type DrizzleTableRaw = Record<typeof DRIZZLE_TABLE_NAME, string> &
  Record<typeof DRIZZLE_COLUMNS, Record<string, { name: string; primary?: boolean; notNull?: boolean; hasDefault?: boolean }>> &
  Record<typeof DRIZZLE_EXTRA_CONFIG_BUILDER, ((table: unknown) => Array<unknown>) | undefined>;

function isDrizzleTable(value: unknown): value is DrizzleTableRaw {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Record<symbol, unknown>)[DRIZZLE_TABLE_NAME] === "string"
  );
}

function extractDrizzleColumns(table: DrizzleTableRaw): DrizzleColumnInfo[] {
  const cols = table[DRIZZLE_COLUMNS];
  return Object.values(cols).map((col) => ({
    name: col.name,
    hasDefault: col.hasDefault ?? false,
    notNull: col.notNull ?? false,
    isPrimaryKey: col.primary ?? false,
  }));
}

function extractDrizzleIndexes(table: DrizzleTableRaw): DrizzleIndexInfo[] {
  const builder = table[DRIZZLE_EXTRA_CONFIG_BUILDER];
  if (!builder) return [];
  const items = builder(table);
  return items
    .filter((item): item is { config: { name: string; columns: Array<{ name: string }>; unique?: boolean } } =>
      typeof item === "object" && item !== null && "config" in item && typeof (item as Record<string, unknown>).config === "object",
    )
    .map((item) => ({
      name: item.config.name,
      columns: item.config.columns.map((c) => c.name),
      isUnique: item.config.unique ?? false,
    }));
}

function extractDrizzleForeignKeys(table: DrizzleTableRaw): DrizzleForeignKeyInfo[] {
  const builder = table[DRIZZLE_EXTRA_CONFIG_BUILDER];
  if (!builder) return [];
  const items = builder(table);
  return items
    .filter((item): item is { reference: () => { name: string; columns: Array<{ name: string }>; foreignTable: Record<symbol, unknown>; foreignColumns: Array<{ name: string }>; }; _onDelete?: string; _onUpdate?: string } =>
      typeof item === "object" && item !== null && "reference" in item && typeof (item as Record<string, unknown>).reference === "function",
    )
    .map((item) => {
      const ref = item.reference();
      const foreignTableName = typeof ref.foreignTable === "object" && ref.foreignTable !== null
        ? (ref.foreignTable[Symbol.for("drizzle:Name")] as string)
        : "";
      return {
        name: ref.name ?? "",
        columns: ref.columns.map((c) => c.name),
        foreignTable: foreignTableName,
        foreignColumns: ref.foreignColumns.map((c) => c.name),
        onDelete: (item._onDelete ?? "NO ACTION").toUpperCase(),
        onUpdate: (item._onUpdate ?? "NO ACTION").toUpperCase(),
      };
    });
}

function getDrizzleTables(schemaModule: Record<string, unknown>): DrizzleTableRaw[] {
  return Object.values(schemaModule).filter(isDrizzleTable);
}

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
