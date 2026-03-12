import * as fsp from "node:fs/promises";
import Database from "better-sqlite3";
import {
  LUIE_PACKAGE_FORMAT,
} from "../../../shared/constants/index.js";
import { ErrorCode } from "../../../shared/constants/errorCode.js";
import { normalizeZipPath, isSafeZipPath } from "../../utils/luiePackage.js";
import { ServiceError } from "../../utils/serviceError.js";
import {
  atomicReplace,
  ensureParentDir,
  withPackageWriteLock,
} from "./luiePackageWriter.js";
import { buildLuieContainerTextEntries } from "./luieContainerEntries.js";
import type {
  LuiePackageExportData,
  LoggerLike,
} from "./luiePackageTypes.js";

const SQLITE_CONTAINER_LABEL = "sqlite";
const SQLITE_CONTAINER_VERSION = 2;
const SQLITE_JOURNAL_MODE = "DELETE";
const MAX_LUIE_ENTRY_SIZE_BYTES = 5 * 1024 * 1024;

const SQLITE_CONTAINER_BOOTSTRAP_SQL = `
CREATE TABLE IF NOT EXISTS "LuieContainerInfo" (
  "id" INTEGER NOT NULL PRIMARY KEY CHECK ("id" = 1),
  "format" TEXT NOT NULL,
  "container" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "createdAt" TEXT NOT NULL,
  "updatedAt" TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS "LuieContainerEntry" (
  "path" TEXT NOT NULL PRIMARY KEY,
  "content" TEXT NOT NULL,
  "createdAt" TEXT NOT NULL,
  "updatedAt" TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS "LuieContainerEntry_updatedAt_idx" ON "LuieContainerEntry"("updatedAt");
`;

type SqliteContainerInfoRow = {
  format: string;
  container: string;
  version: number;
};

const normalizeEntryPathOrThrow = (entryPath: string): string => {
  const normalized = normalizeZipPath(entryPath);
  if (!normalized || !isSafeZipPath(normalized)) {
    throw new ServiceError(
      ErrorCode.FS_READ_FAILED,
      "Invalid .luie sqlite entry path",
      { entryPath },
    );
  }
  return normalized;
};

const openSqliteContainer = (
  targetPath: string,
  options: {
    readonly: boolean;
    fileMustExist?: boolean;
  },
): Database.Database => {
  return new Database(targetPath, {
    readonly: options.readonly,
    fileMustExist: options.fileMustExist,
  });
};

const assertSupportedSqliteContainer = (
  database: Database.Database,
  targetPath: string,
): void => {
  const row = database
    .prepare(
      `SELECT "format", "container", "version" FROM "LuieContainerInfo" WHERE "id" = 1`,
    )
    .get() as SqliteContainerInfoRow | undefined;

  if (
    !row ||
    row.format !== LUIE_PACKAGE_FORMAT ||
    row.container !== SQLITE_CONTAINER_LABEL ||
    Number(row.version) !== SQLITE_CONTAINER_VERSION
  ) {
    throw new ServiceError(
      ErrorCode.FS_READ_FAILED,
      "Unsupported SQLite-backed .luie container format",
      {
        packagePath: targetPath,
        format: row?.format ?? null,
        container: row?.container ?? null,
        version: row?.version ?? null,
      },
    );
  }
};

export const readLuieSqliteEntry = async (
  targetPath: string,
  entryPath: string,
): Promise<string | null> => {
  const normalizedEntryPath = normalizeEntryPathOrThrow(entryPath);
  const database = openSqliteContainer(targetPath, {
    readonly: true,
    fileMustExist: true,
  });

  try {
    assertSupportedSqliteContainer(database, targetPath);
    const row = database
      .prepare(`SELECT "content" FROM "LuieContainerEntry" WHERE "path" = ?`)
      .get(normalizedEntryPath) as { content: string } | undefined;

    if (!row) {
      return null;
    }

    if (Buffer.byteLength(row.content, "utf8") > MAX_LUIE_ENTRY_SIZE_BYTES) {
      throw new ServiceError(
        ErrorCode.FS_READ_FAILED,
        "SQLite-backed .luie entry is too large",
        {
          packagePath: targetPath,
          entryPath: normalizedEntryPath,
          maxSizeBytes: MAX_LUIE_ENTRY_SIZE_BYTES,
        },
      );
    }

    return row.content;
  } finally {
    database.close();
  }
};

export const writeLuieSqliteContainer = async (input: {
  targetPath: string;
  payload: LuiePackageExportData;
  logger: LoggerLike;
}): Promise<void> => {
  const tempPath = `${input.targetPath}.tmp-${Date.now()}`;

  await withPackageWriteLock(input.targetPath, async () => {
    await ensureParentDir(input.targetPath);

    let database: Database.Database | null = null;
    try {
      database = openSqliteContainer(tempPath, {
        readonly: false,
        fileMustExist: false,
      });
      database.pragma(`journal_mode = ${SQLITE_JOURNAL_MODE}`);
      database.pragma("synchronous = FULL");
      database.exec(SQLITE_CONTAINER_BOOTSTRAP_SQL);

      const nowIso = new Date().toISOString();
      const entries = buildLuieContainerTextEntries(input.payload, input.targetPath, {
        containerLabel: SQLITE_CONTAINER_LABEL,
        containerVersion: SQLITE_CONTAINER_VERSION,
      });

      const writeTransaction = database.transaction(() => {
        database
          ?.prepare(`DELETE FROM "LuieContainerInfo"`)
          .run();
        database
          ?.prepare(`DELETE FROM "LuieContainerEntry"`)
          .run();
        database
          ?.prepare(
            `INSERT INTO "LuieContainerInfo" ("id", "format", "container", "version", "createdAt", "updatedAt")
             VALUES (1, ?, ?, ?, ?, ?)`,
          )
          .run(
            LUIE_PACKAGE_FORMAT,
            SQLITE_CONTAINER_LABEL,
            SQLITE_CONTAINER_VERSION,
            nowIso,
            nowIso,
          );

        const insertEntry = database?.prepare(
          `INSERT INTO "LuieContainerEntry" ("path", "content", "createdAt", "updatedAt")
           VALUES (?, ?, ?, ?)`,
        );

        for (const entry of entries) {
          const normalizedEntryPath = normalizeEntryPathOrThrow(entry.name);
          insertEntry?.run(normalizedEntryPath, entry.content, nowIso, nowIso);
        }
      });

      writeTransaction();
      database.close();
      database = null;

      await atomicReplace(tempPath, input.targetPath, input.logger);
    } catch (error) {
      if (database) {
        database.close();
      }
      try {
        await fsp.rm(tempPath, { force: true });
      } catch {
        // best-effort cleanup only
      }
      throw error;
    }
  });
};
