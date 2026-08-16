// TEST_LEVEL: REAL_DB_INTEGRATION
// PROVES: canonical SQLite mutation이 project revision을 atomic하게 증가시킨다.

import * as fsPromises from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import { ensurePackagedSqliteSchema } from "../../../src/main/database/main/databaseSchemaBootstrap.js";
import {
  PROJECT_REVISION_DIRECT_TABLES,
  PROJECT_REVISION_TRIGGER_NAMES,
} from "../../../src/main/database/main/projectRevisionTriggerSql.js";
import { MEMORY_CANONICAL_EXPORTABLE_TABLES } from "../../../src/main/services/features/memory/persistence/memoryPersistencePolicy.js";

const logger = { info: () => undefined, warn: () => undefined };
const CORE_DIRECT_TABLES = [
  "Chapter",
  "Character",
  "Term",
  "Faction",
  "Event",
  "WorldEntity",
  "EntityRelation",
  "Snapshot",
  "WorldDocument",
  "ScrapMemo",
] as const;

type TableColumn = {
  name: string;
  type: string;
  notnull: 0 | 1;
  dflt_value: string | null;
  pk: number;
};

const tempDirs: string[] = [];

async function createBootstrappedDb(): Promise<{
  dbPath: string;
  db: InstanceType<typeof Database>;
}> {
  const tempDir = await fsPromises.mkdtemp(
    path.join(os.tmpdir(), "luie-project-revision-"),
  );
  tempDirs.push(tempDir);
  const dbPath = path.join(tempDir, "test.sqlite");
  ensurePackagedSqliteSchema(dbPath, logger);
  const db = new Database(dbPath);
  db.pragma("foreign_keys = ON");
  return { dbPath, db };
}

function insertProject(
  db: InstanceType<typeof Database>,
  id: string,
  now = "2026-07-19T00:00:00.000Z",
): void {
  db.prepare(
    `INSERT INTO "Project" ("id", "title", "createdAt", "updatedAt") VALUES (?, ?, ?, ?)`,
  ).run(id, id, now, now);
}

function revision(db: InstanceType<typeof Database>, projectId: string): number {
  return Number(
    (
      db
        .prepare(`SELECT "revision" FROM "Project" WHERE "id" = ?`)
        .get(projectId) as { revision: number }
    ).revision,
  );
}

function insertMinimalDirectRow(
  db: InstanceType<typeof Database>,
  table: string,
  projectId: string,
): void {
  const columns = (
    db.prepare(`PRAGMA table_info("${table}")`).all() as TableColumn[]
  ).filter(
    (column) => column.pk > 0 || (column.notnull === 1 && column.dflt_value === null),
  );
  const values = columns.map((column) => {
    if (column.name === "projectId") return projectId;
    if (/INT|REAL|NUM/i.test(column.type)) return 1;
    return `${table}-${column.name}`;
  });
  db.prepare(
    `INSERT INTO "${table}" (${columns.map((column) => `"${column.name}"`).join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`,
  ).run(...values);
}

afterEach(async () => {
  await Promise.all(
    tempDirs
      .splice(0)
      .map((dir) => fsPromises.rm(dir, { recursive: true, force: true })),
  );
});

