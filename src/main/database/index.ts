/**
 * Database service using Prisma Client
 */

import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { app } from "electron";
import * as path from "path";
import { createLogger } from "../../shared/logger/index.js";
import { DB_NAME } from "../../shared/constants/index.js";

const logger = createLogger("DatabaseService");

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

    let dbPath: string;
    if (app.isPackaged) {
      dbPath = path.join(app.getPath("userData"), DB_NAME);
    } else {
      dbPath =
        process.env.DATABASE_URL?.replace("file:", "") ??
        path.join(process.cwd(), "prisma", DB_NAME);
    }

    this.datasourceUrl = process.env.DATABASE_URL ?? `file:${dbPath}`;
    process.env.DATABASE_URL = this.datasourceUrl;

    logger.info(`Initializing database at: ${dbPath}`);

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
