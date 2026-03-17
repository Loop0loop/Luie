import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  dropPackagedCacheOptionalFtsArtifacts,
  ensurePackagedCacheSqliteSchema,
} from "../../../src/main/database/cacheSchemaBootstrap.js";
import {
  getPrismaBinPath,
  runPrismaCommand,
} from "../../../src/main/database/databaseRuntime.js";

const logger = {
  info: () => {},
  warn: () => {},
};

const tempDirs: string[] = [];

async function createTempDbPath(): Promise<string> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "luie-cache-db-"));
  tempDirs.push(tempDir);
  return path.join(tempDir, "cache.sqlite");
}

describe("cache prisma push compatibility", () => {
  afterEach(async () => {
    await Promise.all(
      tempDirs.splice(0).map(async (tempDir) => {
        await fs.rm(tempDir, { recursive: true, force: true });
      }),
    );
  });

  it("drops unmanaged FTS artifacts before pushing the Prisma cache schema", async () => {
    const dbPath = await createTempDbPath();
    ensurePackagedCacheSqliteSchema(dbPath, logger);

    const prismaPath = getPrismaBinPath(process.cwd());
    const schemaPath = path.join(process.cwd(), "prisma-cache", "schema.prisma");
    const env = {
      ...process.env,
      DATABASE_URL: `file:${dbPath}`,
      CACHE_DATABASE_URL: `file:${dbPath}`,
    };

    let initialPushError: unknown;
    try {
      await runPrismaCommand(
        prismaPath,
        ["db", "push", "--accept-data-loss", `--schema=${schemaPath}`],
        env,
      );
    } catch (error) {
      initialPushError = error;
    }

    expect(initialPushError).toMatchObject({
      stderr: expect.stringContaining("ChapterSearchDocumentFts_config"),
    });

    dropPackagedCacheOptionalFtsArtifacts(dbPath, logger);

    await expect(
      runPrismaCommand(
        prismaPath,
        ["db", "push", "--accept-data-loss", `--schema=${schemaPath}`],
        env,
      ),
    ).resolves.toBeUndefined();
  });
});
