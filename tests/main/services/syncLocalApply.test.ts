import { describe, expect, it, vi } from "vitest";
import { applyReplicaWorldState } from "../../../src/main/services/features/sync/syncLocalApply.js";
import { createEmptySyncBundle } from "../../../src/main/services/features/sync/syncMapper.js";

describe("syncLocalApply.applyReplicaWorldState", () => {
  it("touches project freshness when world documents are materialized", async () => {
    const projectUpdate = vi.fn(async () => undefined);
    const worldDocumentDeleteMany = vi.fn(async () => undefined);
    const worldDocumentUpsert = vi.fn(async () => undefined);
    const scrapMemoDeleteMany = vi.fn(async () => undefined);
    const scrapMemoCreateMany = vi.fn(async () => undefined);

    const prisma = {
      project: {
        update: projectUpdate,
      },
      worldDocument: {
        deleteMany: worldDocumentDeleteMany,
        upsert: worldDocumentUpsert,
      },
      scrapMemo: {
        deleteMany: scrapMemoDeleteMany,
        createMany: scrapMemoCreateMany,
      },
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

    await applyReplicaWorldState(prisma, bundle, new Set());

    expect(worldDocumentUpsert).toHaveBeenCalledTimes(1);
    expect(projectUpdate).toHaveBeenCalledWith({
      where: { id: "project-1" },
      data: {
        updatedAt: expect.any(Date),
      },
    });
  });
});
