import { describe, expect, it } from "vitest";
import type { EntityRelation, WorldGraphData, WorldGraphNode } from "../../../src/shared/types";
import {
  appendNodeToGraph,
  appendRelationToGraph,
} from "../../../src/renderer/src/features/research/stores/worldBuildingStore.graph";

describe("worldBuildingStore.graph", () => {
  it("replaces duplicate nodes by id when appending", () => {
    const graphData: WorldGraphData = {
      nodes: [
        {
          id: "node-1",
          entityType: "Character",
          name: "First",
          attributes: null,
          positionX: 0,
          positionY: 0,
        } satisfies WorldGraphNode,
      ],
      edges: [],
    };

    const next = appendNodeToGraph(graphData, {
      id: "node-1",
      entityType: "Character",
      name: "Second",
      attributes: null,
      positionX: 10,
      positionY: 20,
    } satisfies WorldGraphNode);

    expect(next.nodes).toHaveLength(1);
    expect(next.nodes[0]).toMatchObject({
      id: "node-1",
      name: "Second",
      positionX: 10,
      positionY: 20,
    });
  });

  it("replaces duplicate relations by id when appending", () => {
    const graphData: WorldGraphData = {
      nodes: [],
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
        } satisfies EntityRelation,
      ],
    };

    const next = appendRelationToGraph(graphData, {
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
    } satisfies EntityRelation);

    expect(next?.edges).toHaveLength(1);
    expect(next?.edges[0]).toMatchObject({
      id: "edge-1",
      relation: "causes",
      createdAt: "2026-03-13T09:00:00.000Z",
    });
  });
});
