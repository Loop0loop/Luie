import type Database from "better-sqlite3";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import type * as cacheSchema from "../cache/cacheSchema.js";
import type * as schema from "../schema/index.js";

export interface PreparedDatabaseContext {
  dbPath: string;
  datasourceUrl: string;
  isPackaged: boolean;
  isTest: boolean;
}

export type MainDrizzleClient = BetterSQLite3Database<typeof schema>;

export type CacheDrizzleClient = BetterSQLite3Database<typeof cacheSchema>;

/** root client와 transaction이 공유하는 Drizzle 연산만 노출해 unsafe cast를 막는다. */
export type DbLike = Pick<
  BetterSQLite3Database<typeof schema>,
  "select" | "insert" | "update" | "delete"
>;

export interface DrizzleDatabaseHandle<TClient> {
  sqlite: Database.Database;
  client: TClient;
}
