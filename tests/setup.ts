import { beforeAll, afterAll, beforeEach, vi } from "vitest";
import { execSync } from "node:child_process";
import * as path from "node:path";
import * as fs from "node:fs";
import type { db as DbService } from "../src/main/database/index.js";

const testDbDir = path.join(process.cwd(), "prisma", ".tmp");
const testDbPath = path.join(testDbDir, `vitest-${process.pid}.db`);

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
  fs.mkdirSync(testDbDir, { recursive: true });
  execSync("pnpm prisma db push --accept-data-loss --force-reset", {
    stdio: "inherit",
  });
  const mod = await import("../src/main/database/index.js");
  dbService = mod.db;
});

beforeEach(async () => {
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
  if (dbService) {
    await dbService.disconnect();
  }
  fs.rmSync(testDbDir, { recursive: true, force: true });
});
