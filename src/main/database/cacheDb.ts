import * as fs from "node:fs/promises";
import * as path from "node:path";
import { app } from "electron";
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
  pathExists,
  resolveSqliteDatasourceFromEnv,
} from "./databaseRuntime.js";
import {
  ensurePackagedCacheSqliteSchema,
} from "./cacheSchemaBootstrap.js";

const logger = createLogger("CacheDatabaseService");
const CACHE_ENV_KEY = "CACHE_DATABASE_URL";
const RUNTIME_CACHE_ENV_KEY = "LUIE_RUNTIME_CACHE_DATABASE_URL";

type PreparedCacheDatabaseContext = {
  dbPath: string;
  datasourceUrl: string;
  isPackaged: boolean;
  isTest: boolean;
};

class CacheDatabaseService {
  private static instance: CacheDatabaseService;
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
    if (this.drizzleHandle) return;
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

    ensurePackagedCacheSqliteSchema(context.dbPath, logger);
    this.drizzleHandle = this.createDrizzleClient(context);

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
        path.join(process.cwd(), "drizzle", "app-dev-cache.db"),
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

  getClient(): CacheDrizzleClient {
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
    if (this.initPromise && !this.drizzleHandle) {
      await this.initPromise.catch((error) => {
        logger.error("Cache database initialization failed before disconnect", {
          error,
        });
      });
    }
    if (!this.drizzleHandle) return;

    this.drizzleHandle?.sqlite.close();
    this.drizzleHandle = null;
    logger.info("Cache database disconnected");
  }
}

export const cacheDb = CacheDatabaseService.getInstance();
