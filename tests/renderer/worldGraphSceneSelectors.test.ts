import { describe, expect, it } from "vitest";
import type { EntityRelation, WorldGraphData, WorldGraphNode } from "../../src/shared/types/index.js";
import { createGraphSceneSelectors } from "../../src/renderer/src/features/research/components/world/graph/scene/selectors.js";

const buildNode = (overrides: Partial<WorldGraphNode>): WorldGraphNode => ({
  id: overrides.id ?? "node-1",
  entityType: overrides.entityType ?? "Concept",
  subType: overrides.subType,
  name: overrides.name ?? "Node",
  description: overrides.description ?? null,
  firstAppearance: overrides.firstAppearance ?? null,
  attributes: overrides.attributes ?? null,
  positionX: overrides.positionX ?? 0,
  positionY: overrides.positionY ?? 0,
});

const buildEdge = (overrides: Partial<EntityRelation>): EntityRelation => ({
  id: overrides.id ?? "edge-1",
  sourceId: overrides.sourceId ?? "node-1",
  sourceType: overrides.sourceType ?? "Concept",
  targetId: overrides.targetId ?? "node-2",
  targetType: overrides.targetType ?? "Event",
  relation: overrides.relation ?? "causes",
  attributes: overrides.attributes ?? null,
});

describe("worldGraphScene selectors", () => {
  it("keeps source lists intact while canvas visibility is filtered", () => {
    const graphData: WorldGraphData = {
      nodes: [
        buildNode({
          id: "character-1",
          entityType: "Character",
          name: "주인공",
        }),
        buildNode({
          id: "event-1",
          entityType: "Event",
          name: "붉은 밤",
          firstAppearance: "왕국력 1년",
        }),
      ],
      edges: [
        buildEdge({
          id: "edge-1",
          sourceId: "character-1",
          sourceType: "Character",
          targetId: "event-1",
          targetType: "Event",
        }),
      ],
    };

    const scene = createGraphSceneSelectors(
      graphData,
      { selectedNodeId: "character-1", selectedEdgeId: null },
      {
        entityTypes: ["Event"],
        relationKinds: ["causes"],
        searchQuery: "",
        hiddenNodeIds: new Set(),
        hiddenEdgeIds: new Set(),
      },
    );

    expect(scene.visibleGraph.nodes.map((node) => node.id)).toEqual(["event-1"]);
    expect(scene.visibleGraph.edges).toHaveLength(0);
    expect(scene.entityEntries.map((entry) => entry.id)).toEqual([
      "event-1",
      "character-1",
    ]);
    expect(scene.selectedNode?.id).toBe("character-1");
  });

  it("hides canvas nodes without removing timeline or entity source entries", () => {
    const graphData: WorldGraphData = {
      nodes: [
        buildNode({
          id: "event-1",
          entityType: "Event",
          name: "첫 사건",
          firstAppearance: "왕국력 2년",
        }),
      ],
      edges: [],
    };

    const scene = createGraphSceneSelectors(
      graphData,
      { selectedNodeId: "event-1", selectedEdgeId: null },
      {
        entityTypes: ["Event"],
        relationKinds: ["causes"],
        searchQuery: "",
        hiddenNodeIds: new Set(["event-1"]),
        hiddenEdgeIds: new Set(),
      },
    );

    expect(scene.visibleGraph.nodes).toHaveLength(0);
    expect(scene.timelineEntries.map((entry) => entry.id)).toEqual(["event-1"]);
    expect(scene.entityEntries.map((entry) => entry.id)).toEqual(["event-1"]);
    expect(scene.selectedNode?.id).toBe("event-1");
  });
});
