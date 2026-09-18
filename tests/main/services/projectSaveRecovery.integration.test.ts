// TEST_LEVEL: REAL_DB_FS_PROCESS_INTEGRATION
// PROVES: 강제 종료 전후의 incremental package와 authoritative DB revision을 startup recovery가 일치시킨다.

import crypto from "node:crypto";
import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";
import * as fsp from "node:fs/promises";
import Database from "better-sqlite3";
import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { db } from "../../../src/main/database/index.js";
import * as schema from "../../../src/main/database/schema/index.js";
import { projectService } from "../../../src/main/services/features/project/projectService.js";
import {
  getProjectRevisionState,
  markProjectExported,
} from "../../../src/main/services/core/project/projectRevisionStore.js";
import {
  readLuieContainerEntry,
  writeLuieContainer,
} from "../../../src/main/services/io/luieContainer.js";

const logger = {
  info: () => undefined,
  debug: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

const crashWriterSource = `
  import { createServer } from "vite";
  const [mode, packagePath, entryPath, content] = process.argv.slice(1);
  const server = await createServer({ root: process.cwd(), logLevel: "silent", server: { middlewareMode: true }, appType: "custom" });
  const writer = await server.ssrLoadModule("/src/main/services/io/luieSqliteContainer.ts");
  if (mode === "after-write") {
    await writer.writeLuieSqliteEntry({ targetPath: packagePath, entryPath, content, logger: { info() {}, debug() {}, warn() {}, error() {} } });
  }
  process.kill(process.pid, "SIGKILL");
`;

const forceStopIncrementalWriter = async (input: {
  mode: "before-write" | "after-write";
  packagePath: string;
  entryPath: string;
  content: string;
}) => {
  let stderr = "";
  const child = spawn(
    process.execPath,
    [
      "--input-type=module",
      "--eval",
      crashWriterSource,
      input.mode,
      input.packagePath,
      input.entryPath,
      input.content,
    ],
    { cwd: process.cwd(), stdio: ["ignore", "ignore", "pipe"] },
  );
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk: string) => {
    stderr += chunk;
  });

  const result = await new Promise<{
    code: number | null;
    signal: NodeJS.Signals | null;
  }>((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => resolve({ code, signal }));
  });
  expect(result, stderr).toEqual({ code: null, signal: "SIGKILL" });
};

