import { describe, expect, it, vi } from "vitest";
import {
  project,
  scrapMemo,
  worldDocument,
} from "../../../src/main/database/schema/index.js";
import { applyReplicaWorldState } from "../../../src/main/services/features/sync/syncLocalApply.js";
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

    expect(tx.delete).toHaveBeenCalledWith(worldDocument);
    expect(tx.insert).not.toHaveBeenCalledWith(worldDocument);
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
