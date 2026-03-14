import type { Node } from "reactflow";

export type WorldGraphDeleteTarget =
  | { kind: "draft-node"; id: string }
  | { kind: "graph-node"; id: string }
  | { kind: "edge"; id: string };

type ResolveWorldGraphDeleteTargetInput = {
  selectedNodeIds: string[];
  selectedEdgeIds: string[];
  localNodes: Node[];
  persistedNodeIds: Set<string>;
};

export type WorldGraphSelectionSnapshot = {
  selectedNodeIds: string[];
  selectedEdgeIds: string[];
};

export function isEditableWorldGraphTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  for (let current: HTMLElement | null = target; current; current = current.parentElement) {
    const tagName = current.tagName;
    if (
      tagName === "INPUT" ||
      tagName === "TEXTAREA" ||
      tagName === "SELECT" ||
      tagName === "BUTTON" ||
      tagName === "A"
    ) {
      return true;
    }

    if (current.isContentEditable) {
      return true;
    }

    const role = current.getAttribute("role");
    if (role === "button" || role === "textbox" || role === "menuitem") {
      return true;
    }
  }

  return false;
}

export function resolveWorldGraphDeleteTarget({
  selectedNodeIds,
  selectedEdgeIds,
  localNodes,
  persistedNodeIds,
}: ResolveWorldGraphDeleteTargetInput): WorldGraphDeleteTarget | null {
  for (const selectedNodeId of selectedNodeIds) {
    const selectedDraftNode = localNodes.find(
      (node) => node.id === selectedNodeId && node.type === "draft",
    );
    if (selectedDraftNode) {
      return { kind: "draft-node", id: selectedDraftNode.id };
    }

    if (persistedNodeIds.has(selectedNodeId)) {
      return { kind: "graph-node", id: selectedNodeId };
    }
  }

  const selectedEdgeId = selectedEdgeIds[0];
  if (selectedEdgeId) {
    return { kind: "edge", id: selectedEdgeId };
  }

  return null;
}

export function collectWorldGraphSelectionSnapshot(input: {
  localNodes: Node[];
  localEdges: Array<{ id: string; selected?: boolean | null }>;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
}): WorldGraphSelectionSnapshot {
  const selectedNodeIds = input.localNodes
    .filter((node) => Boolean(node.selected))
    .map((node) => node.id);
  const selectedEdgeIds = input.localEdges
    .filter((edge) => Boolean(edge.selected))
    .map((edge) => edge.id);

  if (selectedNodeIds.length === 0 && input.selectedNodeId) {
    selectedNodeIds.push(input.selectedNodeId);
  }

  if (selectedEdgeIds.length === 0 && input.selectedEdgeId) {
    selectedEdgeIds.push(input.selectedEdgeId);
  }

  return {
    selectedNodeIds,
    selectedEdgeIds,
  };
}