describe("project revision bootstrap triggers", () => {
  it("installs the exact canonical trigger and direct-table sets", async () => {
    const { db } = await createBootstrappedDb();
    try {
      const expectedDirectTables = [
        ...CORE_DIRECT_TABLES,
        ...MEMORY_CANONICAL_EXPORTABLE_TABLES,
      ];
      const expectedTriggerNames = [
        "project_revision_Project_insert",
        "project_revision_Project_update",
        ...expectedDirectTables.flatMap((table) => [
          `project_revision_${table}_insert`,
          `project_revision_${table}_update`,
          `project_revision_${table}_delete`,
        ]),
        "project_revision_ChapterBody_insert",
        "project_revision_ChapterBody_update",
        "project_revision_ChapterBody_delete",
      ].sort();
      const installed = (
        db
          .prepare(
            `SELECT "name" FROM "sqlite_master" WHERE "type" = 'trigger' AND "name" LIKE 'project_revision_%' ORDER BY "name"`,
          )
          .all() as Array<{ name: string }>
      ).map(({ name }) => name);

      expect(PROJECT_REVISION_DIRECT_TABLES).toEqual(expectedDirectTables);
      expect([...PROJECT_REVISION_TRIGGER_NAMES].sort()).toEqual(
        expectedTriggerNames,
      );
      expect(installed).toEqual(expectedTriggerNames);
      expect(
        PROJECT_REVISION_DIRECT_TABLES.filter((table) =>
          table.startsWith("Memory"),
        ),
      ).toEqual(MEMORY_CANONICAL_EXPORTABLE_TABLES);
    } finally {
      db.close();
    }
  });

  it("tracks Project insert and payload metadata but ignores updatedAt-only changes", async () => {
    const { db } = await createBootstrappedDb();
    try {
      insertProject(db, "project-1");
      expect(revision(db, "project-1")).toBe(1);

      db.prepare(`UPDATE "Project" SET "title" = 'Renamed' WHERE "id" = ?`).run(
        "project-1",
      );
      db.prepare(
        `UPDATE "Project" SET "description" = 'Description' WHERE "id" = ?`,
      ).run("project-1");
      db.prepare(
        `UPDATE "Project" SET "createdAt" = '2026-07-20T00:00:00.000Z' WHERE "id" = ?`,
      ).run("project-1");
      expect(revision(db, "project-1")).toBe(4);

      db.prepare(
        `UPDATE "Project" SET "updatedAt" = '2026-07-21T00:00:00.000Z' WHERE "id" = ?`,
      ).run("project-1");
      expect(revision(db, "project-1")).toBe(4);
    } finally {
      db.close();
    }
  });

  it("tracks direct INSERT, UPDATE, DELETE and both sides of a project move", async () => {
    const { db } = await createBootstrappedDb();
    try {
      insertProject(db, "project-old");
      insertProject(db, "project-new");

      db.prepare(
        `INSERT INTO "Chapter" ("id", "projectId", "title", "content", "order", "updatedAt") VALUES ('chapter-1', 'project-old', 'One', '', 0, 'now')`,
      ).run();
      expect(revision(db, "project-old")).toBe(2);

      db.prepare(`UPDATE "Chapter" SET "title" = 'Two' WHERE "id" = 'chapter-1'`).run();
      expect(revision(db, "project-old")).toBe(3);

      db.prepare(
        `UPDATE "Chapter" SET "projectId" = 'project-new' WHERE "id" = 'chapter-1'`,
      ).run();
      expect(revision(db, "project-old")).toBe(4);
      expect(revision(db, "project-new")).toBe(2);

      db.prepare(`DELETE FROM "Chapter" WHERE "id" = 'chapter-1'`).run();
      expect(revision(db, "project-new")).toBe(3);
    } finally {
      db.close();
    }
  });

  it("executes INSERT, UPDATE, and DELETE revision triggers for every direct table", async () => {
    const { db } = await createBootstrappedDb();
    try {
      insertProject(db, "project-1");
      db.pragma("foreign_keys = OFF");

      for (const table of PROJECT_REVISION_DIRECT_TABLES) {
        const baseline = revision(db, "project-1");
        insertMinimalDirectRow(db, table, "project-1");
        expect(revision(db, "project-1"), `${table} INSERT`).toBe(
          baseline + 1,
        );

        db.prepare(
          `UPDATE "${table}" SET "projectId" = "projectId"`,
        ).run();
        expect(revision(db, "project-1"), `${table} UPDATE`).toBe(
          baseline + 2,
        );

        db.prepare(`DELETE FROM "${table}"`).run();
        expect(revision(db, "project-1"), `${table} DELETE`).toBe(
          baseline + 3,
        );
      }
    } finally {
      db.close();
    }
  });

  it("tracks ChapterBody INSERT, UPDATE, and DELETE through its owner Chapter", async () => {
    const { db } = await createBootstrappedDb();
    try {
      insertProject(db, "project-1");
      db.prepare(
        `INSERT INTO "Chapter" ("id", "projectId", "title", "content", "order", "updatedAt") VALUES ('chapter-1', 'project-1', 'One', '', 0, 'now')`,
      ).run();
      const baseline = revision(db, "project-1");

      db.prepare(
        `INSERT INTO "ChapterBody" ("chapterId", "content", "contentHash", "updatedAt") VALUES ('chapter-1', 'draft', 'hash-1', 'now')`,
      ).run();
      expect(revision(db, "project-1")).toBe(baseline + 1);

      db.prepare(
        `UPDATE "ChapterBody" SET "content" = 'final', "contentHash" = 'hash-2' WHERE "chapterId" = 'chapter-1'`,
      ).run();
      expect(revision(db, "project-1")).toBe(baseline + 2);

      db.prepare(`DELETE FROM "ChapterBody" WHERE "chapterId" = 'chapter-1'`).run();
      expect(revision(db, "project-1")).toBe(baseline + 3);
    } finally {
      db.close();
    }
  });

  it("tracks both project owners when ChapterBody moves between chapters", async () => {
    const { db } = await createBootstrappedDb();
    try {
      insertProject(db, "project-a");
      insertProject(db, "project-b");
      db.prepare(
        `INSERT INTO "Chapter" ("id", "projectId", "title", "content", "order", "updatedAt") VALUES ('chapter-a', 'project-a', 'A', '', 0, 'now')`,
      ).run();
      db.prepare(
        `INSERT INTO "Chapter" ("id", "projectId", "title", "content", "order", "updatedAt") VALUES ('chapter-b', 'project-b', 'B', '', 0, 'now')`,
      ).run();
      db.prepare(
        `INSERT INTO "ChapterBody" ("chapterId", "content", "contentHash", "updatedAt") VALUES ('chapter-a', 'draft', 'hash', 'now')`,
      ).run();
      const baselineA = revision(db, "project-a");
      const baselineB = revision(db, "project-b");

      db.prepare(
        `UPDATE "ChapterBody" SET "chapterId" = 'chapter-b' WHERE "chapterId" = 'chapter-a'`,
      ).run();

      expect(revision(db, "project-a")).toBe(baselineA + 1);
      expect(revision(db, "project-b")).toBe(baselineB + 1);
    } finally {
      db.close();
    }
  });

  it("rolls back canonical data and its revision increment together", async () => {
    const { db } = await createBootstrappedDb();
    try {
      insertProject(db, "project-1");
      const baseline = revision(db, "project-1");

      db.exec("BEGIN");
      db.prepare(
        `INSERT INTO "Chapter" ("id", "projectId", "title", "content", "order", "updatedAt") VALUES ('rolled-back', 'project-1', 'Draft', '', 0, 'now')`,
      ).run();
      expect(revision(db, "project-1")).toBe(baseline + 1);
      db.exec("ROLLBACK");

      expect(revision(db, "project-1")).toBe(baseline);
      expect(
        db.prepare(`SELECT 1 FROM "Chapter" WHERE "id" = 'rolled-back'`).get(),
      ).toBeUndefined();
    } finally {
      db.close();
    }
  });

  it("ignores EntityRelation pointer normalization but tracks semantic changes including createdAt", async () => {
    const { db } = await createBootstrappedDb();
    try {
      insertProject(db, "project-1");
      db.prepare(
        `INSERT INTO "WorldEntity" ("id", "projectId", "type", "name", "updatedAt") VALUES ('place-1', 'project-1', 'Place', 'Place', 'updated-1')`,
      ).run();
      const baseline = revision(db, "project-1");
      db.prepare(`
        INSERT INTO "EntityRelation"
          ("id", "projectId", "sourceId", "sourceType", "targetId", "targetType", "relation", "createdAt", "updatedAt")
        VALUES ('relation-1', 'project-1', 'place-1', 'Place', 'character-1', 'Character', 'related', 'created-1', 'updated-1')
      `).run();
      expect(revision(db, "project-1")).toBe(baseline + 1);

      db.prepare(
        `UPDATE "EntityRelation" SET "sourceWorldEntityId" = NULL, "targetWorldEntityId" = NULL WHERE "id" = 'relation-1'`,
      ).run();
      expect(revision(db, "project-1")).toBe(baseline + 1);

      db.prepare(
        `UPDATE "EntityRelation" SET "createdAt" = 'created-2' WHERE "id" = 'relation-1'`,
      ).run();
      expect(revision(db, "project-1")).toBe(baseline + 2);
    } finally {
      db.close();
    }
  });

  it("ignores attachment, local state, and settings mutations", async () => {
    const { db } = await createBootstrappedDb();
    try {
      insertProject(db, "project-1");
      const baseline = revision(db, "project-1");

      db.prepare(
        `INSERT INTO "ProjectAttachment" ("projectId", "projectPath", "exportedRevision", "updatedAt") VALUES ('project-1', '/tmp/project.luie', 0, 'now')`,
      ).run();
      db.prepare(
        `UPDATE "ProjectAttachment" SET "exportedRevision" = 1 WHERE "projectId" = 'project-1'`,
      ).run();
      db.prepare(
        `INSERT INTO "ProjectLocalState" ("projectId", "lastOpenedAt", "updatedAt") VALUES ('project-1', 'now', 'now')`,
      ).run();
      db.prepare(
        `UPDATE "ProjectLocalState" SET "lastOpenedAt" = 'later' WHERE "projectId" = 'project-1'`,
      ).run();
      db.prepare(
        `INSERT INTO "ProjectSettings" ("id", "projectId") VALUES ('settings-1', 'project-1')`,
      ).run();
      db.prepare(
        `UPDATE "ProjectSettings" SET "autoSave" = 0 WHERE "id" = 'settings-1'`,
      ).run();
      db.prepare(`DELETE FROM "ProjectSettings" WHERE "id" = 'settings-1'`).run();
      db.prepare(
        `DELETE FROM "ProjectLocalState" WHERE "projectId" = 'project-1'`,
      ).run();
      db.prepare(
        `DELETE FROM "ProjectAttachment" WHERE "projectId" = 'project-1'`,
      ).run();

      expect(revision(db, "project-1")).toBe(baseline);
    } finally {
      db.close();
    }
  });

  it("repairs one missing trigger and backfills every project exactly once", async () => {
    const { dbPath, db } = await createBootstrappedDb();
    insertProject(db, "project-1");
    insertProject(db, "project-2");
    const before = [revision(db, "project-1"), revision(db, "project-2")];
    const missingTrigger = PROJECT_REVISION_TRIGGER_NAMES.at(-1);
    expect(missingTrigger).toBeTruthy();
    db.exec(`DROP TRIGGER "${missingTrigger}"`);
    db.close();

    ensurePackagedSqliteSchema(dbPath, logger);
    const repaired = new Database(dbPath);
    expect(revision(repaired, "project-1")).toBe(before[0] + 1);
    expect(revision(repaired, "project-2")).toBe(before[1] + 1);
    expect(
      repaired
        .prepare(`SELECT 1 FROM "sqlite_master" WHERE "type" = 'trigger' AND "name" = ?`)
        .get(missingTrigger),
    ).toBeTruthy();
    repaired.close();

    ensurePackagedSqliteSchema(dbPath, logger);
    const idempotent = new Database(dbPath);
    try {
      expect(revision(idempotent, "project-1")).toBe(before[0] + 1);
      expect(revision(idempotent, "project-2")).toBe(before[1] + 1);
    } finally {
      idempotent.close();
    }
  });

  it("rolls back trigger repair and every revision when backfill fails", async () => {
    const { dbPath, db } = await createBootstrappedDb();
    insertProject(db, "project-1");
    insertProject(db, "project-2");
    const before = [revision(db, "project-1"), revision(db, "project-2")];
    const missingTrigger = PROJECT_REVISION_TRIGGER_NAMES.at(-1);
    expect(missingTrigger).toBeTruthy();
    db.exec(`DROP TRIGGER "${missingTrigger}"`);
    db.exec(`
      CREATE TRIGGER "reject_project_2_revision_backfill"
      BEFORE UPDATE OF "revision" ON "Project"
      WHEN NEW."id" = 'project-2' AND NEW."revision" > OLD."revision"
      BEGIN
        SELECT RAISE(ABORT, 'reject revision backfill');
      END;
    `);
    db.close();

    expect(() => ensurePackagedSqliteSchema(dbPath, logger)).toThrow(
      "reject revision backfill",
    );

    const rolledBack = new Database(dbPath);
    try {
      expect(revision(rolledBack, "project-1")).toBe(before[0]);
      expect(revision(rolledBack, "project-2")).toBe(before[1]);
      expect(
        rolledBack
          .prepare(
            `SELECT 1 FROM "sqlite_master" WHERE "type" = 'trigger' AND "name" = ?`,
          )
          .get(missingTrigger),
      ).toBeUndefined();
    } finally {
      rolledBack.close();
    }
  });
});
