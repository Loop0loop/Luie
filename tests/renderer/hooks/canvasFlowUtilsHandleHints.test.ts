import { describe, expect, it } from "vitest";
import type {
  EntityRelation,
  WorldGraphCanvasEdge,
} from "../../../src/shared/types";
import {
  buildEntityRelationHintEdgeId,
  buildFlowEdges,
  parseEntityRelationHintId,
} from "../../../src/renderer/src/features/research/components/world/graph/utils/canvasFlowUtils";

describe("canvas flow handle hints", () => {
  it("maps persisted relation handle hints onto entity edges", () => {
    const relation: EntityRelation = {
      id: "rel-1",
      projectId: "p-1",
      sourceId: "n-1",
      sourceType: "Character",
      targetId: "n-2",
      targetType: "Event",
      relation: "belongs_to",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const hint: WorldGraphCanvasEdge = {
      id: buildEntityRelationHintEdgeId("rel-1"),
      sourceId: "n-1",
      sourceHandle: "bottom-out",
      targetId: "n-2",
      targetHandle: "top-in",
      relation: "",
      direction: "none",
    };

    const edges = buildFlowEdges([relation], [hint], {});
    const entityEdge = edges.find((edge) => edge.id === "entity:rel-1");

    expect(entityEdge).toBeDefined();
    expect(entityEdge?.sourceHandle).toBe("bottom-out");
    expect(entityEdge?.targetHandle).toBe("top-in");
  });

  it("does not render hint-only canvas edge labels", () => {
    const hintId = buildEntityRelationHintEdgeId("rel-hidden");
    const hint: WorldGraphCanvasEdge = {
      id: hintId,
      sourceId: "a",
      sourceHandle: "left-out",
      targetId: "b",
      targetHandle: "right-in",
      relation: "",
      direction: "none",
    };

    const edges = buildFlowEdges([], [hint], {});
    expect(edges.some((edge) => edge.id === `canvas:${hintId}`)).toBe(false);
    expect(parseEntityRelationHintId(hintId)).toBe("rel-hidden");
  });
});
