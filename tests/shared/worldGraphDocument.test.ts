import { describe, expect, it } from "vitest";
import {
  buildWorldGraphDocument,
  mergeWorldGraphLayout,
} from "../../src/shared/world/worldGraphDocument.js";
import type { WorldGraphData } from "../../src/shared/types/index.js";

describe("worldGraphDocument", () => {
  it("merges replica layout for non-world-entity nodes without overriding world-entity positions", () => {
    const graphData: WorldGraphData = {
      nodes: [
        {
          id: "character-1",
          entityType: "Character",
          name: "Alice",
          attributes: null,
          positionX: 0,
          positionY: 0,
        },
        {
          id: "place-1",
          entityType: "Place",
          subType: "Place",
          name: "Capital",
          attributes: null,
          positionX: 12,
          positionY: 24,
        },
      ],
      edges: [],
    };

    const merged = mergeWorldGraphLayout(graphData, {
      nodes: [
        {
          id: "character-1",
          entityType: "Character",
          name: "Alice",
          positionX: 120,
          positionY: 240,
        },
        {
          id: "place-1",
          entityType: "Place",
          name: "Capital",
          positionX: 300,
          positionY: 400,
        },
      ],
    });

    expect(merged.nodes[0]).toMatchObject({
      id: "character-1",
      positionX: 120,
      positionY: 240,
      attributes: {
        graphPosition: {
          x: 120,
          y: 240,
        },
      },
    });
    expect(merged.nodes[1]).toMatchObject({
      id: "place-1",
      positionX: 12,
      positionY: 24,
    });
  });

  it("strips transient graphPosition metadata when building the saved graph document", () => {
    const graphData: WorldGraphData = {
      nodes: [
        {
          id: "character-1",
          entityType: "Character",
          name: "Alice",
          attributes: {
            role: "lead",
            graphPosition: {
              x: 120,
              y: 240,
            },
          },
          positionX: 120,
          positionY: 240,
        },
      ],
      edges: [],
    };

    expect(buildWorldGraphDocument(graphData, "2026-03-13T09:00:00.000Z")).toEqual({
      nodes: [
        {
          id: "character-1",
          entityType: "Character",
          subType: undefined,
          name: "Alice",
          description: null,
          firstAppearance: null,
          attributes: {
            role: "lead",
          },
          positionX: 120,
          positionY: 240,
        },
      ],
      edges: [],
      canvasBlocks: [],
      canvasEdges: [],
      timelines: [],
      updatedAt: "2026-03-13T09:00:00.000Z",
    });
  });

  it("keeps a deliberate 0,0 layout through transient graphPosition metadata", () => {
    const merged = mergeWorldGraphLayout(
      {
        nodes: [
          {
            id: "character-1",
            entityType: "Character",
            name: "Alice",
            attributes: null,
            positionX: 0,
            positionY: 0,
          },
        ],
        edges: [],
      },
      {
        nodes: [
          {
            id: "character-1",
            entityType: "Character",
            name: "Alice",
            positionX: 0,
            positionY: 0,
          },
        ],
      },
    );

    expect(merged.nodes[0]).toMatchObject({
      positionX: 0,
      positionY: 0,
      attributes: {
        graphPosition: {
          x: 0,
          y: 0,
        },
      },
    });
  });

  it("preserves canvas layout when a payload omits canvas sections", () => {
    const graphData: WorldGraphData = {
      nodes: [
        {
          id: "character-1",
          entityType: "Character",
          name: "Alice",
          attributes: null,
          positionX: 0,
          positionY: 0,
        },
      ],
      edges: [],
      canvasBlocks: [
        {
          id: "block-1",
          type: "memo",
          positionX: 12,
          positionY: 24,
          data: {
            title: "Memo",
            tags: ["tag"],
            body: "Body",
          },
        },
      ],
      canvasEdges: [
        {
          id: "edge-1",
          sourceId: "block-1",
          targetId: "character-1",
          relation: "related",
          direction: "unidirectional",
        },
      ],
      timelines: [
        {
          id: "timeline-1",
          name: "Timeline",
          segments: [{ id: "segment-1", name: "Segment" }],
        },
      ],
    };

    const merged = mergeWorldGraphLayout(graphData, {
      nodes: [
        {
          id: "character-1",
          entityType: "Character",
          name: "Alice",
          positionX: 300,
          positionY: 400,
        },
      ],
    });

    expect(merged.canvasBlocks).toEqual(graphData.canvasBlocks);
    expect(merged.canvasEdges).toEqual(graphData.canvasEdges);
    expect(merged.timelines).toEqual(graphData.timelines);
    expect(merged.nodes[0]).toMatchObject({
      positionX: 300,
      positionY: 400,
    });
  });

  it("dedupes graph document arrays before saving", () => {
    const graphData: WorldGraphData = {
      nodes: [
        {
          id: "node-1",
          entityType: "Character",
          name: "First",
          attributes: null,
          positionX: 1,
          positionY: 2,
        },
        {
          id: "node-1",
          entityType: "Character",
          name: "Second",
          attributes: null,
          positionX: 3,
          positionY: 4,
        },
      ],
      edges: [
        {
          id: "edge-1",
          projectId: "project-1",
          sourceId: "node-1",
          sourceType: "Character",
          targetId: "node-2",
          targetType: "Event",
          relation: "belongs_to",
          attributes: null,
          sourceWorldEntityId: null,
          targetWorldEntityId: null,
          createdAt: "2026-03-13T08:00:00.000Z",
          updatedAt: "2026-03-13T08:00:00.000Z",
        },
        {
          id: "edge-1",
          projectId: "project-1",
          sourceId: "node-1",
          sourceType: "Character",
          targetId: "node-2",
          targetType: "Event",
          relation: "causes",
          attributes: null,
          sourceWorldEntityId: null,
          targetWorldEntityId: null,
          createdAt: "2026-03-13T09:00:00.000Z",
          updatedAt: "2026-03-13T09:00:00.000Z",
        },
      ],
      canvasBlocks: [
        {
          id: "block-1",
          type: "memo",
          positionX: 10,
          positionY: 20,
          data: {
            title: "First",
            tags: [],
            body: "One",
          },
        },
        {
          id: "block-1",
          type: "memo",
          positionX: 30,
          positionY: 40,
          data: {
            title: "Second",
            tags: ["tag"],
            body: "Two",
            color: "#112233",
          },
        },
      ],
      canvasEdges: [
        {
          id: "canvas-1",
          sourceId: "block-1",
          targetId: "node-1",
          relation: "related",
          direction: "unidirectional",
        },
        {
          id: "canvas-1",
          sourceId: "block-1",
          targetId: "node-2",
          relation: "linked",
          direction: "bidirectional",
          color: "#abcdef",
        },
      ],
      timelines: [
        {
          id: "timeline-1",
          name: "First",
          segments: [{ id: "segment-1", name: "Old Segment" }],
        },
        {
          id: "timeline-1",
          name: "Second",
          segments: [{ id: "segment-1", name: "New Segment" }],
        },
      ],
    };

    expect(buildWorldGraphDocument(graphData, "2026-03-13T09:00:00.000Z")).toEqual(
      {
        nodes: [
          {
            id: "node-1",
            entityType: "Character",
            subType: undefined,
            name: "Second",
            description: null,
            firstAppearance: null,
            attributes: null,
            positionX: 3,
            positionY: 4,
          },
        ],
        edges: [
          {
            id: "edge-1",
            projectId: "project-1",
            sourceId: "node-1",
            sourceType: "Character",
            targetId: "node-2",
            targetType: "Event",
            relation: "causes",
            attributes: null,
            sourceWorldEntityId: null,
            targetWorldEntityId: null,
            createdAt: "2026-03-13T09:00:00.000Z",
            updatedAt: "2026-03-13T09:00:00.000Z",
          },
        ],
        canvasBlocks: [
          {
            id: "block-1",
            type: "memo",
            positionX: 30,
            positionY: 40,
            data: {
              title: "Second",
              tags: ["tag"],
              body: "Two",
              color: "#112233",
            },
          },
        ],
        canvasEdges: [
          {
            id: "canvas-1",
            sourceId: "block-1",
            targetId: "node-2",
            relation: "linked",
            direction: "bidirectional",
            color: "#abcdef",
          },
        ],
        timelines: [
          {
            id: "timeline-1",
            name: "Second",
            segments: [{ id: "segment-1", name: "New Segment" }],
          },
        ],
        updatedAt: "2026-03-13T09:00:00.000Z",
      },
    );
  });
});
