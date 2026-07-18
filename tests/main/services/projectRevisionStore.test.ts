import { DatabaseSync } from "node:sqlite";
import { getTableColumns } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { describe, expect, it } from "vitest";
import * as schema from "../../../src/main/database/schema/index.js";
import {
  project,
  projectAttachment,
} from "../../../src/main/database/schema/foundation.js";
import {
  bumpProjectRevision,
  getProjectRevisionState,
  listProjectsNeedingExport,
  markProjectExported,
} from "../../../src/main/services/core/project/projectRevisionStore.js";

const createClient = () => {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(`
    CREATE TABLE "Project" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "title" TEXT NOT NULL,
      "description" TEXT,
      "projectPath" TEXT,
      "revision" INTEGER NOT NULL DEFAULT 0,
      "createdAt" TEXT NOT NULL,
      "updatedAt" TEXT NOT NULL
    );
    CREATE TABLE "ProjectAttachment" (
      "projectId" TEXT PRIMARY KEY NOT NULL,
      "projectPath" TEXT,
      "exportedRevision" INTEGER NOT NULL DEFAULT 0,
      "createdAt" TEXT NOT NULL,
      "updatedAt" TEXT NOT NULL
    );
  `);
  const adapter = {
    prepare: (sql: string) => {
      const statement = sqlite.prepare(sql);
      return {
        run: (...params: unknown[]) => statement.run(...params),
        all: (...params: unknown[]) => statement.all(...params),
        get: (...params: unknown[]) => statement.get(...params),
        raw: () => {
          statement.setReturnArrays(true);
          return statement;
        },
      };
    },
    transaction: (callback: (client: unknown) => unknown) => {
      const execute = (client: unknown) => {
        sqlite.exec("BEGIN");
        try {
          const result = callback(client);
          sqlite.exec("COMMIT");
          return result;
        } catch (error) {
          sqlite.exec("ROLLBACK");
          throw error;
        }
      };
      return { deferred: execute, immediate: execute, exclusive: execute };
    },
  };
  return { client: drizzle(adapter as never, { schema }), sqlite };
};

describe("projectRevisionStore", () => {
  it("declares project and checkpoint revisions with zero defaults", () => {
    const projectColumns = getTableColumns(project);
    const attachmentColumns = getTableColumns(projectAttachment);

    expect(projectColumns.revision?.default).toBe(0);
    expect(attachmentColumns.exportedRevision?.default).toBe(0);
  });

  it("never advances exported revision beyond the project revision", async () => {
    const { client, sqlite } = createClient();
    const now = "2026-07-18T00:00:00.000Z";
    client.insert(project).values({
      id: "project-1",
      title: "Novel",
      createdAt: now,
      updatedAt: now,
    }).run();
    client.insert(projectAttachment).values({
      projectId: "project-1",
      projectPath: "/tmp/project-1.luie",
      createdAt: now,
      updatedAt: now,
    }).run();

    expect(bumpProjectRevision(client as never, "project-1", now)).toBe(1);
    await markProjectExported("project-1", 1, client as never);
    await expect(
      getProjectRevisionState("project-1", client as never),
    ).resolves.toEqual({ revision: 1, exportedRevision: 1 });
    await expect(
      markProjectExported("project-1", 2, client as never),
    ).rejects.toMatchObject({ code: "VAL_3001" });

    sqlite.close();
  });

  it("lists only attached projects with a stale checkpoint", async () => {
    const { client, sqlite } = createClient();
    const now = "2026-07-18T00:00:00.000Z";
    for (const id of ["stale", "clean", "unattached"]) {
      client
        .insert(project)
        .values({ id, title: id, createdAt: now, updatedAt: now })
        .run();
      bumpProjectRevision(client as never, id, now);
    }
    for (const id of ["stale", "clean"]) {
      client
        .insert(projectAttachment)
        .values({
          projectId: id,
          projectPath: `/tmp/${id}.luie`,
          createdAt: now,
          updatedAt: now,
        })
        .run();
    }
    await markProjectExported("clean", 1, client as never);

    await expect(listProjectsNeedingExport(client as never)).resolves.toEqual([
      "stale",
    ]);

    sqlite.close();
  });
});
