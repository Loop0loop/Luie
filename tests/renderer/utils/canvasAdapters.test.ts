import { describe, expect, it } from "vitest";
import type { WorldGraphData } from "../../../src/shared/types";
import { buildFlowGraph } from "../../../src/renderer/src/features/canvas/utils/canvasFlowAdapter";
import { buildProjection } from "../../../src/renderer/src/features/canvas/utils/canvasProjectionAdapter";

const graphData: WorldGraphData = {
  nodes: [
    {
      id: "character-1",
      entityType: "Character",
      name: "Hero",
      description: "Lead",
      positionX: 120,
      positionY: 140,
    },
    {
      id: "event-1",
      entityType: "Event",
      name: "Inciting Incident",
      description: null,
      positionX: 0,
      positionY: 0,
    },
  ],
  edges: [
    {
      id: "rel-1",
      projectId: "project-1",
      sourceId: "character-1",
      sourceType: "Character",
      targetId: "event-1",
      targetType: "Event",
      relation: "involved_in",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    {
      id: "rel-hidden",
      projectId: "project-1",
      sourceId: "character-1",
      sourceType: "Character",
      targetId: "missing-node",
      targetType: "Event",
      relation: "involved_in",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  ],
};

describe("canvas adapters", () => {
  it("builds a canvas projection from current world graph data", () => {
    const projection = buildProjection(graphData, "flow-map", {
      kind: "whole-project",
      projectId: "project-1",
    });

    expect(projection.sourceVersion).toBe("nodes:2|edges:2");
    expect(projection.nodes).toEqual([
      {
        id: "character-1",
        kind: "character",
        label: "Hero",
        x: 120,
        y: 140,
        description: "Lead",
      },
      {
        id: "event-1",
        kind: "event",
        label: "Inciting Incident",
        x: 0,
        y: 0,
        description: null,
      },
    ]);
    expect(projection.edges).toEqual([
      {
        id: "rel-1",
        sourceId: "character-1",
        targetId: "event-1",
        label: "involved_in",
        style: "solid",
      },
    ]);
  });

  it("maps projection nodes and visible edges into React Flow data", () => {
    const projection = buildProjection(graphData, "flow-map", {
      kind: "whole-project",
      projectId: "project-1",
    });
    const flowGraph = buildFlowGraph(projection, "character-1");

    expect(flowGraph.nodes).toHaveLength(2);
    expect(flowGraph.nodes[0]).toMatchObject({
      id: "character-1",
      position: { x: 120, y: 140 },
      data: {
        kind: "character",
        label: "Hero",
        description: "Lead",
        isSelected: true,
      },
    });
    expect(flowGraph.nodes[1]?.position).not.toEqual({ x: 0, y: 0 });
    expect(flowGraph.edges).toEqual([
      expect.objectContaining({
        id: "rel-rel-1",
        source: "character-1",
        target: "event-1",
        data: {
          label: "involved_in",
          color: undefined,
          direction: "unidirectional",
        },
      }),
    ]);
  });
});
