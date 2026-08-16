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
        {
          id: "project-1:graph-old",
          userId: "user-1",
          projectId: "project-1",
          docType: "graph",
          payload: {
            nodes: [
              {
                id: "stale-node",
                entityType: "Character",
                name: "Stale",
              },
            ],
            edges: [],
            updatedAt: "2026-03-01T00:00:00.000Z",
          },
          updatedAt: "2026-03-01T00:00:00.000Z",
        },
      ],
      memos: [],
      snapshots: [],
      memoryCanonicalRows: [
        {
          id: "MemoryEntity:entity-1",
          userId: "user-1",
          projectId: "project-1",
          tableName: "MemoryEntity",
          row: {
            id: "entity-1",
            projectId: "project-1",
            entityType: "character",
            canonicalName: "Alice",
            status: "confirmed",
            updatedAt: "2026-03-02T00:00:00.000Z",
          },
          updatedAt: "2026-03-02T00:00:00.000Z",
        },
        {
          id: "MemoryEntity:entity-deleted",
          userId: "user-1",
          projectId: "project-1",
          tableName: "MemoryEntity",
          row: {
            id: "entity-deleted",
            projectId: "project-1",
            entityType: "character",
            canonicalName: "Deleted",
            status: "confirmed",
            updatedAt: "2026-03-02T00:00:00.000Z",
            deletedAt: "2026-03-03T00:00:00.000Z",
          },
          updatedAt: "2026-03-03T00:00:00.000Z",
          deletedAt: "2026-03-03T00:00:00.000Z",
        },
        {
          id: "MemoryEntity:entity-suggested",
          userId: "user-1",
          projectId: "project-1",
          tableName: "MemoryEntity",
          row: {
            id: "entity-suggested",
            projectId: "project-1",
            entityType: "character",
            canonicalName: "Suggested",
            status: "suggested",
            updatedAt: "2026-03-02T00:00:00.000Z",
          },
          updatedAt: "2026-03-02T00:00:00.000Z",
        },
        {
          id: "MemoryEntity:wrong-project",
          userId: "user-1",
          projectId: "project-1",
          tableName: "MemoryEntity",
          row: {
            id: "wrong-project",
            projectId: "other-project",
            entityType: "character",
            canonicalName: "Wrong",
            status: "confirmed",
            updatedAt: "2026-03-02T00:00:00.000Z",
          },
          updatedAt: "2026-03-02T00:00:00.000Z",
        },
      ],
      tombstones: [],
    };

    const hydrateMissingWorldDocsFromPackage = vi.fn(
      async (
        worldDocs: Map<
          SyncBundle["worldDocuments"][number]["docType"],
          unknown
        >,
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
      canvasFiles: [],
      timelines: [],
    });
    expect(result?.synopsis).toMatchObject({
      synopsis: "kept",
      status: "draft",
    });
    expect(result?.memory).toMatchObject({
      schemaVersion: 1,
      tables: {
        MemoryEntity: [
          expect.objectContaining({
            id: "entity-1",
            status: "confirmed",
          }),
        ],
      },
    });
  });
});
