import { describe, expect, it, vi } from "vitest";
import {
  project,
  scrapMemo,
  worldDocument,
} from "../../../src/main/database/schema.js";
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

    expect(tx.delete).toHaveBeenCalledWith(scrapMemo);
    expect(tx.update).toHaveBeenCalledWith(project);
    expect(projectUpdates[0]).toMatchObject({
      updatedAt: expect.any(String),
    });
  });
});
