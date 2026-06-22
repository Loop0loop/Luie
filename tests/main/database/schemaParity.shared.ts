import * as fs from "node:fs";
import { createRequire } from "node:module";
import * as os from "node:os";
import * as path from "node:path";
import { describe } from "vitest";

export type ColumnInfo = {
  name: string;
  type: string;
  notNull: boolean;
  primaryKey: boolean;
  defaultValue: string | null;
};

export type IndexInfo = {
  name: string;
  unique: boolean;
  columns: string[];
};

export type ForeignKeyInfo = {
  fromColumn: string;
  toTable: string;
  toColumn: string;
  onDelete: string;
  onUpdate: string;
};

export type TableSchema = {
  columns: ColumnInfo[];
  indexes: IndexInfo[];
  foreignKeys: ForeignKeyInfo[];
};

export type DatabaseSyncInstance = {
  close: () => void;
  exec: (sql: string) => void;
  prepare: (sql: string) => {
    all: () => unknown[];
  };
};

export type DatabaseSyncConstructor = new (path: string) => DatabaseSyncInstance;

export const require = createRequire(import.meta.url);

export function loadDatabaseSync(): DatabaseSyncConstructor | undefined {
  try {
    return (require("node:sqlite") as { DatabaseSync: DatabaseSyncConstructor }).DatabaseSync;
  } catch {
    return undefined;
  }
}

export const DatabaseSync = loadDatabaseSync();
export const describeWithNodeSqlite = DatabaseSync ? describe : describe.skip;

export function createDatabase(dbPath: string): DatabaseSyncInstance {
  if (!DatabaseSync) {
    throw new Error("node:sqlite DatabaseSync requires Node.js 22.5.0 or newer");
  }
  return new DatabaseSync(dbPath);
}

export function getTableInfo(db: DatabaseSyncInstance, tableName: string): TableSchema {
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

export function getAllUserTables(db: DatabaseSyncInstance): string[] {
  return (
    db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name;",
      )
      .all() as Array<{ name: string }>
  ).map((row) => row.name);
}

export const DRIZZLE_TABLE_NAME = Symbol.for("drizzle:Name");
export const DRIZZLE_COLUMNS = Symbol.for("drizzle:Columns");
export const DRIZZLE_EXTRA_CONFIG_BUILDER = Symbol.for("drizzle:ExtraConfigBuilder");

export function executeSql(db: DatabaseSyncInstance, sql: string): void {
  db.exec(sql.split("--> statement-breakpoint").join(""));
}

export function normalizeColumnType(type: string): string {
  const normalized = type.toUpperCase();
  if (normalized === "DATETIME") return "TEXT";
  if (normalized === "BOOLEAN") return "INTEGER";
  return normalized;
}

export function normalizeDefaultValue(value: string | null): string | null {
  if (value === null) return null;
  return value.replace(/^\((.*)\)$/u, "$1").toUpperCase();
}

export function normalizeTableSchema(schema: TableSchema): TableSchema {
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

export function getDatabaseSchema(db: DatabaseSyncInstance): Record<string, TableSchema> {
  const schema: Record<string, TableSchema> = {};
  for (const tableName of getAllUserTables(db)) {
    schema[tableName] = normalizeTableSchema(getTableInfo(db, tableName));
  }
  return schema;
}

export function readMigrationSql(kind: "main" | "cache"): string {
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

export type DrizzleColumnInfo = {
  name: string;
  hasDefault: boolean;
  notNull: boolean;
  isPrimaryKey: boolean;
};

export type DrizzleIndexInfo = {
  name: string;
  columns: string[];
  isUnique: boolean;
};

export type DrizzleForeignKeyInfo = {
  name: string;
  columns: string[];
  foreignTable: string;
  foreignColumns: string[];
  onDelete: string;
  onUpdate: string;
};

export type DrizzleTableRaw = Record<typeof DRIZZLE_TABLE_NAME, string> &
  Record<typeof DRIZZLE_COLUMNS, Record<string, { name: string; primary?: boolean; notNull?: boolean; hasDefault?: boolean }>> &
  Record<typeof DRIZZLE_EXTRA_CONFIG_BUILDER, ((table: unknown) => Array<unknown>) | undefined>;

export function isDrizzleTable(value: unknown): value is DrizzleTableRaw {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Record<symbol, unknown>)[DRIZZLE_TABLE_NAME] === "string"
  );
}

export function extractDrizzleColumns(table: DrizzleTableRaw): DrizzleColumnInfo[] {
  const cols = table[DRIZZLE_COLUMNS];
  return Object.values(cols).map((col) => ({
    name: col.name,
    hasDefault: col.hasDefault ?? false,
    notNull: col.notNull ?? false,
    isPrimaryKey: col.primary ?? false,
  }));
}

export function extractDrizzleIndexes(table: DrizzleTableRaw): DrizzleIndexInfo[] {
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

export function extractDrizzleForeignKeys(table: DrizzleTableRaw): DrizzleForeignKeyInfo[] {
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

export function getDrizzleTables(schemaModule: Record<string, unknown>): DrizzleTableRaw[] {
  return Object.values(schemaModule).filter(isDrizzleTable);
}
