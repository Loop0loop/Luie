/**
 * Database service using Prisma Client
 */

import { spawn } from "node:child_process";
import { constants as fsConstants } from "node:fs";
import * as fs from "node:fs/promises";
import { createRequire } from "node:module";
import * as path from "node:path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { app } from "electron";
import { DB_NAME } from "../../shared/constants/index.js";
import { createLogger } from "../../shared/logger/index.js";
import { isProdEnv, isTestEnv } from "../utils/environment.js";
import { ensureSafeAbsolutePath } from "../utils/pathValidation.js";
import {
  PACKAGED_SCHEMA_BOOTSTRAP_SQL,
  PACKAGED_SCHEMA_COLUMN_PATCHES,
  PACKAGED_SCHEMA_REQUIRED_COLUMNS,
  PACKAGED_SCHEMA_REQUIRED_TABLES,
} from "./packagedSchema.js";
import { seedIfEmpty } from "./seedDefaults.js";

const logger = createLogger("DatabaseService");
const require = createRequire(import.meta.url);

type PrismaDelegate<T extends Record<string, unknown>> = {
  create: (args: unknown) => Promise<T>;
  createMany: (args: unknown) => Promise<{ count: number }>;
  findUnique: (args: unknown) => Promise<T | null>;
  findMany: (args: unknown) => Promise<T[]>;
  update: (args: unknown) => Promise<T>;
  delete: (args: unknown) => Promise<T>;
  deleteMany: (args: unknown) => Promise<{ count: number }>;
  findFirst: (args: unknown) => Promise<T | null>;
  count: (args?: unknown) => Promise<number>;
};

type PrismaRecord = Record<string, unknown>;

type PrismaClient = {
  $disconnect: () => Promise<void>;
  $transaction: (args: unknown) => Promise<unknown>;
  $executeRawUnsafe?: (query: string) => Promise<unknown>;
  project: PrismaDelegate<PrismaRecord>;
  chapter: PrismaDelegate<PrismaRecord>;
  character: PrismaDelegate<PrismaRecord>;
  term: PrismaDelegate<PrismaRecord>;
  snapshot: PrismaDelegate<PrismaRecord>;
  event: PrismaDelegate<PrismaRecord>;
  faction: PrismaDelegate<PrismaRecord>;
  characterAppearance: PrismaDelegate<PrismaRecord>;
  termAppearance: PrismaDelegate<PrismaRecord>;
  worldEntity: PrismaDelegate<PrismaRecord>;
  entityRelation: PrismaDelegate<PrismaRecord>;
};

type PreparedDatabaseContext = {
  dbPath: string;
  datasourceUrl: string;
  isPackaged: boolean;
  isTest: boolean;
};

type PrismaCommandResult = {
  stdout: string;
  stderr: string;
};

type BetterSqlite3Statement<Row extends object = Record<string, unknown>> = {
  get: (...params: unknown[]) => Row | undefined;
  all: (...params: unknown[]) => Row[];
};

type BetterSqlite3Database = {
  pragma: (source: string) => unknown;
  exec: (source: string) => void;
  prepare: <Row extends object = Record<string, unknown>>(source: string) => BetterSqlite3Statement<Row>;
  close: () => void;
};

type BetterSqlite3Constructor = new (
  filename: string,
  options?: { readonly?: boolean; fileMustExist?: boolean; timeout?: number },
) => BetterSqlite3Database;

const { PrismaClient } = require("@prisma/client") as {
  PrismaClient: new (options?: unknown) => PrismaClient;
};

const loadBetterSqlite3 = (): BetterSqlite3Constructor => {
  const loaded = require("better-sqlite3") as BetterSqlite3Constructor | { default: BetterSqlite3Constructor };
  return typeof loaded === "function" ? loaded : loaded.default;
};

const escapeSqlIdentifier = (name: string): string => `"${name.replace(/"/g, "\"\"")}"`;

