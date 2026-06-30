import { describe, expect, it, vi } from "vitest";
import { normalizeGraphPayload } from "../../../src/main/services/features/sync/syncWorldDocNormalizer.js";

const logger = {
  warn: vi.fn(),
};

describe("syncWorldDocNormalizer.normalizeGraphPayload", () => {
  it("returns empty canvas arrays for malformed payloads", () => {
    const normalized = normalizeGraphPayload("project-1", "not-json", logger);

    expect(normalized).toMatchObject({
      nodes: [],
      edges: [],
      canvasBlocks: [],
      canvasEdges: [],
      timelines: [],
    });
  });

  it("preserves canvas blocks/edges/files/timelines including color fields", () => {
    const normalized = normalizeGraphPayload(
      "project-1",
      {
        nodes: [],
        edges: [],
        canvasBlocks: [
          {
            id: "block-1",
            type: "timeline",
            positionX: 100,
            positionY: 200,
            data: {
              content: "Scene 1",
              isHeld: false,
              color: "#ffcc00",
            },
          },
        ],
        canvasEdges: [
          {
            id: "edge-1",
            sourceId: "block-1",
            targetId: "block-2",
            relation: "causes",
            color: "#00aaff",
            direction: "unidirectional",
          },
        ],
        canvasFiles: [
          {
            id: "folder-1",
            kind: "folder",
            name: "Reference",
            parentId: null,
            updatedAt: "2026-02-22T00:05:00.000Z",
          },
          {
            id: "canvas-1",
            kind: "canvas",
            name: "Board",
            parentId: "folder-1",
            updatedAt: "2026-02-22T00:06:00.000Z",
          },
        ],
        timelines: [
          {
            id: "timeline-1",
            name: "Act 1",
            segments: [{ id: "seg-1", name: "Opening" }],
          },
        ],
        updatedAt: "2026-02-22T00:10:00.000Z",
      },
      logger,
    );

    expect(normalized).toMatchObject({
      canvasBlocks: [
        expect.objectContaining({
          id: "block-1",
          data: expect.objectContaining({ color: "#ffcc00" }),
        }),
      ],
      canvasEdges: [
        expect.objectContaining({
          id: "edge-1",
          color: "#00aaff",
          direction: "unidirectional",
        }),
      ],
      canvasFiles: [
        expect.objectContaining({
          id: "folder-1",
          kind: "folder",
        }),
        expect.objectContaining({
          id: "canvas-1",
          parentId: "folder-1",
        }),
      ],
      timelines: [
        expect.objectContaining({
          id: "timeline-1",
          segments: [expect.objectContaining({ id: "seg-1" })],
        }),
      ],
    });
  });
});
