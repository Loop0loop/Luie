import type { PrismaClient as GeneratedPrismaClient } from "@prisma/client";
// TODO: Remove in Phase 7 — Prisma types replaced by Drizzle types
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

// Common subset of Drizzle DB operations that works with both root client and transaction.
// See: projectImportTransaction.ts tx as unknown as MainDrizzleClient — this type eliminates that cast.
export type DbLike = Pick<
  BetterSQLite3Database<typeof schema>,
  "select" | "insert" | "update" | "delete"
>;

export interface DrizzleDatabaseHandle<TClient> {
  sqlite: Database.Database;
  client: TClient;
}
