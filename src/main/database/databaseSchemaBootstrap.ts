import Database from "better-sqlite3";
import {
  PACKAGED_SCHEMA_BOOTSTRAP_SQL,
  PACKAGED_SCHEMA_COLUMN_PATCHES,
  PACKAGED_SCHEMA_REQUIRED_COLUMNS,
  PACKAGED_SCHEMA_REQUIRED_TABLES,
} from "./packagedSchema.js";

type LoggerLike = {
  info: (message: string, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown>) => void;
};

function escapeSqlIdentifier(value: string): string {
  return value.replaceAll('"', '""');
}

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

function sqliteTableHasColumn(
  database: InstanceType<typeof Database>,
  tableName: string,
  columnName: string,
): boolean {
  const escapedTableName = escapeSqlIdentifier(tableName);
  const rows = database
    .prepare(`PRAGMA table_info("${escapedTableName}")`)
    .all() as Array<{ name?: string }>;
  return rows.some((row) => row.name === columnName);
}

export function ensurePackagedSqliteSchema(
  dbPath: string,
  logger: LoggerLike,
): void {
  const database = new Database(dbPath);

  try {
    database.pragma("journal_mode = WAL");
    database.exec(PACKAGED_SCHEMA_BOOTSTRAP_SQL);

    let patchedColumns = 0;
    for (const patch of PACKAGED_SCHEMA_COLUMN_PATCHES) {
      if (!sqliteTableExists(database, patch.table)) {
        continue;
      }
      if (sqliteTableHasColumn(database, patch.table, patch.column)) {
        continue;
      }
      database.exec(patch.sql);
      patchedColumns += 1;
    }

    const missingTables = PACKAGED_SCHEMA_REQUIRED_TABLES.filter(
      (tableName) => !sqliteTableExists(database, tableName),
    );
    const missingColumns = Object.entries(PACKAGED_SCHEMA_REQUIRED_COLUMNS)
      .flatMap(([tableName, columns]) =>
        columns
          .filter((columnName) => !sqliteTableHasColumn(database, tableName, columnName))
          .map((columnName) => `${tableName}.${columnName}`),
      );

    if (missingTables.length > 0 || missingColumns.length > 0) {
      logger.warn("Packaged SQLite bootstrap completed with schema gaps", {
        dbPath,
        missingTables,
        missingColumns,
        patchedColumns,
      });
      return;
    }

    logger.info("Packaged SQLite bootstrap schema ensured", {
      dbPath,
      patchedColumns,
    });
  } finally {
    database.close();
  }
}
