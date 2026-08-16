/** worldBuildingStore 구독을 한 곳에 모아 project 전체의 static projection을 만든다. */
import { useMemo } from "react";
import { useWorldBuildingStore } from "@renderer/features/research/stores/worldBuildingStore";
import { useCanvasViewStore } from "../stores";
import { buildProjection } from "../utils/canvasProjectionAdapter";
import type { CanvasProjection } from "../types/canvasProjection.types";

const WHOLE_PROJECT_SCOPE = { kind: "whole-project" as const, projectId: "" };

export function useStaticProjection(): CanvasProjection {
  const graphData = useWorldBuildingStore((state) => state.graphData);
  const focuses = useCanvasViewStore((state) => state.focuses);

  return useMemo(
    () => buildProjection(graphData, "flow-map", graphData ? WHOLE_PROJECT_SCOPE : null, focuses),
    [focuses, graphData],
  );
}
