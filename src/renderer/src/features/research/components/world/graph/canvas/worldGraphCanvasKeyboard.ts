import type { Node } from "reactflow";

export type WorldGraphDeleteTarget =
  | { kind: "draft-node"; id: string }
  | { kind: "graph-node"; id: string }
  | { kind: "edge"; id: string };

type ResolveWorldGraphDeleteTargetInput = {
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  localNodes: Node[];
  persistedNodeIds: Set<string>;
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
  selectedNodeId,
  selectedEdgeId,
  localNodes,
  persistedNodeIds,
}: ResolveWorldGraphDeleteTargetInput): WorldGraphDeleteTarget | null {
  if (selectedNodeId) {
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

  if (selectedEdgeId) {
    return { kind: "edge", id: selectedEdgeId };
  }

  return null;
}
