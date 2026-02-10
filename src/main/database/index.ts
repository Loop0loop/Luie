/**
 * Database service using Prisma Client
 */

import { createRequire } from "node:module";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { app } from "electron";
import * as path from "path";
import * as fs from "fs";
import { execSync } from "child_process";
import { createLogger } from "../../shared/logger/index.js";
import { DB_NAME } from "../../shared/constants/index.js";
import { isProdEnv, isTestEnv } from "../utils/environment.js";
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
  characterAppearance: PrismaDelegate<PrismaRecord>;
  termAppearance: PrismaDelegate<PrismaRecord>;
};

const { PrismaClient } = require("@prisma/client") as {
  PrismaClient: new (options?: unknown) => PrismaClient;
};

class DatabaseService {
  private static instance: DatabaseService;
  private prisma: PrismaClient | null = null;
  private datasourceUrl: string | null = null;
  private dbPath: string | null = null;

  private constructor() {
  }

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  private ensureInitialized(): void {
    if (this.prisma) return;

    const isPackaged = isProdEnv();
    const userDataPath = app.getPath("userData");
    const isTest = isTestEnv();
    const envDb = process.env.DATABASE_URL;
    const hasEnvDb = Boolean(envDb);
    let dbPath: string;

    if (hasEnvDb) {
      dbPath = envDb?.replace("file:", "") ?? path.join(userDataPath, DB_NAME);
      this.datasourceUrl = envDb ?? `file:${dbPath}`;
      process.env.DATABASE_URL = this.datasourceUrl;
    } else if (isPackaged) {
      dbPath = path.join(userDataPath, DB_NAME);
      this.datasourceUrl = `file:${dbPath}`;
      process.env.DATABASE_URL = this.datasourceUrl;
    } else {
      dbPath = path.join(process.cwd(), "prisma", "dev.db");
      this.datasourceUrl = `file:${dbPath}`;
      process.env.DATABASE_URL = this.datasourceUrl;
    }

    this.dbPath = dbPath;

    logger.info("Initializing database", {
      isPackaged,
      isTest,
      hasEnvDb,
      userDataPath,
      dbPath,
      datasourceUrl: this.datasourceUrl,
    });

    // userData 디렉토리 확인 및 생성
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
      logger.info("Created userData directory", { userDataPath });
    }

    const dbExists = fs.existsSync(dbPath);
    const migrationsDir = path.join(process.cwd(), "prisma/migrations");
    const hasMigrations = fs.existsSync(migrationsDir)
      && fs
        .readdirSync(migrationsDir, { withFileTypes: true })
        .some((entry) => entry.isDirectory());

    // Environment-specific migration strategy
    if (isPackaged) {
      // PRODUCTION: migrate deploy only
      if (hasMigrations) {
        try {
          const prismaPath = path.join(process.resourcesPath, "node_modules/.bin/prisma");
          const schemaPath = path.join(process.resourcesPath, "prisma/schema.prisma");

          logger.info("Running production migrations", {
            dbPath,
            dbExists,
            command: "migrate deploy",
          });

          execSync(
            `"${prismaPath}" migrate deploy --schema="${schemaPath}"`,
            {
              env: { ...process.env, DATABASE_URL: this.datasourceUrl },
              stdio: "pipe",
            }
          );

          logger.info("Production migrations applied successfully");
        } catch (error) {
          logger.error("Failed to apply production migrations", error);
          throw error;
        }
      }
    } else if (isTest) {
      // TEST: db push (no migration history needed)
      try {
        const prismaPath = path.join(process.cwd(), "node_modules/.bin/prisma");
        const schemaPath = path.join(process.cwd(), "prisma/schema.prisma");

        logger.info("Running test database push", {
          dbPath,
          dbExists,
          command: "db push",
        });

        execSync(
          `"${prismaPath}" db push --accept-data-loss --schema="${schemaPath}"`,
          {
            env: { ...process.env, DATABASE_URL: this.datasourceUrl },
            stdio: "pipe",
          }
        );

        logger.info("Test database push completed successfully");
      } catch (error) {
        logger.error("Failed to push test database", error);
        throw error;
      }
    } else {
      // DEVELOPMENT: use non-interactive migration strategy
      try {
        const prismaPath = path.join(process.cwd(), "node_modules/.bin/prisma");
        const schemaPath = path.join(process.cwd(), "prisma/schema.prisma");

        logger.info("Running development database push", {
          dbPath,
          dbExists,
          hasMigrations,
          command: "db push",
        });

        execSync(
          `"${prismaPath}" db push --accept-data-loss --schema="${schemaPath}"`,
          {
            env: { ...process.env, DATABASE_URL: this.datasourceUrl },
            stdio: "pipe",
          }
        );

        logger.info("Development database ready");
      } catch (error) {
        const err = error as { stdout?: Buffer; stderr?: Buffer };
        const stdout = err.stdout ? err.stdout.toString("utf8") : undefined;
        const stderr = err.stderr ? err.stderr.toString("utf8") : undefined;
        logger.error("Failed to prepare development database", {
          error,
          stdout,
          stderr,
        });
        throw error;
      }
    }

    const adapter = new PrismaBetterSqlite3({
      url: this.datasourceUrl,
    });

    this.prisma = new PrismaClient({
      adapter,
      log: ["error", "warn"],
    });

    if (isPackaged) {
      void seedIfEmpty(this.prisma);
    }

    if (this.prisma.$executeRawUnsafe) {
      const pragmaCalls = [
        this.prisma.$executeRawUnsafe("PRAGMA journal_mode=WAL;"),
        this.prisma.$executeRawUnsafe("PRAGMA synchronous=FULL;"),
        this.prisma.$executeRawUnsafe("PRAGMA wal_autocheckpoint=1000;"),
      ];
      Promise.all(pragmaCalls)
        .then(() => {
          logger.info("SQLite WAL mode enabled");
        })
        .catch((error) => {
          logger.warn("Failed to enable WAL mode", { error });
        });
    }

    logger.info("Database service initialized");
  }

  getClient(): PrismaClient {
    this.ensureInitialized();
    return this.prisma as PrismaClient;
  }

  getDatabasePath(): string {
    this.ensureInitialized();
    if (!this.dbPath) {
      throw new Error("Database path not initialized");
    }
    return this.dbPath;
  }

  async disconnect(): Promise<void> {
    if (!this.prisma) return;
    await this.prisma.$disconnect();
    this.prisma = null;
    logger.info("Database disconnected");
  }
}

export const db = DatabaseService.getInstance();
