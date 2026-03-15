import { useWorldGraphUiStore } from "@renderer/features/research/stores/worldGraphUiStore";
import { useWorldGraphScene } from "./useWorldGraphScene";

export function useWorldGraphSelection() {
  const selectedNodeId = useWorldGraphUiStore((state) => state.selectedNodeId);
  const selectedEdgeId = useWorldGraphUiStore((state) => state.selectedEdgeId);
  const selectNode = useWorldGraphUiStore((state) => state.selectNode);
  const selectEdge = useWorldGraphUiStore((state) => state.selectEdge);
  const clearSelection = useWorldGraphUiStore((state) => state.clearSelection);
  const scene = useWorldGraphScene();

  return {
    selectedNodeId,
    selectedEdgeId,
    selectedNode: scene.selectedNode,
    selectedEdge: scene.selectedEdge,
    selectNode,
    selectEdge,
    clearSelection,
  };
}
