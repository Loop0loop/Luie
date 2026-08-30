import { describe, expect, it } from "vitest";
import type { Edge, Node } from "reactflow";
import type { GraphNodeData } from "../../../src/renderer/src/features/canvas/types/graph";
import { calculateForceLayout } from "../../../src/renderer/src/features/canvas/utils/graphLayout";

const makeNode = (
  id: string,
  overrides: Partial<Node<GraphNodeData>> = {},
): Node<GraphNodeData> => ({
  id,
  type: "pensive",
  position: { x: 0, y: 0 },
  data: {
    label: id,
    type: "character",
    description: "",
    relatedChapters: [],
    ...overrides.data,
  },
  ...overrides,
});

const distance = (
  nodes: Node<GraphNodeData>[],
  a: string,
  b: string,
): number => {
  const nodeA = nodes.find((node) => node.id === a);
  const nodeB = nodes.find((node) => node.id === b);
  if (!nodeA || !nodeB) throw new Error(`missing node: ${a} / ${b}`);
  return Math.hypot(
    nodeA.position.x - nodeB.position.x,
    nodeA.position.y - nodeB.position.y,
  );
};

describe("calculateForceLayout", () => {
  it("빈 입력은 빈 배열을 돌려준다", () => {
    expect(calculateForceLayout([], [], 10)).toEqual([]);
  });

  it("같은 입력에 같은 결과를 낸다", () => {
    const nodes = ["a", "b", "c", "d"].map((id) => makeNode(id));
    const edges: Edge[] = [{ id: "e1", source: "a", target: "b" }];

    const first = calculateForceLayout(nodes, edges, 40, { x: 300, y: 300 });
    const second = calculateForceLayout(nodes, edges, 40, { x: 300, y: 300 });

    expect(first.map((node) => node.position)).toEqual(
      second.map((node) => node.position),
    );
  });

  it("연결된 node는 연결되지 않은 node보다 가깝게 배치된다", () => {
    // 같은 초기 궤도를 쓰도록 노드 순서를 고정한다.
    const nodes = ["a", "b", "c", "d", "e", "f"].map((id) => makeNode(id));
    const edges: Edge[] = [
      { id: "e1", source: "a", target: "b" },
      { id: "e2", source: "a", target: "c" },
    ];

    const laidOut = calculateForceLayout(nodes, edges, 60, { x: 300, y: 300 });

    expect(distance(laidOut, "a", "b")).toBeLessThan(distance(laidOut, "a", "e"));
    expect(distance(laidOut, "a", "c")).toBeLessThan(distance(laidOut, "a", "e"));
  });

  it("graph에 없는 node를 가리키는 edge는 무시한다", () => {
    const nodes = ["a", "b"].map((id) => makeNode(id));
    const withDangling = calculateForceLayout(
      nodes,
      [
        { id: "e1", source: "a", target: "b" },
        { id: "dangling", source: "a", target: "ghost" },
      ],
      30,
    );
    const withoutDangling = calculateForceLayout(
      nodes,
      [{ id: "e1", source: "a", target: "b" }],
      30,
    );

    expect(withDangling.map((node) => node.position)).toEqual(
      withoutDangling.map((node) => node.position),
    );
  });

  it("모든 좌표가 유한한 값이다", () => {
    const nodes = Array.from({ length: 12 }, (_, index) => makeNode(`n${index}`));
    const edges: Edge[] = Array.from({ length: 11 }, (_, index) => ({
      id: `e${index}`,
      source: `n${index}`,
      target: `n${index + 1}`,
    }));

    const laidOut = calculateForceLayout(nodes, edges, 50);

    laidOut.forEach((node) => {
      expect(Number.isFinite(node.position.x)).toBe(true);
      expect(Number.isFinite(node.position.y)).toBe(true);
    });
  });
});
