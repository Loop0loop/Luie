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
});
