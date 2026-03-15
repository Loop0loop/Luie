// @vitest-environment jsdom

import type { Node } from "reactflow";
import { describe, expect, it } from "vitest";
import {
  collectWorldGraphSelectionSnapshot,
  isEditableWorldGraphTarget,
  resolveWorldGraphDeleteTarget,
} from "../../src/renderer/src/features/research/components/world/graph/canvas/worldGraphCanvasKeyboard.js";

describe("worldGraphCanvasKeyboard", () => {
  it("treats text inputs and buttons as editable targets", () => {
    const wrapper = document.createElement("div");
    const textarea = document.createElement("textarea");
    const select = document.createElement("select");
    const button = document.createElement("button");
    wrapper.append(textarea, select, button);
    document.body.appendChild(wrapper);

    expect(isEditableWorldGraphTarget(textarea)).toBe(true);
    expect(isEditableWorldGraphTarget(select)).toBe(true);
    expect(isEditableWorldGraphTarget(button)).toBe(true);
    expect(isEditableWorldGraphTarget(wrapper)).toBe(false);
  });

  it("prioritizes deleting draft nodes before persisted nodes and edges", () => {
    const localNodes = [
      {
        id: "draft-1",
        type: "draft",
        position: { x: 0, y: 0 },
        data: {},
      },
    ] satisfies Node[];

    expect(
      resolveWorldGraphDeleteTarget({
        selectedNodeIds: ["draft-1"],
        selectedEdgeIds: ["edge-1"],
        localNodes,
        persistedNodeIds: new Set(["node-1"]),
      }),
    ).toEqual({
      kind: "draft-node",
      id: "draft-1",
    });
  });

  it("falls back to persisted nodes and then edges", () => {
    expect(
      resolveWorldGraphDeleteTarget({
        selectedNodeIds: ["node-1"],
        selectedEdgeIds: ["edge-1"],
        localNodes: [],
        persistedNodeIds: new Set(["node-1"]),
      }),
    ).toEqual({
      kind: "graph-node",
      id: "node-1",
    });

    expect(
      resolveWorldGraphDeleteTarget({
        selectedNodeIds: [],
        selectedEdgeIds: ["edge-1"],
        localNodes: [],
        persistedNodeIds: new Set(["node-1"]),
      }),
    ).toEqual({
      kind: "edge",
      id: "edge-1",
    });
  });

  it("collects selected nodes and edges from local React Flow state", () => {
    const localNodes = [
      {
        id: "node-1",
        type: "custom",
        selected: true,
        position: { x: 0, y: 0 },
        data: {},
      },
      {
        id: "draft-1",
        type: "draft",
        selected: true,
        position: { x: 40, y: 20 },
        data: {},
      },
    ] satisfies Node[];

    expect(
      collectWorldGraphSelectionSnapshot({
        localNodes,
        localEdges: [
          { id: "edge-1", selected: true },
          { id: "edge-2", selected: false },
        ],
        selectedNodeId: null,
        selectedEdgeId: null,
      }),
    ).toEqual({
      selectedNodeIds: ["node-1", "draft-1"],
      selectedEdgeIds: ["edge-1"],
    });
  });

  it("ignores undefined nodes and edges in selection snapshots", () => {
    expect(
      collectWorldGraphSelectionSnapshot({
        localNodes: [
          undefined,
          null,
          {
            id: "node-1",
            type: "custom",
            selected: true,
            position: { x: 0, y: 0 },
            data: {},
          },
        ],
        localEdges: [undefined, null, { id: "edge-1", selected: true }],
        selectedNodeId: null,
        selectedEdgeId: null,
      }),
    ).toEqual({
      selectedNodeIds: ["node-1"],
      selectedEdgeIds: ["edge-1"],
    });
  });
});
