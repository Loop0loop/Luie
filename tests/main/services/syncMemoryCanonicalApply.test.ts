// TEST_LEVEL: REAL_DB_INTEGRATION
// PROVES: sync memory row와 project revision이 함께 commit되거나 rollback된다.

import { eq, sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import {
  db,
  chapter,
  memoryEntity,
  memoryEntityAlias,
  memoryEpisode,
  memoryEpisodeEvidence,
  memoryEvalCase,
  memoryEvalEvidence,
  memoryFact,
  projectAttachment,
  project,
} from "../../../src/main/infra/database/index.js";
import {
  getProjectRevisionState,
  listProjectsNeedingExport,
  markProjectExported,
} from "../../../src/main/services/core/project/projectRevisionStore.js";
import { applyMemoryCanonicalSyncRows } from "../../../src/main/services/features/sync/syncMemoryCanonicalApply.js";
import type { SyncBundle } from "../../../src/main/services/features/sync/syncMapper.js";

const now = "2026-07-19T00:00:00.000Z";

const createBundle = (
  memoryCanonicalRows: NonNullable<SyncBundle["memoryCanonicalRows"]>,
): SyncBundle => ({
  projects: [],
  chapters: [],
  characters: [],
  events: [],
  factions: [],
  terms: [],
  worldDocuments: [],
  memos: [],
  snapshots: [],
  memoryCanonicalRows,
  tombstones: [],
});

const memoryEntityRecord = (
  id: string,
  options: { deletedAt?: string; name?: string } = {},
): NonNullable<SyncBundle["memoryCanonicalRows"]>[number] => ({
  id: `MemoryEntity:${id}`,
  userId: "user-1",
  projectId: "project-1",
  tableName: "MemoryEntity",
  row: {
    id,
    projectId: "project-1",
    entityType: "character",
    canonicalName: options.name ?? id,
    status: "confirmed",
    updatedAt: now,
  },
  updatedAt: now,
  deletedAt: options.deletedAt,
});

const deletedMemoryRecord = (
  tableName: string,
  id: string,
): NonNullable<SyncBundle["memoryCanonicalRows"]>[number] => ({
  id: `${tableName}:${id}`,
  userId: "user-1",
  projectId: "project-1",
  tableName,
  row: { id, projectId: "project-1" },
  updatedAt: now,
  deletedAt: now,
});

async function seedProject(): Promise<void> {
  db.getClient()
    .insert(project)
    .values({
      id: "project-1",
      title: "Project",
      createdAt: now,
      updatedAt: now,
    })
    .run();
}

const canonicalRows = (): NonNullable<SyncBundle["memoryCanonicalRows"]> => {
  const record = (
    tableName: string,
    id: string,
    row: Record<string, unknown>,
  ): NonNullable<SyncBundle["memoryCanonicalRows"]>[number] => ({
    id: `wrapper-${tableName}-${id}`,
    userId: "user-1",
    projectId: "project-1",
    tableName,
    row: { id, projectId: "project-1", updatedAt: now, ...row },
    updatedAt: now,
  });

  return [
    record("MemoryEvalRelation", "eval-relation-raw", {
      caseId: "eval-case-raw",
      sourceName: "Alice",
      targetName: "Bob",
      relation: "knows",
    }),
    record("MemoryEvalEntity", "eval-entity-raw", {
      caseId: "eval-case-raw",
      name: "Alice",
      entityType: "character",
    }),
    record("MemoryEvalEvidence", "eval-evidence-raw", {
      caseId: "eval-case-raw",
      chapterId: "chapter-1",
      quote: "quote",
    }),
    record("MemoryEvalCase", "eval-case-raw", {
      name: "Case",
      question: "Question?",
    }),
    record("MemoryFactInvalidation", "fact-invalidation-raw", {
      invalidatedFactId: "fact-raw",
      invalidatingFactId: "fact-2-raw",
      reason: "superseded",
    }),
    record("MemoryFactEvidence", "fact-evidence-raw", {
      factId: "fact-raw",
      evidenceId: "episode-evidence-raw",
    }),
    record("MemoryFact", "fact-2-raw", {
      subjectEntityId: "entity-raw",
      predicate: "state",
      objectValue: "new",
      valueType: "string",
      validFromChapterId: "chapter-1",
      validFromChapterOrder: 0,
      observedAtChapterId: "chapter-1",
      observedAtChapterOrder: 0,
      status: "confirmed",
      extractorVersion: "test",
      sourceContentHash: "hash",
      invalidatedByFactId: "fact-raw",
    }),
    record("MemoryFact", "fact-raw", {
      subjectEntityId: "entity-raw",
      predicate: "state",
      objectValue: "old",
      valueType: "string",
      validFromChapterId: "chapter-1",
      validFromChapterOrder: 0,
      observedAtChapterId: "chapter-1",
      observedAtChapterOrder: 0,
      status: "confirmed",
      extractorVersion: "test",
      sourceContentHash: "hash",
    }),
    record("MemoryEpisodeEvidence", "episode-evidence-raw", {
      episodeId: "episode-raw",
      chapterId: "chapter-1",
      contentHash: "hash",
      sourceContentHash: "hash",
      quote: "quote",
    }),
    record("MemoryEpisode", "episode-raw", {
      sourceType: "chapter",
      sourceId: "chapter-1",
      chapterId: "chapter-1",
      sourceContentHash: "hash",
      extractorVersion: "test",
      episodeType: "scene",
      title: "Episode",
      summary: "Summary",
    }),
    record("MemoryEntityAlias", "alias-raw", {
      entityId: "entity-raw",
      entityType: "character",
      alias: "Alice",
      normalizedAlias: "alice",
      status: "confirmed",
    }),
    record("MemoryEntity", "entity-raw", {
      entityType: "character",
      canonicalName: "Alice",
      status: "confirmed",
    }),
  ];
};

describe("applyMemoryCanonicalSyncRows", () => {
  it("rolls back a parent delete when local-only canonical children are not explicitly deleted", async () => {
    await seedProject();
    const client = db.getClient();
    client
      .insert(chapter)
      .values({
        id: "chapter-1",
        projectId: "project-1",
        title: "Chapter",
        content: "",
        order: 0,
        updatedAt: now,
      })
      .run();
    client
      .insert(memoryEntity)
      .values([
        {
          id: "parent-entity",
          projectId: "project-1",
          entityType: "character",
          canonicalName: "Parent",
          status: "confirmed",
          updatedAt: now,
        },
        {
          id: "subject-entity",
          projectId: "project-1",
          entityType: "character",
          canonicalName: "Subject",
          status: "suggested",
          updatedAt: now,
        },
      ])
      .run();
    client
      .insert(memoryEntityAlias)
      .values({
        id: "local-alias",
        projectId: "project-1",
        entityId: "parent-entity",
        entityType: "character",
        alias: "Local",
        normalizedAlias: "local",
        status: "suggested",
        updatedAt: now,
      })
      .run();
    client
      .insert(memoryFact)
      .values({
        id: "local-fact",
        projectId: "project-1",
        subjectEntityId: "subject-entity",
        predicate: "knows",
        objectEntityId: "parent-entity",
        valueType: "entity",
        validFromChapterId: "chapter-1",
        validFromChapterOrder: 0,
        observedAtChapterId: "chapter-1",
        observedAtChapterOrder: 0,
        status: "suggested",
        extractorVersion: "test",
        sourceContentHash: "hash",
        updatedAt: now,
      })
      .run();
    const baseline = await getProjectRevisionState("project-1", client);

    expect(() =>
      client.transaction((tx) => {
        applyMemoryCanonicalSyncRows(
          tx,
          createBundle([
            deletedMemoryRecord("MemoryEntity", "parent-entity"),
          ]),
          new Set(),
        );
      }),
    ).toThrow(
      "SYNC_MEMORY_DELETE_BLOCKED:project-1:MemoryEntity:parent-entity:project-1:MemoryEntityAlias:local-alias",
    );

    expect(
      await client
        .select({ id: memoryEntity.id })
        .from(memoryEntity)
        .where(eq(memoryEntity.id, "parent-entity")),
    ).toEqual([{ id: "parent-entity" }]);
    expect(
      await client
        .select({ id: memoryEntityAlias.id })
        .from(memoryEntityAlias)
        .where(eq(memoryEntityAlias.id, "local-alias")),
    ).toEqual([{ id: "local-alias" }]);
    expect(
      await client
        .select({ id: memoryFact.id })
        .from(memoryFact)
        .where(eq(memoryFact.id, "local-fact")),
    ).toEqual([{ id: "local-fact" }]);
    expect(await getProjectRevisionState("project-1", client)).toEqual(
      baseline,
    );
  });

  it("deletes a parent only when every canonical dependent is explicitly deleted", async () => {
    await seedProject();
    const client = db.getClient();
    client
      .insert(chapter)
      .values({
        id: "chapter-1",
        projectId: "project-1",
        title: "Chapter",
        content: "",
        order: 0,
        updatedAt: now,
      })
      .run();
    client
      .insert(memoryEntity)
      .values([
        {
          id: "parent-entity",
          projectId: "project-1",
          entityType: "character",
          canonicalName: "Parent",
          status: "confirmed",
          updatedAt: now,
        },
        {
          id: "subject-entity",
          projectId: "project-1",
          entityType: "character",
          canonicalName: "Subject",
          status: "suggested",
          updatedAt: now,
        },
      ])
      .run();
    client
      .insert(memoryEntityAlias)
      .values({
        id: "local-alias",
        projectId: "project-1",
        entityId: "parent-entity",
        entityType: "character",
        alias: "Local",
        normalizedAlias: "local",
        status: "suggested",
        updatedAt: now,
      })
      .run();
    client
      .insert(memoryFact)
      .values({
        id: "local-fact",
        projectId: "project-1",
        subjectEntityId: "subject-entity",
        predicate: "knows",
        objectEntityId: "parent-entity",
        valueType: "entity",
        validFromChapterId: "chapter-1",
        validFromChapterOrder: 0,
        observedAtChapterId: "chapter-1",
        observedAtChapterOrder: 0,
        status: "suggested",
        extractorVersion: "test",
        sourceContentHash: "hash",
        updatedAt: now,
      })
      .run();

    client.transaction((tx) => {
      applyMemoryCanonicalSyncRows(
        tx,
        createBundle([
          deletedMemoryRecord("MemoryEntity", "parent-entity"),
          deletedMemoryRecord("MemoryEntityAlias", "local-alias"),
          deletedMemoryRecord("MemoryFact", "local-fact"),
        ]),
        new Set(),
      );
    });

    expect(
      await client
        .select({ id: memoryEntity.id })
        .from(memoryEntity)
        .where(eq(memoryEntity.id, "parent-entity")),
    ).toEqual([]);
    expect(
      await client
        .select({ id: memoryEntity.id })
        .from(memoryEntity)
        .where(eq(memoryEntity.id, "subject-entity")),
    ).toEqual([{ id: "subject-entity" }]);
  });

  it("guards episode and eval dependency families with the same delete policy", async () => {
    await seedProject();
    const client = db.getClient();
    client
      .insert(memoryEpisode)
      .values({
        id: "episode-parent",
        projectId: "project-1",
        sourceType: "project",
        sourceId: "project-1",
        sourceContentHash: "hash",
        extractorVersion: "test",
        episodeType: "scene",
        title: "Episode",
        summary: "Summary",
        updatedAt: now,
      })
      .run();
    client
      .insert(memoryEpisodeEvidence)
      .values({
        id: "episode-child",
        projectId: "project-1",
        episodeId: "episode-parent",
        contentHash: "hash",
        sourceContentHash: "hash",
        quote: "quote",
        updatedAt: now,
      })
      .run();
    client
      .insert(memoryEvalCase)
      .values({
        id: "eval-parent",
        projectId: "project-1",
        name: "Case",
        question: "Question?",
        updatedAt: now,
      })
      .run();
    client
      .insert(memoryEvalEvidence)
      .values({
        id: "eval-child",
        caseId: "eval-parent",
        projectId: "project-1",
        quote: "quote",
        updatedAt: now,
      })
      .run();

    expect(() =>
      client.transaction((tx) => {
        applyMemoryCanonicalSyncRows(
          tx,
          createBundle([
            deletedMemoryRecord("MemoryEpisode", "episode-parent"),
          ]),
          new Set(),
        );
      }),
    ).toThrow(
      "SYNC_MEMORY_DELETE_BLOCKED:project-1:MemoryEpisode:episode-parent:project-1:MemoryEpisodeEvidence:episode-child",
    );
    expect(() =>
      client.transaction((tx) => {
        applyMemoryCanonicalSyncRows(
          tx,
          createBundle([
            deletedMemoryRecord("MemoryEvalCase", "eval-parent"),
          ]),
          new Set(),
        );
      }),
    ).toThrow(
      "SYNC_MEMORY_DELETE_BLOCKED:project-1:MemoryEvalCase:eval-parent:project-1:MemoryEvalEvidence:eval-child",
    );
  });

  it("does not misclassify a dependent row owned by another project", async () => {
    await seedProject();
    const client = db.getClient();
    client
      .insert(project)
      .values({
        id: "project-2",
        title: "Other",
        createdAt: now,
        updatedAt: now,
      })
      .run();
    client
      .insert(memoryEntity)
      .values({
        id: "parent-entity",
        projectId: "project-1",
        entityType: "character",
        canonicalName: "Parent",
        status: "confirmed",
        updatedAt: now,
      })
      .run();
    client
      .insert(memoryEntityAlias)
      .values({
        id: "cross-project-alias",
        projectId: "project-2",
        entityId: "parent-entity",
        entityType: "character",
        alias: "Cross",
        normalizedAlias: "cross",
        status: "suggested",
        updatedAt: now,
      })
      .run();

    expect(() =>
      client.transaction((tx) => {
        applyMemoryCanonicalSyncRows(
          tx,
          createBundle([
            deletedMemoryRecord("MemoryEntity", "parent-entity"),
          ]),
          new Set(),
        );
      }),
    ).toThrow(
      "SYNC_MEMORY_DELETE_BLOCKED:project-1:MemoryEntity:parent-entity:project-2:MemoryEntityAlias:cross-project-alias",
    );
    expect(
      await client
        .select({ id: memoryEntityAlias.id })
        .from(memoryEntityAlias)
        .where(eq(memoryEntityAlias.id, "cross-project-alias")),
    ).toEqual([{ id: "cross-project-alias" }]);
  });

  it("ignores a delete whose stated project does not own the parent", async () => {
    await seedProject();
    const client = db.getClient();
    client
      .insert(project)
      .values({
        id: "project-2",
        title: "Other",
        createdAt: now,
        updatedAt: now,
      })
      .run();
    client
      .insert(memoryEntity)
      .values({
        id: "other-parent",
        projectId: "project-2",
        entityType: "character",
        canonicalName: "Other parent",
        status: "confirmed",
        updatedAt: now,
      })
      .run();
    client
      .insert(memoryEntityAlias)
      .values({
        id: "other-alias",
        projectId: "project-2",
        entityId: "other-parent",
        entityType: "character",
        alias: "Other",
        normalizedAlias: "other",
        status: "suggested",
        updatedAt: now,
      })
      .run();

    expect(() =>
      client.transaction((tx) => {
        applyMemoryCanonicalSyncRows(
          tx,
          createBundle([
            deletedMemoryRecord("MemoryEntity", "other-parent"),
          ]),
          new Set(),
        );
      }),
    ).not.toThrow();
    expect(
      await client
        .select({ id: memoryEntity.id })
        .from(memoryEntity)
        .where(eq(memoryEntity.id, "other-parent")),
    ).toEqual([{ id: "other-parent" }]);
  });

  it("upserts all 11 canonical tables in FK order and deletes them in reverse order", async () => {
    await seedProject();
    const client = db.getClient();
    client
      .insert(chapter)
      .values({
        id: "chapter-1",
        projectId: "project-1",
        title: "Chapter",
        content: "",
        order: 0,
        updatedAt: now,
      })
      .run();
    const rows = canonicalRows();
    const tableNames = [
      "MemoryEntity",
      "MemoryEntityAlias",
      "MemoryEpisode",
      "MemoryEpisodeEvidence",
      "MemoryFact",
      "MemoryFactEvidence",
      "MemoryFactInvalidation",
      "MemoryEvalCase",
      "MemoryEvalEvidence",
      "MemoryEvalEntity",
      "MemoryEvalRelation",
    ];
    client.run(
      sql.raw(
        `CREATE TEMP TABLE "SyncMemoryOrderLog" ("action" TEXT NOT NULL, "tableName" TEXT NOT NULL)`,
      ),
    );
    for (const tableName of tableNames) {
      for (const action of ["INSERT", "DELETE"]) {
        client.run(
          sql.raw(
            `CREATE TEMP TRIGGER "sync_memory_${action.toLowerCase()}_${tableName}" BEFORE ${action} ON main."${tableName}" BEGIN INSERT INTO "SyncMemoryOrderLog" VALUES ('${action}', '${tableName}'); END`,
          ),
        );
      }
    }

    client.transaction((tx) => {
      applyMemoryCanonicalSyncRows(tx, createBundle(rows), new Set());
    });

    const inserted = await Promise.all(
      tableNames.map(async (tableName) =>
        client.all<{ id: string }>(
          sql.raw(`SELECT "id" FROM "${tableName}"`),
        ),
      ),
    );
    expect(inserted.flat().map(({ id }) => id)).toEqual(
      expect.arrayContaining([
        "entity-raw",
        "alias-raw",
        "episode-raw",
        "episode-evidence-raw",
        "fact-raw",
        "fact-evidence-raw",
        "fact-invalidation-raw",
        "eval-case-raw",
        "eval-evidence-raw",
        "eval-entity-raw",
        "eval-relation-raw",
      ]),
    );
    const insertOrder = await client.all<{
      action: string;
      tableName: string;
    }>(sql.raw(`SELECT "action", "tableName" FROM "SyncMemoryOrderLog"`));
    expect(insertOrder).toEqual(
      [
        "MemoryEntity",
        "MemoryEntityAlias",
        "MemoryEpisode",
        "MemoryEpisodeEvidence",
        "MemoryFact",
        "MemoryFact",
        "MemoryFactEvidence",
        "MemoryFactInvalidation",
        "MemoryEvalCase",
        "MemoryEvalEvidence",
        "MemoryEvalEntity",
        "MemoryEvalRelation",
      ].map((tableName) => ({ action: "INSERT", tableName })),
    );
    expect(
      await client.all<{ invalidatedByFactId: string | null }>(
        sql.raw(
          `SELECT "invalidatedByFactId" FROM "MemoryFact" WHERE "id" = 'fact-2-raw'`,
        ),
      ),
    ).toEqual([{ invalidatedByFactId: "fact-raw" }]);
    client.run(sql.raw(`DELETE FROM "SyncMemoryOrderLog"`));

    client.transaction((tx) => {
      applyMemoryCanonicalSyncRows(
        tx,
        createBundle(rows.map((row) => ({ ...row, deletedAt: now }))),
        new Set(),
      );
    });
    const remaining = await Promise.all(
      tableNames.map(async (tableName) =>
        client.all<{ count: number }>(
          sql.raw(`SELECT COUNT(*) AS "count" FROM "${tableName}"`),
        ),
      ),
    );
    expect(remaining.flat().map(({ count }) => count)).toEqual(
      Array(11).fill(0),
    );
    const deleteOrder = await client.all<{
      action: string;
      tableName: string;
    }>(sql.raw(`SELECT "action", "tableName" FROM "SyncMemoryOrderLog"`));
    expect(deleteOrder).toEqual(
      [
        "MemoryEvalRelation",
        "MemoryEvalEntity",
        "MemoryEvalEvidence",
        "MemoryEvalCase",
        "MemoryFactInvalidation",
        "MemoryFactEvidence",
        "MemoryFact",
        "MemoryFact",
        "MemoryEpisodeEvidence",
        "MemoryEpisode",
        "MemoryEntityAlias",
        "MemoryEntity",
      ].map((tableName) => ({ action: "DELETE", tableName })),
    );
  });

  it("preserves raw ids, removes only explicit deletes, and keeps local-only rows", async () => {
    await seedProject();
    const client = db.getClient();
    client
      .insert(memoryEntity)
      .values([
        {
          id: "delete-me",
          projectId: "project-1",
          entityType: "character",
          canonicalName: "Delete me",
          status: "confirmed",
          updatedAt: now,
        },
        {
          id: "local-suggested",
          projectId: "project-1",
          entityType: "character",
          canonicalName: "Local only",
          status: "suggested",
          updatedAt: now,
        },
      ])
      .run();

    client.transaction((tx) => {
      applyMemoryCanonicalSyncRows(
        tx,
        createBundle([
          memoryEntityRecord("remote-raw-id", { name: "Remote" }),
          memoryEntityRecord("delete-me", { deletedAt: now }),
          {
            ...memoryEntityRecord("ignored-table"),
            tableName: "MemoryChunk",
          },
        ]),
        new Set(),
      );
    });

    const rows = await client
      .select({ id: memoryEntity.id, status: memoryEntity.status })
      .from(memoryEntity)
      .where(eq(memoryEntity.projectId, "project-1"));
    expect(rows).toEqual(
      expect.arrayContaining([
        { id: "remote-raw-id", status: "confirmed" },
        { id: "local-suggested", status: "suggested" },
      ]),
    );
    expect(rows.map(({ id }) => id)).not.toContain("delete-me");
    expect(rows.map(({ id }) => id)).not.toContain("ignored-table");
  });

  it("rolls back both a memory upsert and its revision increment", async () => {
    await seedProject();
    const client = db.getClient();
    const before = await client
      .select({ revision: project.revision })
      .from(project)
      .where(eq(project.id, "project-1"))
      .limit(1);

    expect(() =>
      client.transaction((tx) => {
        applyMemoryCanonicalSyncRows(
          tx,
          createBundle([memoryEntityRecord("rolled-back")]),
          new Set(),
        );
        throw new Error("rollback");
      }),
    ).toThrow("rollback");

    const [row, after] = await Promise.all([
      client
        .select({ id: memoryEntity.id })
        .from(memoryEntity)
        .where(eq(memoryEntity.id, "rolled-back"))
        .limit(1),
      client
        .select({ revision: project.revision })
        .from(project)
        .where(eq(project.id, "project-1"))
        .limit(1),
    ]);
    expect(row).toEqual([]);
    expect(after[0]?.revision).toBe(before[0]?.revision);
  });

  it("keeps a post-capture edit dirty after marking the captured revision", async () => {
    await seedProject();
    const client = db.getClient();
    client
      .insert(projectAttachment)
      .values({
        projectId: "project-1",
        projectPath: "/tmp/project-1.luie",
        updatedAt: now,
      })
      .run();

    const capturedRevision = client.transaction((tx) => {
      applyMemoryCanonicalSyncRows(
        tx,
        createBundle([memoryEntityRecord("captured")]),
        new Set(),
      );
      return tx
        .select({ revision: project.revision })
        .from(project)
        .where(eq(project.id, "project-1"))
        .get()?.revision;
    });
    expect(capturedRevision).toBeTypeOf("number");

    client
      .insert(memoryEntity)
      .values({
        id: "concurrent-edit",
        projectId: "project-1",
        entityType: "character",
        canonicalName: "Concurrent",
        status: "confirmed",
        updatedAt: now,
      })
      .run();
    await markProjectExported("project-1", capturedRevision as number, client);

    const state = await getProjectRevisionState("project-1", client);
    expect(state).toEqual({
      revision: (capturedRevision as number) + 1,
      exportedRevision: capturedRevision,
    });
    expect(await listProjectsNeedingExport(client)).toContain("project-1");
  });
});
