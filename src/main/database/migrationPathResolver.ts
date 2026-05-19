import * as path from "node:path";
import { resolveUserDataPath } from "../utils/userDataPath.js";
import { isProdEnv, isTestEnv } from "../utils/environment.js";

export const DRIZZLE_MIGRATIONS_ROOT_DIR = "drizzle";

export type MigrationDatabaseKind = "main" | "cache";

export type MigrationPathContext = {
  kind: MigrationDatabaseKind;
  isPackaged: boolean;
  isTest: boolean;
  migrationsFolder: string;
  fts5SchemaPath: string;
};

const resolveProjectRoot = (): string => process.cwd();

export const resolveMigrationPathContext = (
  kind: MigrationDatabaseKind,
): MigrationPathContext => {
  const isPackaged = isProdEnv();
  const isTest = isTestEnv();
  const basePath = isPackaged ? process.resourcesPath : resolveProjectRoot();
  const migrationsFolder = path.join(basePath, DRIZZLE_MIGRATIONS_ROOT_DIR, kind);
  const fts5SchemaPath = path.join(basePath, DRIZZLE_MIGRATIONS_ROOT_DIR, "cache", "fts5.sql");

  return {
    kind,
    isPackaged,
    isTest,
    migrationsFolder,
    fts5SchemaPath,
  };
};

export const resolveUserDataMigrationScratchPath = (): string =>
  path.join(resolveUserDataPath(), "drizzle");
