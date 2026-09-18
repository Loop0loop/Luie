import { describe, expect, it } from "vitest";
import type { Edge, Node } from "reactflow";
import type { GraphNodeData } from "../../../src/renderer/src/features/canvas/types/graph";
import { calculateForceLayout } from "../../../src/renderer/src/features/canvas/utils/graphLayout";
import { calculateGraphLayoutResult } from "../../../src/renderer/src/features/canvas/workers/graphLayoutWorkerCore";

const makeNode = (id: string): Node<GraphNodeData> => ({
  id,
  type: "pensive",
  position: { x: 0, y: 0 },
  data: { label: id, type: "character", description: "", relatedChapters: [] },
});

describe("graph layout worker protocol", () => {
  it("기존 force layout과 같은 위치 결과만 돌려준다", () => {
    const nodes = ["a", "b", "c"].map(makeNode);
    const edges: Edge[] = [{ id: "e1", source: "a", target: "b" }];
    const expected = calculateForceLayout(nodes, edges, 40, { x: 300, y: 300 });

    const result = calculateGraphLayoutResult({
      requestId: 7,
      nodes,
      edges,
      iterations: 40,
      center: { x: 300, y: 300 },
    });

    expect(result.requestId).toBe(7);
    expect(result.positions).toEqual(
      expected.map((node) => ({ id: node.id, position: node.position })),
    );
  });
});
