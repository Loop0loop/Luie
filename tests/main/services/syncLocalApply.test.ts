import { eq, sql } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import { db } from "../../../src/main/database/index.js";
import {
  project,
  scrapMemo,
  worldDocument,
} from "../../../src/main/database/schema/index.js";
import {
  applyReplicaWorldDelta,
  applyReplicaWorldState,
} from "../../../src/main/services/features/sync/syncLocalApply.js";
import { createEmptySyncBundle } from "../../../src/main/services/features/sync/syncMapper.js";

describe("syncLocalApply.applyReplicaWorldState", () => {
  it("touches project freshness when world documents are materialized", () => {
    const worldDocumentValues: unknown[] = [];
    const projectUpdates: unknown[] = [];

    const run = vi.fn();
    const where = vi.fn(() => ({ run }));
    const onConflictDoUpdate = vi.fn(() => ({ run }));
    const tx = {
      delete: vi.fn(() => ({ where })),
      insert: vi.fn((table: unknown) => ({
        values: vi.fn((values: unknown) => {
          if (table === worldDocument) worldDocumentValues.push(values);
          return { onConflictDoUpdate, run };
        }),
      })),
      update: vi.fn((table: unknown) => ({
        set: vi.fn((values: unknown) => {
          if (table === project) projectUpdates.push(values);
          return { where };
        }),
      })),
    } as never;

    const bundle = createEmptySyncBundle();
    bundle.projects.push({
      id: "project-1",
      userId: "user-1",
      title: "Novel",
      description: null,
      createdAt: "2026-03-01T00:00:00.000Z",
      updatedAt: "2026-03-02T00:00:00.000Z",
    });
    bundle.worldDocuments.push({
      id: "project-1:synopsis",
      userId: "user-1",
      projectId: "project-1",
      docType: "synopsis",
      payload: {
        synopsis: "hello",
      },
      updatedAt: "2026-03-03T00:00:00.000Z",
    });

    applyReplicaWorldState(tx, bundle, new Set());

    expect(tx.insert).toHaveBeenCalledWith(worldDocument);
    expect(worldDocumentValues).toHaveLength(1);
    expect(worldDocumentValues[0]).toMatchObject({
      id: "project-1:synopsis",
      projectId: "project-1",
      docType: "synopsis",
    });
    expect(
      JSON.parse((worldDocumentValues[0] as { payload: string }).payload),
    ).toMatchObject({
      synopsis: "hello",
    });

    expect(tx.delete).not.toHaveBeenCalledWith(scrapMemo);
    expect(tx.update).toHaveBeenCalledWith(project);
    expect(projectUpdates[0]).toMatchObject({
      updatedAt: expect.any(String),
    });
  });

  it("applies the latest world document tombstone", () => {
    const run = vi.fn();
    const where = vi.fn(() => ({ run }));
    const worldDocumentValues: unknown[] = [];
    const tx = {
      delete: vi.fn(() => ({ where })),
      insert: vi.fn(() => ({
        values: vi.fn((value) => {
          worldDocumentValues.push(value);
          return {
            onConflictDoUpdate: vi.fn(() => ({ run })),
            run,
          };
        }),
      })),
      update: vi.fn(() => ({
        set: vi.fn(() => ({ where })),
      })),
    } as never;

    const bundle = createEmptySyncBundle();
    bundle.projects.push({
      id: "project-1",
      userId: "user-1",
      title: "Novel",
      description: null,
      createdAt: "2026-03-01T00:00:00.000Z",
      updatedAt: "2026-03-02T00:00:00.000Z",
    });
    bundle.worldDocuments.push(
      {
        id: "project-1:synopsis:old",
        userId: "user-1",
        projectId: "project-1",
        docType: "synopsis",
        payload: { synopsis: "old" },
        updatedAt: "2026-03-03T00:00:00.000Z",
      },
      {
        id: "project-1:synopsis:deleted",
        userId: "user-1",
        projectId: "project-1",
        docType: "synopsis",
        payload: null,
        updatedAt: "2026-03-04T00:00:00.000Z",
        deletedAt: "2026-03-04T00:00:00.000Z",
      },
    );

    applyReplicaWorldState(tx, bundle, new Set());

    expect(tx.delete).not.toHaveBeenCalledWith(worldDocument);
    expect(tx.insert).toHaveBeenCalledWith(worldDocument);
    expect(worldDocumentValues).toContainEqual(
      expect.objectContaining({
        projectId: "project-1",
        docType: "synopsis",
        deletedAt: "2026-03-04T00:00:00.000Z",
      }),
    );
    expect(tx.update).toHaveBeenCalledWith(project);
  });

  it("skips invalid JSON world document strings instead of overwriting with defaults", () => {
    const run = vi.fn();
    const where = vi.fn(() => ({ run }));
    const tx = {
      delete: vi.fn(() => ({ where })),
      insert: vi.fn(() => ({
        values: vi.fn(() => ({
          onConflictDoUpdate: vi.fn(() => ({ run })),
          run,
        })),
      })),
      update: vi.fn(() => ({
        set: vi.fn(() => ({ where })),
      })),
    } as never;

    const bundle = createEmptySyncBundle();
    bundle.projects.push({
      id: "project-1",
      userId: "user-1",
      title: "Novel",
      description: null,
      createdAt: "2026-03-01T00:00:00.000Z",
      updatedAt: "2026-03-02T00:00:00.000Z",
    });
    bundle.worldDocuments.push({
      id: "project-1:graph",
      userId: "user-1",
      projectId: "project-1",
      docType: "graph",
      payload: "not-json",
      updatedAt: "2026-03-03T00:00:00.000Z",
    });

    applyReplicaWorldState(tx, bundle, new Set());

    expect(tx.insert).not.toHaveBeenCalledWith(worldDocument);
  });

  it("materializes scrap memos from replica memo rows", () => {
    const worldDocumentValues: unknown[] = [];
    const scrapMemoValues: unknown[] = [];

    const run = vi.fn();
    const where = vi.fn(() => ({ run }));
    const onConflictDoUpdate = vi.fn(() => ({ run }));
    const tx = {
      delete: vi.fn(() => ({ where })),
      insert: vi.fn((table: unknown) => ({
        values: vi.fn((values: unknown) => {
          if (table === worldDocument) worldDocumentValues.push(values);
          if (table === scrapMemo) scrapMemoValues.push(values);
          return { onConflictDoUpdate, run };
        }),
      })),
      update: vi.fn(() => ({
        set: vi.fn(() => ({ where })),
      })),
    } as never;

    const bundle = createEmptySyncBundle();
    bundle.projects.push({
      id: "project-1",
      userId: "user-1",
      title: "Novel",
      description: null,
      createdAt: "2026-03-01T00:00:00.000Z",
      updatedAt: "2026-03-02T00:00:00.000Z",
    });
    bundle.memos.push({
      id: "memo-1",
      userId: "user-1",
      projectId: "project-1",
      title: "Clue",
      content: "Hidden door",
      tags: ["plot"],
      createdAt: "2026-03-03T00:00:00.000Z",
      updatedAt: "2026-03-04T00:00:00.000Z",
    });

    applyReplicaWorldState(tx, bundle, new Set());

    expect(worldDocumentValues).toHaveLength(1);
    expect(worldDocumentValues[0]).toMatchObject({
      id: "project-1:scrap",
      projectId: "project-1",
      docType: "scrap",
    });
    expect(scrapMemoValues).toHaveLength(1);
    expect(tx.delete).toHaveBeenCalledWith(scrapMemo);
    expect(scrapMemoValues[0]).toMatchObject([
      {
        id: "memo-1",
        projectId: "project-1",
        title: "Clue",
        content: "Hidden door",
        tags: JSON.stringify(["plot"]),
        sortOrder: 0,
      },
    ]);
  });
});

