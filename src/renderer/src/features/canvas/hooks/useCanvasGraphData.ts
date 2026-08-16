/** canvas에 바로 진입해도 현재 project의 graphData가 없으면 한 번 불러온다. */
import { useEffect } from "react";
import { useProjectStore } from "@renderer/features/project/stores/projectStore";
import { useWorldBuildingStore } from "@renderer/features/research/stores/worldBuildingStore";

export interface CanvasGraphDataState {
  projectId: string | null;
  isLoading: boolean;
  error: string | null;
  isReady: boolean;
}

export function useCanvasGraphData(): CanvasGraphDataState {
  const projectId = useProjectStore((state) => state.currentProject?.id ?? null);

  const graphData = useWorldBuildingStore((state) => state.graphData);
  const activeProjectId = useWorldBuildingStore((state) => state.activeProjectId);
  const isLoading = useWorldBuildingStore((state) => state.isLoading);
  const error = useWorldBuildingStore((state) => state.error);

  useEffect(() => {
    if (!projectId) return;

    // NOTE: effect closure가 아닌 현재 store snapshot으로 중복 load를 판단한다.
    const state = useWorldBuildingStore.getState();
    const alreadyLoaded =
      state.activeProjectId === projectId && state.graphData !== null;
    if (alreadyLoaded) return;

    void state.loadGraph(projectId);
  }, [projectId]);

  return {
    projectId,
    isLoading,
    error,
    isReady: activeProjectId === projectId && graphData !== null,
  };
}