describe("project save recovery", () => {
  let tempRoot = "";

  afterEach(async () => {
    await projectService.flushPendingExports();
    if (tempRoot) await fsp.rm(tempRoot, { recursive: true, force: true });
    tempRoot = "";
  });

  const createFixture = async () => {
    tempRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "luie-recovery-"));
    const projectPath = path.join(tempRoot, "recovered.luie");
    const projectId = crypto.randomUUID();
    const chapterId = crypto.randomUUID();
    const entryPath = `manuscript/${chapterId}.md`;
    const now = "2026-09-13T00:00:00.000Z";

    await writeLuieContainer({
      targetPath: projectPath,
      payload: {
        meta: {
          projectId,
          title: "Recovery Novel",
          chapters: [
            { id: chapterId, title: "Chapter", order: 0, file: entryPath },
          ],
        },
        chapters: [{ id: chapterId, content: "before" }],
        characters: [],
        terms: [],
        synopsis: { synopsis: "", status: "draft" },
        plot: { columns: [] },
        drawing: { paths: [] },
        mindmap: { nodes: [], edges: [] },
        memos: { memos: [] },
        graph: { nodes: [], edges: [] },
        snapshots: [],
      },
      logger,
    });
    await db.getClient().insert(schema.project).values({
      id: projectId,
      title: "Recovery Novel",
      createdAt: now,
      updatedAt: now,
    });
    await db.getClient().insert(schema.projectAttachment).values({
      projectId,
      projectPath,
      exportedRevision: 0,
      createdAt: now,
      updatedAt: now,
    });
    await db.getClient().insert(schema.chapter).values({
      id: chapterId,
      projectId,
      title: "Chapter",
      content: "before",
      order: 0,
      createdAt: now,
      updatedAt: now,
    });
    await db.getClient().insert(schema.chapterBody).values({
      chapterId,
      content: "before",
      contentHash: "before-hash",
      updatedAt: now,
    });
    const baseline = await getProjectRevisionState(projectId);
    await markProjectExported(projectId, baseline.revision);

    return { projectId, chapterId, projectPath, entryPath };
  };

  const updateAuthoritativeBody = async (chapterId: string) => {
    await db
      .getClient()
      .update(schema.chapterBody)
      .set({
        content: "latest",
        contentHash: "latest-hash",
        updatedAt: "2026-09-13T01:00:00.000Z",
      })
      .where(eq(schema.chapterBody.chapterId, chapterId));
  };

  const restartAndRecover = async (
    projectId: string,
    projectPath: string,
    entryPath: string,
  ) => {
    await db.disconnect();
    await db.initialize();
    const stale = await getProjectRevisionState(projectId);
    expect(stale.revision).toBeGreaterThan(stale.exportedRevision);

    await expect(
      projectService.scheduleStalePackageExports(),
    ).resolves.toBeGreaterThanOrEqual(1);
    await expect(projectService.flushPendingExports()).resolves.toMatchObject({
      failed: 0,
      timedOut: false,
    });
    await expect(
      readLuieContainerEntry(projectPath, entryPath, logger),
    ).resolves.toBe("latest");
    await expect(getProjectRevisionState(projectId)).resolves.toEqual({
      revision: stale.revision,
      exportedRevision: stale.revision,
    });
  };

  it("keeps an acknowledged incremental transaction readable after SIGKILL and reconciles its stale revision on restart", async () => {
    const fixture = await createFixture();
    await updateAuthoritativeBody(fixture.chapterId);

    await forceStopIncrementalWriter({
      mode: "after-write",
      packagePath: fixture.projectPath,
      entryPath: fixture.entryPath,
      content: "latest",
    });

    await expect(
      readLuieContainerEntry(fixture.projectPath, fixture.entryPath, logger),
    ).resolves.toBe("latest");
    const packageDb = new Database(fixture.projectPath, { readonly: true });
    expect(packageDb.pragma("quick_check", { simple: true })).toBe("ok");
    const committedTimestamps = packageDb
      .prepare(
        `SELECT
          (SELECT "updatedAt" FROM "LuieContainerEntry" WHERE "path" = ?) AS "entryUpdatedAt",
          (SELECT "updatedAt" FROM "LuieContainerEntry" WHERE "path" = 'meta.json') AS "metaUpdatedAt",
          (SELECT "updatedAt" FROM "LuieContainerInfo" WHERE "id" = 1) AS "containerUpdatedAt"`,
      )
      .get(fixture.entryPath) as {
      entryUpdatedAt: string;
      metaUpdatedAt: string;
      containerUpdatedAt: string;
    };
    expect(new Set(Object.values(committedTimestamps)).size).toBe(1);
    packageDb.close();

    await restartAndRecover(
      fixture.projectId,
      fixture.projectPath,
      fixture.entryPath,
    );
  });

  it("recovers authoritative DB content when SIGKILL happens before the incremental file transaction", async () => {
    const fixture = await createFixture();
    await updateAuthoritativeBody(fixture.chapterId);

    await forceStopIncrementalWriter({
      mode: "before-write",
      packagePath: fixture.projectPath,
      entryPath: fixture.entryPath,
      content: "latest",
    });
    await expect(
      readLuieContainerEntry(fixture.projectPath, fixture.entryPath, logger),
    ).resolves.toBe("before");

    await restartAndRecover(
      fixture.projectId,
      fixture.projectPath,
      fixture.entryPath,
    );
  });
});
