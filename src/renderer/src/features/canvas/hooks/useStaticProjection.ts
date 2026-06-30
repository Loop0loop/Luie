/**
 * useStaticProjection — 정적 캔버스용 projection 훅.
 *
 * 동적 캔버스와 달리 scope 없이 프로젝트 전체 엔티티를 표시합니다.
 * worldBuildingStore 구독을 한 곳에서만 수행해 C3 이슈를 해결합니다.
 *
 * StaticCanvasViewport가 worldBuildingStore를 직접 구독하지 않도록
 * 이 훅을 통해 데이터를 받습니다.
 */
import { useMemo } from "react";
import { useWorldBuildingStore } from "@renderer/features/research/stores/worldBuildingStore";
import { useCanvasViewStore } from "../stores";
import { buildProjection } from "../utils/canvasProjectionAdapter";
import type { CanvasProjection } from "../types/canvasProjection.types";

// whole-project scope — projectId는 빈 문자열 (필터 없음, 전체 표시)
const WHOLE_PROJECT_SCOPE = { kind: "whole-project" as const, projectId: "" };

export function useStaticProjection(): CanvasProjection {
  const graphData = useWorldBuildingStore((state) => state.graphData);
  const focuses = useCanvasViewStore((state) => state.focuses);

  return useMemo(
    () => buildProjection(graphData, "flow-map", graphData ? WHOLE_PROJECT_SCOPE : null, focuses),
    [focuses, graphData],
  );
}
