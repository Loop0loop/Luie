import { beforeAll, afterAll, beforeEach, vi } from "vitest";
import * as path from "node:path";
import * as fs from "node:fs";
import type { db as DbService } from "../src/main/database/index.js";
import type { cacheDb as CacheDbService } from "../src/main/database/cacheDb.js";

const testWorkerId = process.env.VITEST_POOL_ID ?? process.env.VITEST_WORKER_ID ?? String(process.pid);
const testDbDir = path.join(process.cwd(), "prisma", ".tmp", `vitest-${testWorkerId}`);
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

type PrismaClient = ReturnType<(typeof DbService)["getClient"]> & {
  projectAttachment?: {
    deleteMany: (args: unknown) => Promise<{ count: number }>;
  };
  projectLocalState?: {
    deleteMany: (args: unknown) => Promise<{ count: number }>;
  };
  projectSettings?: {
    deleteMany: (args: unknown) => Promise<{ count: number }>;
  };
  scrapMemo?: {
    deleteMany: (args: unknown) => Promise<{ count: number }>;
  };
  worldDocument?: {
    deleteMany: (args: unknown) => Promise<{ count: number }>;
  };
};

type CachePrismaClient = ReturnType<(typeof CacheDbService)["getClient"]>;

let dbService: typeof DbService | null = null;
let cacheDbService: typeof CacheDbService | null = null;

beforeAll(async () => {
  if (skipDbSetup) return;
  fs.mkdirSync(testDbDir, { recursive: true });
  const [dbMod, cacheDbMod] = await Promise.all([
    import("../src/main/database/index.js"),
    import("../src/main/database/cacheDb.js"),
  ]);
  dbService = dbMod.db;
  cacheDbService = cacheDbMod.cacheDb;
  await Promise.all([dbService.initialize(), cacheDbService.initialize()]);
});

beforeEach(async () => {
  if (skipDbSetup) return;
  if (!dbService || !cacheDbService) return;
  const client: PrismaClient = dbService.getClient();
  const cacheClient: CachePrismaClient = cacheDbService.getClient();
  await client.snapshot.deleteMany({});
  await cacheClient.termAppearance.deleteMany({});
  await cacheClient.characterAppearance.deleteMany({});
  if (client.scrapMemo?.deleteMany) {
    await client.scrapMemo.deleteMany({});
  }
  if (client.worldDocument?.deleteMany) {
    await client.worldDocument.deleteMany({});
  }
  if (client.projectLocalState?.deleteMany) {
    await client.projectLocalState.deleteMany({});
  }
  if (client.projectAttachment?.deleteMany) {
    await client.projectAttachment.deleteMany({});
  }
  await client.term.deleteMany({});
  await client.character.deleteMany({});
  await client.chapter.deleteMany({});
  if (client.projectSettings?.deleteMany) {
    await client.projectSettings.deleteMany({});
  }
  await client.project.deleteMany({});
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