const pathExists = async (targetPath: string): Promise<boolean> => {
  try {
    await fs.access(targetPath, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
};

const getPrismaBinPath = (basePath: string): string => {
  const executable = process.platform === "win32" ? "prisma.cmd" : "prisma";
  return path.join(basePath, "node_modules", ".bin", executable);
};

const SQLITE_URL_PREFIX = "file:";

const resolveSqliteDatasourceFromEnv = (input: string): { dbPath: string; datasourceUrl: string } => {
  if (!input.startsWith(SQLITE_URL_PREFIX)) {
    throw new Error("DATABASE_URL must use sqlite file: URL");
  }

  const raw = input.slice(SQLITE_URL_PREFIX.length);
  if (!raw || raw === ":memory:" || raw.startsWith(":memory:?")) {
    throw new Error("DATABASE_URL must point to a persistent sqlite file path");
  }

  const queryIndex = raw.indexOf("?");
  const rawPath = queryIndex >= 0 ? raw.slice(0, queryIndex) : raw;
  const rawQuery = queryIndex >= 0 ? raw.slice(queryIndex + 1) : "";
  const absolutePath = ensureSafeAbsolutePath(
    path.isAbsolute(rawPath) ? rawPath : path.resolve(process.cwd(), rawPath),
    "DATABASE_URL",
  );
  const datasourceUrl = rawQuery.length > 0 ? `file:${absolutePath}?${rawQuery}` : `file:${absolutePath}`;

  return { dbPath: absolutePath, datasourceUrl };
};

const runPrismaCommand = async (
  commandPath: string,
  commandArgs: string[],
  env: NodeJS.ProcessEnv,
): Promise<PrismaCommandResult> => {
  return await new Promise<PrismaCommandResult>((resolve, reject) => {
    const child = spawn(commandPath, commandArgs, {
      env,
      shell: false,
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (chunk: Buffer | string) => {
      stdout += chunk.toString();
    });

    child.stderr?.on("data", (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      const failure = new Error(`Prisma command failed with exit code ${code}`) as Error & {
        code: number | null;
        stdout: string;
        stderr: string;
      };
      failure.code = code;
      failure.stdout = stdout;
      failure.stderr = stderr;
      reject(failure);
    });
  });
};

class DatabaseService {
  private static instance: DatabaseService;
  private prisma: PrismaClient | null = null;
  private dbPath: string | null = null;
  private initPromise: Promise<void> | null = null;

  private constructor() {
  }

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  async initialize(): Promise<void> {
    if (this.prisma) {
      return;
    }

    if (!this.initPromise) {
      this.initPromise = this.initializeInternal().finally(() => {
        this.initPromise = null;
      });
    }

    await this.initPromise;
  }

  private async initializeInternal(): Promise<void> {
    const context = await this.prepareDatabaseContext();
    this.dbPath = context.dbPath;

    logger.info("Initializing database", {
      isPackaged: context.isPackaged,
      isTest: context.isTest,
      hasEnvDb: Boolean(process.env.DATABASE_URL),
      userDataPath: app.getPath("userData"),
      dbPath: context.dbPath,
      datasourceUrl: context.datasourceUrl,
    });

    await this.applySchema(context);

    const adapter = new PrismaBetterSqlite3({
      url: context.datasourceUrl,
    });

    this.prisma = new PrismaClient({
      adapter,
      log: ["error", "warn"],
    });

    if (context.isPackaged) {
      try {
        await seedIfEmpty(this.prisma);
      } catch (error) {
        logger.error("Failed to seed packaged database", { error });
      }
    }

    if (this.prisma.$executeRawUnsafe) {
      try {
        await this.prisma.$executeRawUnsafe("PRAGMA journal_mode=WAL;");
        await this.prisma.$executeRawUnsafe("PRAGMA synchronous=FULL;");
        await this.prisma.$executeRawUnsafe("PRAGMA wal_autocheckpoint=1000;");
        logger.info("SQLite WAL mode enabled");
      } catch (error) {
        logger.warn("Failed to enable WAL mode", { error });
      }
    }

    logger.info("Database service initialized");
  }

  private async prepareDatabaseContext(): Promise<PreparedDatabaseContext> {
    const isPackaged = isProdEnv();
    const userDataPath = app.getPath("userData");
    const isTest = isTestEnv();
    const envDb = process.env.DATABASE_URL;
    const hasEnvDb = Boolean(envDb);

    let dbPath: string;
    let datasourceUrl: string;

    if (hasEnvDb) {
      const resolved = resolveSqliteDatasourceFromEnv(envDb ?? "");
      dbPath = resolved.dbPath;
      datasourceUrl = resolved.datasourceUrl;
    } else if (isPackaged) {
      dbPath = ensureSafeAbsolutePath(path.join(userDataPath, DB_NAME), "dbPath");
      datasourceUrl = `file:${dbPath}`;
    } else {
      dbPath = ensureSafeAbsolutePath(path.join(process.cwd(), "prisma", "dev.db"), "dbPath");
      datasourceUrl = `file:${dbPath}`;
    }

    process.env.DATABASE_URL = datasourceUrl;

    await fs.mkdir(userDataPath, { recursive: true });
    await fs.mkdir(path.dirname(dbPath), { recursive: true });
    if (!(await pathExists(dbPath))) {
      await fs.writeFile(dbPath, "");
    }

    return {
      dbPath,
      datasourceUrl,
      isPackaged,
      isTest,
    };
  }

  private async applySchema(context: PreparedDatabaseContext): Promise<void> {
    const dbExists = await pathExists(context.dbPath);
    const cwd = context.isPackaged ? process.resourcesPath : process.cwd();
    const schemaPath = path.join(cwd, "prisma", "schema.prisma");
    const prismaPath = getPrismaBinPath(cwd);
    const migrationsDir = path.join(cwd, "prisma", "migrations");
    const hasMigrations =
      (await pathExists(migrationsDir)) &&
      (await fs
        .readdir(migrationsDir, { withFileTypes: true })
        .then((entries) => entries.some((entry) => entry.isDirectory())));

    const commandEnv = { ...process.env, DATABASE_URL: context.datasourceUrl };

    if (context.isPackaged) {
      await this.applyPackagedSchema(context, {
        dbExists,
        schemaPath,
        prismaPath,
        hasMigrations,
        commandEnv,
      });
      return;
    }

    if (context.isTest) {
      logger.info("Running test database push", {
        dbPath: context.dbPath,
        dbExists,
        command: "db push",
      });

      try {
        await runPrismaCommand(
          prismaPath,
          ["db", "push", "--accept-data-loss", `--schema=${schemaPath}`],
          commandEnv,
        );
        logger.info("Test database push completed successfully");
      } catch (error) {
        const prismaError = error as { stdout?: string; stderr?: string };
        logger.warn("Failed to push test database; falling back to SQLite bootstrap", {
          error,
          stdout: prismaError.stdout,
          stderr: prismaError.stderr,
          dbPath: context.dbPath,
        });
        this.ensurePackagedSqliteSchema(context.dbPath);
      }
      return;
    }

    logger.info("Running development database push", {
      dbPath: context.dbPath,
      dbExists,
      hasMigrations,
      command: "db push",
    });

    try {
      await runPrismaCommand(
        prismaPath,
        ["db", "push", "--accept-data-loss", `--schema=${schemaPath}`],
        commandEnv,
      );
      logger.info("Development database ready");
    } catch (error) {
      const prismaError = error as { stdout?: string; stderr?: string };
      logger.error("Failed to prepare development database", {
        error,
        stdout: prismaError.stdout,
        stderr: prismaError.stderr,
      });
      throw error;
    }
  }

  private async applyPackagedSchema(
    context: PreparedDatabaseContext,
    options: {
      dbExists: boolean;
      schemaPath: string;
      prismaPath: string;
      hasMigrations: boolean;
      commandEnv: NodeJS.ProcessEnv;
    },
  ): Promise<void> {
    const { dbExists, schemaPath, prismaPath, hasMigrations, commandEnv } = options;
    const hasSchemaFile = await pathExists(schemaPath);
    const hasPrismaBinary = await pathExists(prismaPath);

    if (hasMigrations && hasSchemaFile && hasPrismaBinary) {
      logger.info("Running production migrations", {
        dbPath: context.dbPath,
        dbExists,
        command: "migrate deploy",
      });

      try {
        await runPrismaCommand(prismaPath, ["migrate", "deploy", `--schema=${schemaPath}`], commandEnv);
        logger.info("Production migrations applied successfully");
      } catch (error) {
        const prismaError = error as { stdout?: string; stderr?: string };
        logger.warn("Production migrate deploy failed; using SQLite bootstrap fallback", {
          error,
          stdout: prismaError.stdout,
          stderr: prismaError.stderr,
        });
      }
    } else {
      logger.info("Prisma runtime assets not bundled; using packaged SQLite bootstrap", {
        dbPath: context.dbPath,
        hasMigrations,
        hasSchemaFile,
        hasPrismaBinary,
        resourcesPath: process.resourcesPath,
      });
    }

    this.ensurePackagedSqliteSchema(context.dbPath);
  }

  private ensurePackagedSqliteSchema(dbPath: string): void {
    const BetterSqlite3 = loadBetterSqlite3();
    const sqlite = new BetterSqlite3(dbPath);

    try {
      sqlite.pragma("foreign_keys = ON");

      const missingTablesBefore = PACKAGED_SCHEMA_REQUIRED_TABLES.filter(
        (table) => !this.sqliteTableExists(sqlite, table),
      );

      // Idempotent schema bootstrap for packaged runtime when Prisma CLI assets are missing.
      sqlite.exec(PACKAGED_SCHEMA_BOOTSTRAP_SQL);

      const patchedColumns: string[] = [];
      for (const patch of PACKAGED_SCHEMA_COLUMN_PATCHES) {
        if (!this.sqliteTableExists(sqlite, patch.table)) {
          continue;
        }
        if (this.sqliteTableHasColumn(sqlite, patch.table, patch.column)) {
          continue;
        }
        sqlite.exec(patch.sql);
        patchedColumns.push(`${patch.table}.${patch.column}`);
      }

      const missingColumns: string[] = [];
      for (const [table, requiredColumns] of Object.entries(PACKAGED_SCHEMA_REQUIRED_COLUMNS)) {
        for (const column of requiredColumns) {
          if (!this.sqliteTableHasColumn(sqlite, table, column)) {
            missingColumns.push(`${table}.${column}`);
          }
        }
      }

      if (missingColumns.length > 0) {
        throw new Error(`Packaged SQLite schema verification failed: missing ${missingColumns.join(", ")}`);
      }

      if (missingTablesBefore.length > 0 || patchedColumns.length > 0) {
        logger.info("Packaged SQLite schema bootstrap applied", {
          dbPath,
          createdTables: missingTablesBefore,
          patchedColumns,
        });
      }
    } finally {
      sqlite.close();
    }
  }

  private sqliteTableExists(sqlite: BetterSqlite3Database, tableName: string): boolean {
    const statement = sqlite.prepare<{ found: number }>(
      "SELECT 1 AS found FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1",
    );
    return Boolean(statement.get(tableName)?.found);
  }

  private sqliteTableHasColumn(sqlite: BetterSqlite3Database, tableName: string, columnName: string): boolean {
    if (!this.sqliteTableExists(sqlite, tableName)) {
      return false;
    }

    const statement = sqlite.prepare<{ name: string }>(
      `PRAGMA table_info(${escapeSqlIdentifier(tableName)})`,
    );
    const columns = statement.all();
    return columns.some((column) => column.name === columnName);
  }

  getClient(): PrismaClient {
    if (!this.prisma) {
      throw new Error("Database is not initialized. Call db.initialize() first.");
    }
    return this.prisma;
  }

  getDatabasePath(): string {
    if (!this.dbPath) {
      throw new Error("Database path not initialized");
    }
    return this.dbPath;
  }

  async disconnect(): Promise<void> {
    if (this.initPromise && !this.prisma) {
      await this.initPromise.catch((error) => {
        logger.error("Database initialization failed before disconnect", { error });
      });
    }
    if (!this.prisma) {
      return;
    }

    await this.prisma.$disconnect();
    this.prisma = null;
    logger.info("Database disconnected");
  }
}

export const db = DatabaseService.getInstance();
