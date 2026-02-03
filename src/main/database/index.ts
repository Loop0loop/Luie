/**
 * Database service using Prisma Client
 */

import { createRequire } from "node:module";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { app } from "electron";
import * as path from "path";
import { createLogger } from "../../shared/logger/index.js";
import { DB_NAME } from "../../shared/constants/index.js";

const logger = createLogger("DatabaseService");
const require = createRequire(import.meta.url);

type PrismaDelegate<T extends Record<string, unknown>> = {
  create: (args: unknown) => Promise<T>;
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
    let dbPath: string;

    if (isPackaged) {
      dbPath = path.join(userDataPath, DB_NAME);
      this.datasourceUrl = `file:${dbPath}`;
      process.env.DATABASE_URL = this.datasourceUrl;
    } else {
      dbPath =
        process.env.DATABASE_URL?.replace("file:", "") ??
        path.join(process.cwd(), "prisma", DB_NAME);
      this.datasourceUrl = process.env.DATABASE_URL ?? `file:${dbPath}`;
      process.env.DATABASE_URL = this.datasourceUrl;
    }

    logger.info("Initializing database", {
      isPackaged,
      userDataPath,
      dbPath,
      datasourceUrl: this.datasourceUrl,
    });

    const adapter = new PrismaBetterSqlite3({
      url: this.datasourceUrl,
    });

    this.prisma = new PrismaClient({
      adapter,
      log: ["error", "warn"],
    });

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
