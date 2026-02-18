import { beforeAll, afterAll, beforeEach, vi } from "vitest";
import { execSync } from "node:child_process";
import * as path from "node:path";
import * as fs from "node:fs";
import type { db as DbService } from "../src/main/database/index.js";

const testWorkerId = process.env.VITEST_POOL_ID ?? process.env.VITEST_WORKER_ID ?? String(process.pid);
const testDbDir = path.join(process.cwd(), "prisma", ".tmp", `vitest-${testWorkerId}`);
const testDbPath = path.join(testDbDir, "db.sqlite");
const skipDbSetup = process.env.SKIP_DB_TEST_SETUP === "1";

process.env.DATABASE_URL = `file:${testDbPath}`;

vi.mock("electron", () => ({
  app: {
    isPackaged: false,
    getPath: () => testDbDir,
  },
}));

type PrismaClient = ReturnType<(typeof DbService)["getClient"]> & {
  projectSettings?: {
    deleteMany: (args: unknown) => Promise<{ count: number }>;
  };
};

let dbService: typeof DbService | null = null;

beforeAll(async () => {
  if (skipDbSetup) return;
  fs.mkdirSync(testDbDir, { recursive: true });
  execSync("pnpm prisma db push --accept-data-loss --force-reset", {
    stdio: "inherit",
  });
  execSync("pnpm db:seed", {
    stdio: "inherit",
  });
  const mod = await import("../src/main/database/index.js");
  dbService = mod.db;
});

beforeEach(async () => {
  if (skipDbSetup) return;
  if (!dbService) return;
  const client: PrismaClient = dbService.getClient();
  await client.snapshot.deleteMany({});
  await client.termAppearance.deleteMany({});
  await client.characterAppearance.deleteMany({});
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
  fs.rmSync(testDbDir, { recursive: true, force: true });
});
