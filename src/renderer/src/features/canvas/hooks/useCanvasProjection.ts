/**
 * useCanvasProjection — builds a CanvasProjection from the current
 * mode + scope using the renderer-side adapter (worldBuildingStore).
 *
 * Returns { projection, status } where status is:
 *   "idle"    — scope is null, nothing to show
 *   "loading" — graphData is being fetched
 *   "ready"   — projection is available
 *   "error"   — graphData load failed
 */
import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { useWorldBuildingStore } from "@renderer/features/research/stores/worldBuildingStore";
import { useCanvasViewStore } from "../stores";
import {
  buildProjection,
  type CanvasProjection,
  type CanvasProjectionStatus,
} from "../types";

export interface UseCanvasProjectionResult {
  projection: CanvasProjection | null;
  status: CanvasProjectionStatus;
}

export function useCanvasProjection(): UseCanvasProjectionResult {
  const { mode, scope } = useCanvasViewStore(
    useShallow((state) => ({
      mode: state.mode,
      scope: state.scope,
    })),
  );

  const { graphData, isLoading, error } = useWorldBuildingStore(
    useShallow((state) => ({
      graphData: state.graphData,
      isLoading: state.isLoading,
      error: state.error,
    })),
  );

  const projection = useMemo(
    () => buildProjection(graphData, mode, scope),
    [graphData, mode, scope],
  );

  const status: CanvasProjectionStatus = (() => {
    if (!scope) return "idle";
    if (isLoading) return "loading";
    if (error) return "error";
    return "ready";
  })();

  return { projection, status };
}
