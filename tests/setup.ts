import { beforeAll, afterAll, beforeEach, vi } from "vitest";
import { execSync } from "node:child_process";
import * as path from "node:path";
import * as fs from "node:fs";

const testDbDir = path.join(process.cwd(), "tests", ".tmp");
const testDbPath = path.join(testDbDir, "test.db");

process.env.DATABASE_URL = `file:${testDbPath}`;

vi.mock("electron", () => ({
  app: {
    isPackaged: false,
    getPath: () => testDbDir,
  },
}));

let dbService: typeof import("../src/main/database/index.js").db;

beforeAll(async () => {
  fs.mkdirSync(testDbDir, { recursive: true });
  execSync("pnpm prisma db push --accept-data-loss --skip-generate", {
    stdio: "inherit",
  });
  const mod = await import("../src/main/database/index.js");
  dbService = mod.db;
});

beforeEach(async () => {
  if (!dbService) return;
  const client = dbService.getClient() as any;
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
