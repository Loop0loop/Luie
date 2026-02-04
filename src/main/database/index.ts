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

    const isPackaged = app.isPackaged;
    const userDataPath = app.getPath("userData");
    const isTest = process.env.VITEST === "true" || process.env.NODE_ENV === "test";
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

    if (!isTest && !isPackaged) {
      try {
        const prismaPath = path.join(process.cwd(), "node_modules/.bin/prisma");
        const schemaPath = path.join(process.cwd(), "prisma/schema.prisma");
        const command = hasMigrations ? "migrate deploy" : "db push";

        logger.info("Running database migrations", {
          dbPath,
          dbExists,
          hasMigrations,
          command,
        });

        execSync(
          `"${prismaPath}" ${command} --schema="${schemaPath}"`,
          {
            env: { ...process.env, DATABASE_URL: this.datasourceUrl },
            stdio: "pipe",
          }
        );

        logger.info("Database migrations applied successfully");
      } catch (error) {
        logger.error("Failed to apply migrations", error);
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

  async disconnect(): Promise<void> {
    if (!this.prisma) return;
    await this.prisma.$disconnect();
    this.prisma = null;
    logger.info("Database disconnected");
  }
}

export const db = DatabaseService.getInstance();
