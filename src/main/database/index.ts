/**
 * Database service using Drizzle ORM
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import BetterSqliteDatabase from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { DB_NAME } from "../../shared/constants/index.js";
import { createLogger } from "../../shared/logger/index.js";
import { isProdEnv, isTestEnv } from "../utils/environment.js";
import { resolveUserDataPath } from "../utils/userDataPath.js";
import { ensureSafeAbsolutePath } from "../utils/pathValidation.js";
import * as schema from "./schema.js";
import { seedIfEmpty } from "./seedDefaults.js";
import {
  pathExists,
  resolveSqliteDatasourceFromEnv,
} from "./databaseRuntime.js";
import { ensurePackagedSqliteSchema } from "./databaseSchemaBootstrap.js";
import type {
  PreparedDatabaseContext,
  DrizzleDatabaseHandle,
  MainDrizzleClient,
} from "./databaseTypes.js";

const logger = createLogger("DatabaseService");
const RUNTIME_DB_ENV_KEY = "LUIE_RUNTIME_DATABASE_URL";

class DatabaseService {
  private static instance: DatabaseService;
  private drizzleHandle: DrizzleDatabaseHandle<MainDrizzleClient> | null = null;
  private dbPath: string | null = null;
  private initPromise: Promise<void> | null = null;
  private sqliteVecLoaded = false;

  private constructor() {
  }

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  async initialize(): Promise<void> {
    if (this.drizzleHandle) {
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

    const userDataPath = resolveUserDataPath();
    logger.info("Initializing database", {
      isPackaged: context.isPackaged,
      isTest: context.isTest,
      hasEnvDb: Boolean(process.env.DATABASE_URL),
      userDataPath,
      dbPath: context.dbPath,
      datasourceUrl: context.datasourceUrl,
    });

    ensurePackagedSqliteSchema(context.dbPath, logger);
    this.drizzleHandle = await this.createDrizzleClient(context);

    if (context.isPackaged) {
      try {
        await seedIfEmpty(this.getClient());
      } catch (error) {
        logger.error("Failed to seed packaged database", { error });
      }
    }

    logger.info("Database service initialized");
  }

  private async createDrizzleClient(
    context: PreparedDatabaseContext,
  ): Promise<DrizzleDatabaseHandle<MainDrizzleClient>> {
    const sqlite = new BetterSqliteDatabase(context.dbPath);
    await this.tryLoadSqliteVecExtension(sqlite);
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("synchronous = FULL");
    sqlite.pragma("foreign_keys = ON");
    sqlite.pragma("busy_timeout = 5000");
    sqlite.pragma("wal_autocheckpoint = 1000");
    const client = drizzle(sqlite, { schema });
    return { sqlite, client };
  }

  private async tryLoadSqliteVecExtension(sqlite: BetterSqliteDatabase.Database): Promise<void> {
    try {
      const mod = await import("sqlite-vec");
      const getLoadablePath = (mod as { getLoadablePath?: () => string }).getLoadablePath;
      const loadablePath = getLoadablePath?.();
      if (loadablePath) {
        sqlite.loadExtension(loadablePath);
        this.sqliteVecLoaded = true;
        logger.info("sqlite-vec extension loaded", { loadablePath });
      }
    } catch (error) {
      this.sqliteVecLoaded = false;
      logger.warn("sqlite-vec extension is unavailable; vector search disabled", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async prepareDatabaseContext(): Promise<PreparedDatabaseContext> {
    const isPackaged = isProdEnv();
    const userDataPath = resolveUserDataPath();
    const isTest = isTestEnv();
    const envDb = isTestEnv()
      ? process.env.DATABASE_URL
      : process.env[RUNTIME_DB_ENV_KEY];
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
      dbPath = ensureSafeAbsolutePath(path.join(process.cwd(), "drizzle", "app-dev.db"), "dbPath");
      datasourceUrl = `file:${dbPath}`;
    }
    process.env[RUNTIME_DB_ENV_KEY] = datasourceUrl;
    if (isTest) {
      process.env.DATABASE_URL = datasourceUrl;
    }

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

  getClient(): MainDrizzleClient {
    if (!this.drizzleHandle) {
      throw new Error("Database is not initialized. Call db.initialize() first.");
    }
    return this.drizzleHandle.client;
  }

  getDatabasePath(): string {
    if (!this.dbPath) {
      throw new Error("Database path not initialized");
    }
    return this.dbPath;
  }

  getConnectionPragmas(): {
    journalMode: string;
    foreignKeys: number;
    busyTimeout: number;
    synchronous: number;
    walAutocheckpoint: number;
  } {
    if (!this.drizzleHandle) {
      throw new Error("Database is not initialized. Call db.initialize() first.");
    }

    const sqlite = this.drizzleHandle.sqlite;
    return {
      journalMode: String(sqlite.pragma("journal_mode", { simple: true }) ?? ""),
      foreignKeys: Number(sqlite.pragma("foreign_keys", { simple: true }) ?? 0),
      busyTimeout: Number(sqlite.pragma("busy_timeout", { simple: true }) ?? 0),
      synchronous: Number(sqlite.pragma("synchronous", { simple: true }) ?? 0),
      walAutocheckpoint: Number(
        sqlite.pragma("wal_autocheckpoint", { simple: true }) ?? 0,
      ),
    };
  }

  runWalCheckpoint(mode: "PASSIVE" | "FULL" | "RESTART" | "TRUNCATE" = "FULL"): unknown {
    if (!this.drizzleHandle) {
      throw new Error("Database is not initialized. Call db.initialize() first.");
    }
    return this.drizzleHandle.sqlite.pragma(`wal_checkpoint(${mode})`);
  }

  isVectorSearchEnabled(): boolean {
    return this.sqliteVecLoaded;
  }

  async disconnect(): Promise<void> {
    if (this.initPromise && !this.drizzleHandle) {
      await this.initPromise.catch((error) => {
        logger.error("Database initialization failed before disconnect", { error });
      });
    }
    if (!this.drizzleHandle) {
      return;
    }

    this.drizzleHandle?.sqlite.close();
    this.drizzleHandle = null;
    logger.info("Database disconnected");
  }
}

export const db = DatabaseService.getInstance();
