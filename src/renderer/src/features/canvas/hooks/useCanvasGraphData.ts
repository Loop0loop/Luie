/**
 * useCanvasGraphData — canvas 진입 시 worldBuildingStore.graphData 로딩을 보장하는 훅.
 *
 * 배경:
 *   worldBuildingStore.loadGraph 는 main 프로세스의 `worldGraph.get` IPC
 *   (Character/Faction/Event/Term/WorldEntity/Scene/Note/Synopsis/Plot/Scrap
 *   전 엔티티 집계) + `worldStorage.getDocument`(canvas 레이아웃 replica)를
 *   병합해 graphData 를 채운다.
 *
 *   그러나 기존에는 엔티티 CRUD 직후 refreshWorldGraph 로만 loadGraph 가
 *   호출되어, 프로젝트를 열고 곧장 canvas 로 진입하면 graphData 가 null 인 채
 *   빈 뷰포트가 렌더링되는 단절이 있었다. 이 훅이 그 연결을 책임진다.
 *
 * 동작:
 *   - 현재 프로젝트 기준으로 graphData 가 아직 로드되지 않았으면 loadGraph 호출.
 *   - 이미 같은 프로젝트로 로드되어 있으면 재호출하지 않는다(불필요한 IPC 0%).
 *   - loadGraph 자체가 in-flight 요청 큐 가드를 가지므로 중복 진입은 안전하다.
 */
import { useEffect } from "react";
import { useProjectStore } from "@renderer/features/project/stores/projectStore";
import { useWorldBuildingStore } from "@renderer/features/research/stores/worldBuildingStore";

export interface CanvasGraphDataState {
  /** 현재 활성 프로젝트 id (없으면 null). */
  projectId: string | null;
  /** 로딩 진행 여부. */
  isLoading: boolean;
  /** 마지막 로드 에러 메시지(없으면 null). */
  error: string | null;
  /** 현재 프로젝트 기준으로 graphData 가 준비되었는지. */
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

    // 스토어 현재 스냅샷을 직접 조회해 stale closure 없이 판단한다.
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
