import { describe, expect, it, vi } from "vitest";
import { buildProjectPackagePayload } from "../../../src/main/services/features/sync/syncPackagePersistence.js";
import type { SyncBundle } from "../../../src/main/services/features/sync/syncMapper.js";

describe("syncPackagePersistence", () => {
  it("does not rehydrate deleted world docs from the existing .luie package", async () => {
    const bundle: SyncBundle = {
      projects: [
        {
          id: "project-1",
          userId: "user-1",
          title: "Novel",
          description: null,
          createdAt: "2026-03-01T00:00:00.000Z",
          updatedAt: "2026-03-02T00:00:00.000Z",
        },
      ],
      chapters: [],
      characters: [],
      terms: [],
      worldDocuments: [
        {
          id: "project-1:synopsis",
          userId: "user-1",
          projectId: "project-1",
          docType: "synopsis",
          payload: {
            synopsis: "kept",
            status: "draft",
            updatedAt: "2026-03-02T00:00:00.000Z",
          },
          updatedAt: "2026-03-02T00:00:00.000Z",
        },
        {
          id: "project-1:graph",
          userId: "user-1",
          projectId: "project-1",
          docType: "graph",
          payload: {
            nodes: [],
            edges: [],
            canvasBlocks: [],
            canvasEdges: [],
            timelines: [],
            updatedAt: "2026-03-03T00:00:00.000Z",
          },
          updatedAt: "2026-03-03T00:00:00.000Z",
          deletedAt: "2026-03-03T00:00:00.000Z",
        },
      ],
      memos: [],
      snapshots: [],
      tombstones: [],
    };

    const hydrateMissingWorldDocsFromPackage = vi.fn(
      async (
        worldDocs: Map<SyncBundle["worldDocuments"][number]["docType"], unknown>,
        _projectPath: string,
        skippedDocTypes?: Set<SyncBundle["worldDocuments"][number]["docType"]>,
      ) => {
        expect(skippedDocTypes?.has("graph")).toBe(true);
        expect(worldDocs.has("graph")).toBe(false);
      },
    );

    const result = await buildProjectPackagePayload({
      bundle,
      projectId: "project-1",
      projectPath: "/tmp/project-1.luie",
      localSnapshots: [],
      hydrateMissingWorldDocsFromPackage,
      logger: {
        warn: vi.fn(),
        error: vi.fn(),
      },
    });

    expect(hydrateMissingWorldDocsFromPackage).toHaveBeenCalledTimes(1);
    expect(result).not.toBeNull();
    expect(result?.graph).toEqual({
      nodes: [],
      edges: [],
      canvasBlocks: [],
      canvasEdges: [],
      timelines: [],
    });
    expect(result?.synopsis).toMatchObject({
      synopsis: "kept",
      status: "draft",
    });
  });
});
