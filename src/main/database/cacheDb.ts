import * as fs from "node:fs/promises";
import { createRequire } from "node:module";
import * as path from "node:path";
import { app } from "electron";
import type { PrismaClient as GeneratedCachePrismaClient } from "@prisma-cache/client";
import BetterSqliteDatabase from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { CACHE_DB_NAME } from "../../shared/constants/index.js";
import { createLogger } from "../../shared/logger/index.js";
import { isProdEnv, isTestEnv } from "../utils/environment.js";
import { ensureSafeAbsolutePath } from "../utils/pathValidation.js";
import * as cacheSchema from "./cacheSchema.js";
import type {
  CacheDrizzleClient,
  DrizzleDatabaseHandle,
} from "./databaseTypes.js";
import {
  getPrismaBinPath,
  loadPrismaBetterSqlite3,
  pathExists,
  resolvePackagedSchemaMode,
  resolveSqliteDatasourceFromEnv,
  runPrismaCommand,
} from "./databaseRuntime.js";
import {
  dropPackagedCacheOptionalFtsArtifacts,
  ensurePackagedCacheSqliteSchema,
} from "./cacheSchemaBootstrap.js";

const require = createRequire(import.meta.url);
const logger = createLogger("CacheDatabaseService");
const CACHE_ENV_KEY = "CACHE_DATABASE_URL";
const RUNTIME_CACHE_ENV_KEY = "LUIE_RUNTIME_CACHE_DATABASE_URL";
type CachePrismaClientCtor = new (options?: unknown) => GeneratedCachePrismaClient;
type CachePrismaClient = GeneratedCachePrismaClient;
type CachePrismaClientModule = {
  PrismaClient?: CachePrismaClientCtor;
};

let cachePrismaClientCtor: CachePrismaClientCtor | null = null;

const loadCachePrismaClientCtor = (): CachePrismaClientCtor => {
  if (cachePrismaClientCtor) {
    return cachePrismaClientCtor;
  }

  const moduleExports = require("@prisma-cache/client") as CachePrismaClientModule;
  if (typeof moduleExports.PrismaClient !== "function") {
    throw new Error("Prisma cache client constructor is unavailable");
  }

  cachePrismaClientCtor = moduleExports.PrismaClient;
  return cachePrismaClientCtor;
};

type PreparedCacheDatabaseContext = {
  dbPath: string;
  datasourceUrl: string;
  isPackaged: boolean;
  isTest: boolean;
};

class CacheDatabaseService {
  private static instance: CacheDatabaseService;
  private prisma: CachePrismaClient | null = null;
  private drizzleHandle: DrizzleDatabaseHandle<CacheDrizzleClient> | null = null;
  private dbPath: string | null = null;
  private initPromise: Promise<void> | null = null;

  private constructor() {}

  static getInstance(): CacheDatabaseService {
    if (!CacheDatabaseService.instance) {
      CacheDatabaseService.instance = new CacheDatabaseService();
    }
    return CacheDatabaseService.instance;
  }

  async initialize(): Promise<void> {
    if (this.prisma) return;
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

    logger.info("Initializing cache database", {
      isPackaged: context.isPackaged,
      isTest: context.isTest,
      hasEnvDb: Boolean(process.env[CACHE_ENV_KEY]),
      userDataPath: app.getPath("userData"),
      dbPath: context.dbPath,
      datasourceUrl: context.datasourceUrl,
    });

    await this.applySchema(context);
    ensurePackagedCacheSqliteSchema(context.dbPath, logger);
    this.drizzleHandle = this.createDrizzleClient(context);
    this.prisma = this.createPrismaClient(context);

    // TODO: Remove this Prisma-based WAL block in Phase 7
    try {
      await this.prisma.$executeRawUnsafe("PRAGMA journal_mode=WAL;");
      await this.prisma.$executeRawUnsafe("PRAGMA synchronous=FULL;");
      await this.prisma.$executeRawUnsafe("PRAGMA wal_autocheckpoint=1000;");
      logger.info("Cache SQLite WAL mode enabled");
    } catch (error) {
      logger.warn("Failed to enable cache WAL mode", { error });
    }

    logger.info("Cache database service initialized");
  }

  private createDrizzleClient(
    context: PreparedCacheDatabaseContext,
  ): DrizzleDatabaseHandle<CacheDrizzleClient> {
    const sqlite = new BetterSqliteDatabase(context.dbPath);
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("foreign_keys = ON");
    sqlite.pragma("busy_timeout = 5000");
    const client = drizzle(sqlite, { schema: cacheSchema });
    return { sqlite, client };
  }

  // TODO: Remove in Phase 7 — Prisma client creation replaced by Drizzle
  private createPrismaClient(
    context: PreparedCacheDatabaseContext,
  ): CachePrismaClient {
    const CachePrismaClientCtor = loadCachePrismaClientCtor();

    try {
      const PrismaBetterSqlite3 = loadPrismaBetterSqlite3();
      const adapter = new PrismaBetterSqlite3({
        url: context.datasourceUrl,
      });
      return new CachePrismaClientCtor({
        adapter: adapter as never,
        log: ["error", "warn"],
      } as never);
    } catch (error) {
      if (context.isPackaged) throw error;
      logger.warn("Falling back to Prisma default sqlite engine for cache DB", {
        error,
        dbPath: context.dbPath,
        isTest: context.isTest,
      });
      return new CachePrismaClientCtor({
        datasources: {
          db: { url: context.datasourceUrl },
        },
        log: ["error", "warn"],
      } as never);
    }
  }

