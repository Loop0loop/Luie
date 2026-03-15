import { useMemo } from "react";
import { useWorldBuildingStore } from "@renderer/features/research/stores/worldBuildingStore";
import { useWorldGraphUiStore } from "@renderer/features/research/stores/worldGraphUiStore";
import { createGraphSceneSelectors } from "./selectors";

export function useWorldGraphScene() {
  const graphData = useWorldBuildingStore((state) => state.graphData);
  const selectedNodeId = useWorldGraphUiStore((state) => state.selectedNodeId);
  const selectedEdgeId = useWorldGraphUiStore((state) => state.selectedEdgeId);
  const visibilityFilter = useWorldGraphUiStore((state) => state.visibilityFilter);
  const hiddenNodeIds = useWorldGraphUiStore((state) => state.hiddenNodeIds);
  const hiddenEdgeIds = useWorldGraphUiStore((state) => state.hiddenEdgeIds);

  return useMemo(
    () =>
      createGraphSceneSelectors(
        graphData,
        { selectedNodeId, selectedEdgeId },
        {
          ...visibilityFilter,
          hiddenNodeIds: new Set(hiddenNodeIds),
          hiddenEdgeIds: new Set(hiddenEdgeIds),
        },
      ),
    [graphData, hiddenEdgeIds, hiddenNodeIds, selectedEdgeId, selectedNodeId, visibilityFilter],
  );
}
