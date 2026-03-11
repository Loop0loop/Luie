/**
 * Database service using Prisma Client
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { app } from "electron";
import { DB_NAME } from "../../shared/constants/index.js";
import { createLogger } from "../../shared/logger/index.js";
import { isProdEnv, isTestEnv } from "../utils/environment.js";
import { ensureSafeAbsolutePath } from "../utils/pathValidation.js";
import { seedIfEmpty } from "./seedDefaults.js";
import {
  getPrismaBinPath,
  loadPrismaBetterSqlite3,
  pathExists,
  PrismaClientCtor,
  resolvePackagedSchemaMode,
  resolveSqliteDatasourceFromEnv,
  runPrismaCommand,
} from "./databaseRuntime.js";
import { ensurePackagedSqliteSchema } from "./databaseSchemaBootstrap.js";
import type {
  PreparedDatabaseContext,
  PrismaClient,
} from "./databaseTypes.js";

const logger = createLogger("DatabaseService");

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
    this.prisma = this.createPrismaClient(context);

    if (context.isPackaged) {
      try {
        await seedIfEmpty(this.prisma as Parameters<typeof seedIfEmpty>[0]);
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

  private createPrismaClient(context: PreparedDatabaseContext): PrismaClient {
    try {
      const PrismaBetterSqlite3 = loadPrismaBetterSqlite3();
      const adapter = new PrismaBetterSqlite3({
        url: context.datasourceUrl,
      });
      return new PrismaClientCtor({
        adapter: adapter as never,
        log: ["error", "warn"],
      } as never);
    } catch (error) {
      // In local dev/test, native ABI mismatch can happen when the addon was rebuilt for Electron.
      // Fallback to Prisma default sqlite engine to keep tests and CLI workflows unblocked.
      if (context.isPackaged) {
        throw error;
      }
      logger.warn("Falling back to Prisma default sqlite engine (adapter unavailable)", {
        error,
        dbPath: context.dbPath,
        isTest: context.isTest,
      });
      return new PrismaClientCtor({
        datasources: {
          db: { url: context.datasourceUrl },
        },
        log: ["error", "warn"],
      } as never);
    }
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
        ensurePackagedSqliteSchema(context.dbPath, logger);
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
    const schemaMode = resolvePackagedSchemaMode();
    if (schemaMode === "bootstrap") {
      logger.info("Using packaged SQLite bootstrap schema mode", {
        dbPath: context.dbPath,
        schemaMode,
      });
      ensurePackagedSqliteSchema(context.dbPath, logger);
      return;
    }

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
          schemaMode,
        });
      }
    } else {
      logger.warn("Prisma migrate mode requested, but migration assets are missing; using SQLite bootstrap fallback", {
        dbPath: context.dbPath,
        hasMigrations,
        hasSchemaFile,
        hasPrismaBinary,
        resourcesPath: process.resourcesPath,
        schemaMode,
      });
    }

    ensurePackagedSqliteSchema(context.dbPath, logger);
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
