import { describe, expect, it } from "vitest";
import { worldReplicaDocumentSetSchema } from "../../src/shared/schemas/index";
import { buildWorldGraphDocument } from "../../src/shared/world/worldGraphDocument";

describe("worldReplicaDocumentSetSchema", () => {
  it("accepts graph payloads with canvas files", () => {
    expect(
      worldReplicaDocumentSetSchema.safeParse({
        projectId: "project-1",
        docType: "graph",
        payload: {
          nodes: [],
          edges: [],
          canvasFiles: [
            {
              id: "file-1",
              name: "map.png",
              graphEntry: "assets/map.png",
            },
          ],
          updatedAt: "2026-06-30T00:00:00.000Z",
        },
      }).success,
    ).toBe(true);
  });

  it("accepts graph payloads built by the renderer graph document codec", () => {
    const payload = buildWorldGraphDocument(
      {
        nodes: [
          {
            id: "character-1",
            entityType: "Character",
            name: "Alice",
            attributes: null,
            positionX: 120,
            positionY: 240,
          },
        ],
        edges: [],
        canvasBlocks: [
          {
            id: "block-1",
            type: "memo",
            positionX: 10,
            positionY: 20,
            data: {
              title: "Memo",
              body: "",
              tags: [],
            },
          },
        ],
        canvasFiles: [
          {
            id: "file-1",
            kind: "canvas",
            name: "Board",
            parentId: null,
          },
        ],
      },
      "2026-06-30T00:00:00.000Z",
    );

    expect(
      worldReplicaDocumentSetSchema.safeParse({
        projectId: "project-1",
        docType: "graph",
        payload,
      }).success,
    ).toBe(true);
  });

  it("rejects payloads that JSON would silently drop", () => {
    expect(
      worldReplicaDocumentSetSchema.safeParse({
        projectId: "project-1",
        docType: "synopsis",
        payload: {
          synopsis: "A",
          formatter: () => "lost",
        },
      }).success,
    ).toBe(false);
  });

  it("rejects circular payloads", () => {
    const payload: Record<string, unknown> = { synopsis: "A" };
    payload.self = payload;

    expect(
      worldReplicaDocumentSetSchema.safeParse({
        projectId: "project-1",
        docType: "synopsis",
        payload,
      }).success,
    ).toBe(false);
  });

  it("rejects oversized payloads", () => {
    expect(
      worldReplicaDocumentSetSchema.safeParse({
        projectId: "project-1",
        docType: "synopsis",
        payload: {
          synopsis: "x".repeat(10_000_001),
        },
      }).success,
    ).toBe(false);
  });
});
