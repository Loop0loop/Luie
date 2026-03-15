import { useEffect, useRef } from "react";
import { useWorldGraphUiStore } from "@renderer/features/research/stores/worldGraphUiStore";
import { useWorldGraphScene } from "./useWorldGraphScene";

export function useWorldGraphSceneLifecycle(projectId: string | null) {
  const previousProjectIdRef = useRef<string | null>(null);
  const selectedNodeId = useWorldGraphUiStore((state) => state.selectedNodeId);
  const selectedEdgeId = useWorldGraphUiStore((state) => state.selectedEdgeId);
  const selectNode = useWorldGraphUiStore((state) => state.selectNode);
  const selectEdge = useWorldGraphUiStore((state) => state.selectEdge);
  const resetVisibility = useWorldGraphUiStore((state) => state.resetVisibility);
  const scene = useWorldGraphScene();

  useEffect(() => {
    if (previousProjectIdRef.current === projectId) {
      return;
    }
    previousProjectIdRef.current = projectId;
    resetVisibility();
    selectNode(null);
  }, [projectId, resetVisibility, selectNode]);

  useEffect(() => {
    if (!selectedNodeId) return;
    if (scene.nodeById.has(selectedNodeId)) return;
    selectNode(null);
  }, [scene.nodeById, selectNode, selectedNodeId]);

  useEffect(() => {
    if (!selectedEdgeId) return;
    if (scene.edgeById.has(selectedEdgeId)) return;
    selectEdge(null);
  }, [scene.edgeById, selectEdge, selectedEdgeId]);
}
