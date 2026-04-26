/**
 * Database service using Drizzle ORM
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { app } from "electron";
import BetterSqliteDatabase from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { DB_NAME } from "../../shared/constants/index.js";
import { createLogger } from "../../shared/logger/index.js";
import { isProdEnv, isTestEnv } from "../utils/environment.js";
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

    logger.info("Initializing database", {
      isPackaged: context.isPackaged,
      isTest: context.isTest,
      hasEnvDb: Boolean(process.env.DATABASE_URL),
      userDataPath: app.getPath("userData"),
      dbPath: context.dbPath,
      datasourceUrl: context.datasourceUrl,
    });

    ensurePackagedSqliteSchema(context.dbPath, logger);
    this.drizzleHandle = this.createDrizzleClient(context);

    if (context.isPackaged) {
      try {
        await seedIfEmpty(this.getDrizzleClient());
      } catch (error) {
        logger.error("Failed to seed packaged database", { error });
      }
    }

    logger.info("Database service initialized");
  }

  private createDrizzleClient(
    context: PreparedDatabaseContext,
  ): DrizzleDatabaseHandle<MainDrizzleClient> {
    const sqlite = new BetterSqliteDatabase(context.dbPath);
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("foreign_keys = ON");
    sqlite.pragma("busy_timeout = 5000");
    const client = drizzle(sqlite, { schema });
    return { sqlite, client };
  }

  private async prepareDatabaseContext(): Promise<PreparedDatabaseContext> {
    const isPackaged = isProdEnv();
    const userDataPath = app.getPath("userData");
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

  /**
   * Returns the Drizzle ORM client. Alias for getClient().
   * @deprecated Use getClient() instead — both now return Drizzle.
   */
  getDrizzleClient(): MainDrizzleClient {
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