describe("syncLocalApply.applyReplicaWorldDelta", () => {
  it("updates changed world and memo rows without writing unchanged siblings", async () => {
    const now = "2026-09-13T00:00:00.000Z";
    const changedAt = "2026-09-13T00:01:00.000Z";
    const client = db.getClient();
    await client.insert(project).values({
      id: "project-delta",
      title: "Delta",
      updatedAt: now,
    });
    await client.insert(worldDocument).values([
      {
        id: "project-delta:synopsis",
        projectId: "project-delta",
        docType: "synopsis",
        payload: JSON.stringify({ synopsis: "old" }),
        updatedAt: now,
      },
      {
        id: "project-delta:plot",
        projectId: "project-delta",
        docType: "plot",
        payload: JSON.stringify({ acts: [] }),
        updatedAt: now,
      },
      {
        id: "project-delta:scrap",
        projectId: "project-delta",
        docType: "scrap",
        payload: JSON.stringify({ memos: [], updatedAt: now }),
        updatedAt: now,
      },
    ]);
    await client.insert(scrapMemo).values([
      {
        id: "memo-changed",
        projectId: "project-delta",
        title: "Old",
        content: "old",
        tags: "[]",
        sortOrder: 0,
        updatedAt: now,
      },
      {
        id: "memo-unchanged",
        projectId: "project-delta",
        title: "Keep",
        content: "keep",
        tags: "[]",
        sortOrder: 1,
        updatedAt: now,
      },
    ]);

    client.run(
      sql.raw(`
      CREATE TEMP TRIGGER "db11_reject_unchanged_world_update"
      BEFORE UPDATE ON "WorldDocument"
      WHEN OLD."projectId" = 'project-delta' AND OLD."docType" = 'plot'
      BEGIN
        SELECT RAISE(ABORT, 'unchanged world row was written');
      END;
    `),
    );
    client.run(
      sql.raw(`
      CREATE TEMP TRIGGER "db11_reject_unchanged_memo_delete"
      BEFORE DELETE ON "ScrapMemo"
      WHEN OLD."id" = 'memo-unchanged'
      BEGIN
        SELECT RAISE(ABORT, 'unchanged memo row was deleted');
      END;
    `),
    );
    client.run(
      sql.raw(`
      CREATE TEMP TRIGGER "db11_reject_unchanged_memo_update"
      BEFORE UPDATE ON "ScrapMemo"
      WHEN OLD."id" = 'memo-unchanged'
      BEGIN
        SELECT RAISE(ABORT, 'unchanged memo row was updated');
      END;
    `),
    );

    const merged = createEmptySyncBundle();
    merged.projects.push({
      id: "project-delta",
      userId: "user-1",
      title: "Delta",
      createdAt: now,
      updatedAt: changedAt,
    });
    merged.worldDocuments.push(
      {
        id: "remote-synopsis-id",
        userId: "user-1",
        projectId: "project-delta",
        docType: "synopsis",
        payload: { synopsis: "new" },
        updatedAt: changedAt,
      },
      {
        id: "remote-plot-id",
        userId: "user-1",
        projectId: "project-delta",
        docType: "plot",
        payload: { acts: [] },
        updatedAt: now,
      },
    );
    merged.memos.push(
      {
        id: "memo-changed",
        userId: "user-1",
        projectId: "project-delta",
        title: "New",
        content: "new",
        tags: ["changed"],
        updatedAt: changedAt,
      },
      {
        id: "memo-unchanged",
        userId: "user-1",
        projectId: "project-delta",
        title: "Keep",
        content: "keep",
        tags: [],
        updatedAt: now,
      },
    );
    const delta = createEmptySyncBundle();
    delta.worldDocuments.push(merged.worldDocuments[0]!);
    delta.memos.push(merged.memos[0]!);

    try {
      client.transaction((tx) => {
        applyReplicaWorldDelta(tx, delta, merged, new Set());
      });
    } finally {
      client.run(
        sql.raw('DROP TRIGGER IF EXISTS "db11_reject_unchanged_world_update";'),
      );
      client.run(
        sql.raw('DROP TRIGGER IF EXISTS "db11_reject_unchanged_memo_delete";'),
      );
      client.run(
        sql.raw('DROP TRIGGER IF EXISTS "db11_reject_unchanged_memo_update";'),
      );
    }

    const documents = await client
      .select()
      .from(worldDocument)
      .where(eq(worldDocument.projectId, "project-delta"));
    const memos = await client
      .select()
      .from(scrapMemo)
      .where(eq(scrapMemo.projectId, "project-delta"));
    const synopsis = documents.find((row) => row.docType === "synopsis");
    const plot = documents.find((row) => row.docType === "plot");
    const scrap = documents.find((row) => row.docType === "scrap");

    expect(JSON.parse(synopsis!.payload)).toMatchObject({ synopsis: "new" });
    expect(plot).toMatchObject({
      payload: JSON.stringify({ acts: [] }),
      updatedAt: now,
    });
    expect(memos).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "memo-changed",
          title: "New",
          content: "new",
        }),
        expect.objectContaining({
          id: "memo-unchanged",
          title: "Keep",
          content: "keep",
        }),
      ]),
    );
    expect(
      JSON.parse(scrap!.payload).memos.map((memo: { id: string }) => memo.id),
    ).toEqual(["memo-changed", "memo-unchanged"]);
  });
});
