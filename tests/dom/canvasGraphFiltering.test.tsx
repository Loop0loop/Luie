// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import type { Edge, Node } from "reactflow";
import type { GraphNodeData } from "../../src/renderer/src/features/canvas/types/graph";
import {
  useGraphDataFiltering,
  type GraphDataFilteringResult,
} from "../../src/renderer/src/features/canvas/components/graph/graphSurfaceParts/useGraphDataFiltering";

const makeNode = (id: string): Node<GraphNodeData> => ({
  id,
  type: "pensive",
  position: { x: 0, y: 0 },
  data: { label: id, type: "character", description: "", relatedChapters: [] },
});

// hub는 3개와 연결(prime), leaf1/2/3은 1개(major), lonely는 0개(minor)
const NODES = ["hub", "leaf1", "leaf2", "leaf3", "lonely"].map(makeNode);
const EDGES: Edge[] = [
  { id: "e1", source: "hub", target: "leaf1", data: { label: "a", strength: 1 } },
  { id: "e2", source: "hub", target: "leaf2", data: { label: "b", strength: 1 } },
  { id: "e3", source: "hub", target: "leaf3", data: { label: "c", strength: 1 } },
];

type HarnessProps = {
  selectedFocusNode: string;
  activeMode: "character" | "event";
  onResult: (result: GraphDataFilteringResult) => void;
};

const Harness = ({ selectedFocusNode, activeMode, onResult }: HarnessProps) => {
  onResult(
    useGraphDataFiltering({
      sourceNodes: NODES,
      sourceEdges: EDGES,
      activeMode,
      selectedFocusNode,
    }),
  );
  return null;
};

const mountHarness = async () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const results: GraphDataFilteringResult[] = [];

  const render = async (props: Omit<HarnessProps, "onResult">) => {
    await act(async () => {
      root.render(
        <Harness {...props} onResult={(result) => results.push(result)} />,
      );
    });
    return results[results.length - 1]!;
  };

  return {
    render,
    cleanup: async () => {
      await act(async () => root.unmount());
      container.remove();
    },
  };
};

const dataOf = (result: GraphDataFilteringResult, id: string) => {
  const node = result.filteredNodes.find((candidate) => candidate.id === id);
  if (!node) throw new Error(`missing node ${id}`);
  return node.data;
};

describe("useGraphDataFiltering", () => {
  beforeAll(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  });

  afterAll(() => {
    Reflect.deleteProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT");
  });

  it("adjacency와 degree 기반 별 등급을 계산한다", async () => {
    const harness = await mountHarness();
    const result = await harness.render({
      selectedFocusNode: "all",
      activeMode: "character",
    });

    expect(result.adjacency.get("hub")).toEqual(
      new Set(["leaf1", "leaf2", "leaf3"]),
    );
    expect(result.adjacency.get("leaf1")).toEqual(new Set(["hub"]));
    expect(result.adjacency.get("lonely")).toBeUndefined();

    expect(dataOf(result, "hub").starGrade).toBe("prime");
    expect(dataOf(result, "leaf1").starGrade).toBe("major");
    expect(dataOf(result, "lonely").starGrade).toBe("minor");

    await harness.cleanup();
  });

  it("focus는 여기서 다루지 않는다: 모든 node가 완전 불투명하고 상호작용 가능하다", async () => {
    const harness = await mountHarness();
    const result = await harness.render({
      selectedFocusNode: "all",
      activeMode: "character",
    });

    result.filteredNodes.forEach((node) => {
      expect(node.data.baseOpacity).toBe(1);
      expect(node.data.opacity).toBe(1);
      expect(node.data.isInteractive).toBe(true);
      expect(node.data.isFocused).toBe(false);
    });

    await harness.cleanup();
  });

  it("필터 드롭다운은 선택 node와 이웃만 밝게 남긴다", async () => {
    const harness = await mountHarness();
    const result = await harness.render({
      selectedFocusNode: "hub",
      activeMode: "character",
    });

    expect(dataOf(result, "hub").baseOpacity).toBe(1);
    expect(dataOf(result, "leaf1").baseOpacity).toBe(0.95);
    expect(dataOf(result, "lonely").baseOpacity).toBe(0.15);

    await harness.cleanup();
  });

  it("같은 구성이면 topologySignature와 배열 identity가 유지된다", async () => {
    const harness = await mountHarness();
    const first = await harness.render({
      selectedFocusNode: "all",
      activeMode: "character",
    });
    const second = await harness.render({
      selectedFocusNode: "all",
      activeMode: "character",
    });

    expect(second.topologySignature).toBe(first.topologySignature);
    expect(second.filteredNodes).toBe(first.filteredNodes);
    expect(second.filteredEdges).toBe(first.filteredEdges);

    // 필터만 바뀌면 node data는 갱신되지만 구성 식별자는 그대로여서
    // GraphSurface의 force layout이 다시 돌지 않는다.
    const filtered = await harness.render({
      selectedFocusNode: "hub",
      activeMode: "character",
    });
    expect(filtered.topologySignature).toBe(first.topologySignature);
    expect(filtered.filteredNodes).not.toBe(first.filteredNodes);
    expect(filtered.filteredEdges).toBe(first.filteredEdges);

    await harness.cleanup();
  });

  it("activeMode가 바뀌면 topologySignature가 바뀐다", async () => {
    const harness = await mountHarness();
    const character = await harness.render({
      selectedFocusNode: "all",
      activeMode: "character",
    });
    const event = await harness.render({
      selectedFocusNode: "all",
      activeMode: "event",
    });

    expect(event.topologySignature).not.toBe(character.topologySignature);

    await harness.cleanup();
  });
});
