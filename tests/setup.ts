import { beforeAll, afterAll, beforeEach, vi } from "vitest";

if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
import * as path from "node:path";
import * as fs from "node:fs";
import { sql } from "drizzle-orm";
import type { db as DbService } from "../src/main/database/index.js";
import type { cacheDb as CacheDbService } from "../src/main/database/cache/index.js";
import * as schema from "../src/main/database/schema/index.js";
import * as cacheSchema from "../src/main/database/cache/cacheSchema.js";

const testWorkerId = process.env.VITEST_POOL_ID ?? process.env.VITEST_WORKER_ID ?? String(process.pid);
const testDbDir = path.join(process.cwd(), "drizzle", ".tmp", `vitest-${testWorkerId}`);
const testDbPath = path.join(testDbDir, "db.sqlite");
const testCacheDbPath = path.join(testDbDir, "cache.sqlite");
const skipDbSetup = process.env.SKIP_DB_TEST_SETUP === "1";

process.env.DATABASE_URL = `file:${testDbPath}`;
process.env.CACHE_DATABASE_URL = `file:${testCacheDbPath}`;

vi.mock("electron", () => ({
  app: {
    isPackaged: false,
    getPath: () => testDbDir,
  },
  nativeTheme: {
    shouldUseDarkColors: false,
  },
}));

type MainDbClient = ReturnType<(typeof DbService)["getClient"]>;
type CacheDbClient = ReturnType<(typeof CacheDbService)["getClient"]>;

let dbService: typeof DbService | null = null;
let cacheDbService: typeof CacheDbService | null = null;

beforeAll(async () => {
  if (skipDbSetup) return;
  fs.mkdirSync(testDbDir, { recursive: true });
  const [dbMod, cacheDbMod] = await Promise.all([
    import("../src/main/database/index.js"),
    import("../src/main/database/cache/index.js"),
  ]);
  dbService = dbMod.db;
  cacheDbService = cacheDbMod.cacheDb;
  await Promise.all([dbService.initialize(), cacheDbService.initialize()]);
});

beforeEach(async () => {
  if (skipDbSetup) return;
  if (!dbService || !cacheDbService) return;
  const client: MainDbClient = dbService.getClient();
  const cacheClient: CacheDbClient = cacheDbService.getClient();

  try {
    await cacheClient.run(sql`DELETE FROM "ChapterSearchDocumentFts"`);
  } catch {
    // FTS table may not exist in fresh databases
  }
  await cacheClient.delete(cacheSchema.chapterSearchDocument).where(sql`1=1`);
  await cacheClient.delete(cacheSchema.termAppearance).where(sql`1=1`);
  await cacheClient.delete(cacheSchema.characterAppearance).where(sql`1=1`);

  await client.delete(schema.snapshot).where(sql`1=1`);
  await client.delete(schema.memoryChunk).where(sql`1=1`);
  await client.delete(schema.memoryBuildJob).where(sql`1=1`);
  await client.delete(schema.searchDirtyQueue).where(sql`1=1`);
  await client.delete(schema.chapterRevision).where(sql`1=1`);
  await client.delete(schema.chapterBody).where(sql`1=1`);
  await client.delete(schema.scrapMemo).where(sql`1=1`);
  await client.delete(schema.worldDocument).where(sql`1=1`);
  await client.delete(schema.projectLocalState).where(sql`1=1`);
  await client.delete(schema.projectAttachment).where(sql`1=1`);
  await client.delete(schema.term).where(sql`1=1`);
  await client.delete(schema.character).where(sql`1=1`);
  await client.delete(schema.chapter).where(sql`1=1`);
  await client.delete(schema.projectSettings).where(sql`1=1`);
  await client.delete(schema.project).where(sql`1=1`);
});

afterAll(async () => {
  if (skipDbSetup) return;
  if (dbService) {
    await dbService.disconnect();
  }
  if (cacheDbService) {
    await cacheDbService.disconnect();
  }
  fs.rmSync(testDbDir, { recursive: true, force: true });
});
