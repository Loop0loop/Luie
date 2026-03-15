import { useWorldGraphUiStore } from "@renderer/features/research/stores/worldGraphUiStore";

export function useGraphVisibility() {
  const visibilityFilter = useWorldGraphUiStore((state) => state.visibilityFilter);
  const hiddenNodeIds = useWorldGraphUiStore((state) => state.hiddenNodeIds);
  const hiddenEdgeIds = useWorldGraphUiStore((state) => state.hiddenEdgeIds);
  const setGraphSearchQuery = useWorldGraphUiStore((state) => state.setGraphSearchQuery);
  const toggleEntityTypeFilter = useWorldGraphUiStore((state) => state.toggleEntityTypeFilter);
  const toggleRelationKindFilter = useWorldGraphUiStore((state) => state.toggleRelationKindFilter);
  const hideNode = useWorldGraphUiStore((state) => state.hideNode);
  const hideEdge = useWorldGraphUiStore((state) => state.hideEdge);
  const resetVisibility = useWorldGraphUiStore((state) => state.resetVisibility);
  const showAllCanvasElements = useWorldGraphUiStore((state) => state.showAllCanvasElements);

  return {
    visibilityFilter,
    hiddenNodeIds,
    hiddenEdgeIds,
    setGraphSearchQuery,
    toggleEntityTypeFilter,
    toggleRelationKindFilter,
    hideNode,
    hideEdge,
    resetVisibility,
    showAllCanvasElements,
  };
}
