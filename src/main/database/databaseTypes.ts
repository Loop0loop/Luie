import type { PrismaClient as GeneratedPrismaClient } from "@prisma/client";
import type Database from "better-sqlite3";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import type * as cacheSchema from "./cacheSchema.js";
import type * as schema from "./schema.js";

export interface PreparedDatabaseContext {
  dbPath: string;
  datasourceUrl: string;
  isPackaged: boolean;
  isTest: boolean;
}

export type PrismaRecord = Record<string, unknown>;

export type PrismaClient = GeneratedPrismaClient;

export type MainDrizzleClient = BetterSQLite3Database<typeof schema>;

export type CacheDrizzleClient = BetterSQLite3Database<typeof cacheSchema>;

export interface DrizzleDatabaseHandle<TClient> {
  sqlite: Database.Database;
  client: TClient;
}
