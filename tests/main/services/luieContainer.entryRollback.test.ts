// TEST_LEVEL: REAL_FS_INTEGRATION
// PROVES: sqlite .luie 단일 entry와 container timestamp 갱신의 원자성
// DOES_NOT_PROVE: 상위 project 또는 UI orchestration

import * as fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import { writeLuieContainer } from "../../../src/main/services/io/luieContainer.js";
import { writeLuieSqliteEntry } from "../../../src/main/services/io/luieSqliteContainer.js";

const logger = {
  info: () => undefined,
  debug: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

describe("luieContainer entry rollback", () => {
  let tempRoot = "";

  afterEach(async () => {
    if (!tempRoot) return;
    await fsp.rm(tempRoot, { recursive: true, force: true });
    tempRoot = "";
  });

  it("rolls back entry and meta when container timestamp update fails", async () => {
    tempRoot = await fsp.mkdtemp(
      path.join(os.tmpdir(), "luie-container-entry-rollback-"),
    );
    const packagePath = path.join(tempRoot, "entry-rollback.luie");

    await writeLuieContainer({
      targetPath: packagePath,
      payload: {
        meta: {
          projectId: "project-rollback",
          title: "Entry Rollback",
        },
        chapters: [],
        characters: [],
        terms: [],
        synopsis: { synopsis: "before", status: "draft" },
        plot: { columns: [] },
        drawing: { paths: [] },
        mindmap: { nodes: [], edges: [] },
        memos: { memos: [] },
        graph: { nodes: [], edges: [] },
        snapshots: [],
      },
      logger,
    });

    const setupDatabase = new Database(packagePath);
    const readState = (database: Database.Database) => ({
      entry: database
        .prepare(
          `SELECT "content", "createdAt", "updatedAt" FROM "LuieContainerEntry" WHERE "path" = 'world/synopsis.json'`,
        )
        .get(),
      meta: database
        .prepare(
          `SELECT "content", "createdAt", "updatedAt" FROM "LuieContainerEntry" WHERE "path" = 'meta.json'`,
        )
        .get(),
      container: database
        .prepare(`SELECT "updatedAt" FROM "LuieContainerInfo" WHERE "id" = 1`)
        .get(),
    });
    const before = readState(setupDatabase);
    setupDatabase.exec(`
      CREATE TRIGGER "fail_container_timestamp_update"
      BEFORE UPDATE OF "updatedAt" ON "LuieContainerInfo"
      BEGIN
        SELECT RAISE(ABORT, 'forced container timestamp failure');
      END;
    `);
    setupDatabase.close();

    await expect(
      writeLuieSqliteEntry({
        targetPath: packagePath,
        entryPath: "world/synopsis.json",
        content: JSON.stringify({ synopsis: "after", status: "working" }),
        logger,
      }),
    ).rejects.toThrow("forced container timestamp failure");

    const verifyDatabase = new Database(packagePath, { readonly: true });
    const after = readState(verifyDatabase);
    verifyDatabase.close();
    expect(after).toEqual(before);
  });
});
