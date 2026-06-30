import { describe, expect, it } from "vitest";
import { worldReplicaDocumentSetSchema } from "../../src/shared/schemas/index";

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
