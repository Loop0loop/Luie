/**
 * Database service using Prisma Client
 */

import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { app } from "electron";
import * as path from "path";
import { createLogger } from "../../shared/logger/index.js";

const logger = createLogger("DatabaseService");

class DatabaseService {
  private static instance: DatabaseService;
  private prisma: PrismaClient;

  private constructor() {
    let dbPath: string;
    if (app.isPackaged) {
      dbPath = path.join(app.getPath("userData"), "luie.db");
    } else {
      dbPath =
        process.env.DATABASE_URL?.replace("file:", "") ??
        path.join(process.cwd(), "prisma/luie.db");
    }

    const datasourceUrl = process.env.DATABASE_URL ?? `file:${dbPath}`;
    process.env.DATABASE_URL = datasourceUrl;

    logger.info(`Initializing database at: ${dbPath}`);

    const adapter = new PrismaBetterSqlite3({
      url: datasourceUrl,
    });

    this.prisma = new PrismaClient({
      adapter,
      log: ["error", "warn"],
    });

    logger.info("Database service initialized");
  }

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  getClient(): PrismaClient {
    return this.prisma;
  }

  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
    logger.info("Database disconnected");
  }
}

export const db = DatabaseService.getInstance();