  private async prepareDatabaseContext(): Promise<PreparedCacheDatabaseContext> {
    const isPackaged = isProdEnv();
    const userDataPath = app.getPath("userData");
    const isTest = isTestEnv();
    const envDb = isTestEnv()
      ? process.env[CACHE_ENV_KEY]
      : process.env[RUNTIME_CACHE_ENV_KEY];
    const hasEnvDb = Boolean(envDb);

    let dbPath: string;
    let datasourceUrl: string;

    if (hasEnvDb) {
      const resolved = resolveSqliteDatasourceFromEnv(envDb ?? "");
      dbPath = resolved.dbPath;
      datasourceUrl = resolved.datasourceUrl;
    } else if (isPackaged) {
      dbPath = ensureSafeAbsolutePath(
        path.join(userDataPath, CACHE_DB_NAME),
        "cacheDbPath",
      );
      datasourceUrl = `file:${dbPath}`;
    } else {
      dbPath = ensureSafeAbsolutePath(
        path.join(process.cwd(), "prisma", "app-dev-cache.db"),
        "cacheDbPath",
      );
      datasourceUrl = `file:${dbPath}`;
    }

    process.env[CACHE_ENV_KEY] = datasourceUrl;

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

  private async applySchema(context: PreparedCacheDatabaseContext): Promise<void> {
    const dbExists = await pathExists(context.dbPath);
    const cwd = context.isPackaged ? process.resourcesPath : process.cwd();
    const schemaPath = path.join(cwd, "prisma-cache", "schema.prisma");
    const prismaPath = getPrismaBinPath(cwd);
    const commandEnv = {
      ...process.env,
      DATABASE_URL: context.datasourceUrl,
      [CACHE_ENV_KEY]: context.datasourceUrl,
    };

    if (context.isPackaged) {
      const schemaMode = resolvePackagedSchemaMode();
      if (schemaMode === "bootstrap") {
        logger.info("Using packaged cache SQLite bootstrap schema mode", {
          dbPath: context.dbPath,
          schemaMode,
        });
        ensurePackagedCacheSqliteSchema(context.dbPath, logger);
        return;
      }

      if ((await pathExists(schemaPath)) && (await pathExists(prismaPath))) {
        try {
          if (dbExists) {
            dropPackagedCacheOptionalFtsArtifacts(context.dbPath, logger);
          }
          await runPrismaCommand(
            prismaPath,
            ["db", "push", "--accept-data-loss", `--schema=${schemaPath}`],
            commandEnv,
          );
          logger.info("Packaged cache database ready");
          return;
        } catch (error) {
          const prismaError = error as { stdout?: string; stderr?: string };
          logger.warn("Packaged cache db push failed; using SQLite bootstrap fallback", {
            error,
            stdout: prismaError.stdout,
            stderr: prismaError.stderr,
          });
        }
      }

      ensurePackagedCacheSqliteSchema(context.dbPath, logger);
      return;
    }

    logger.info("Running cache database push", {
      dbPath: context.dbPath,
      dbExists,
      command: "db push",
    });

    try {
      if (dbExists) {
        dropPackagedCacheOptionalFtsArtifacts(context.dbPath, logger);
      }
      await runPrismaCommand(
        prismaPath,
        ["db", "push", "--accept-data-loss", `--schema=${schemaPath}`],
        commandEnv,
      );
      logger.info("Cache database ready");
    } catch (error) {
      const prismaError = error as { stdout?: string; stderr?: string };
      logger.warn("Failed to push cache database; falling back to SQLite bootstrap", {
        error,
        stdout: prismaError.stdout,
        stderr: prismaError.stderr,
        dbPath: context.dbPath,
      });
      ensurePackagedCacheSqliteSchema(context.dbPath, logger);
    }
  }

  getClient(): CachePrismaClient {
    if (!this.prisma) {
      throw new Error("Cache database is not initialized. Call cacheDb.initialize() first.");
    }
    return this.prisma;
  }

  /**
   * Returns the Drizzle ORM client for the cache database.
   * @deprecated Phase 7: getClient() will also return Drizzle.
   */
  getDrizzleClient(): CacheDrizzleClient {
    if (!this.drizzleHandle) {
      throw new Error("Cache database is not initialized. Call cacheDb.initialize() first.");
    }
    return this.drizzleHandle.client;
  }

  getDatabasePath(): string {
    if (!this.dbPath) {
      throw new Error("Cache database path not initialized");
    }
    return this.dbPath;
  }

  async disconnect(): Promise<void> {
    if (this.initPromise && !this.prisma) {
      await this.initPromise.catch((error) => {
        logger.error("Cache database initialization failed before disconnect", {
          error,
        });
      });
    }
    if (!this.prisma && !this.drizzleHandle) return;

    if (this.prisma) {
      // TODO: Remove Prisma disconnect in Phase 7
      await this.prisma.$disconnect();
    }
    this.prisma = null;
    this.drizzleHandle?.sqlite.close();
    this.drizzleHandle = null;
    logger.info("Cache database disconnected");
  }
}

export const cacheDb = CacheDatabaseService.getInstance();
