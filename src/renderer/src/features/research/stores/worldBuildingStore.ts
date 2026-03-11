import { create } from "zustand";
import { useMemo } from "react";
import { createWorldBuildingActions } from "./worldBuildingStore.actions";
import { filterGraphData } from "./worldBuildingStore.graph";
import {
  INITIAL_WORLD_BUILDING_STATE,
  type WorldBuildingState,
} from "./worldBuildingStore.types";

export type {
  CreateGraphNodeInput,
  UpdateGraphNodeInput,
  WorldBuildingState,
  WorldFilter,
  WorldViewMode,
} from "./worldBuildingStore.types";

export const useWorldBuildingStore = create<WorldBuildingState>((set, get) => ({
  ...INITIAL_WORLD_BUILDING_STATE,
  ...createWorldBuildingActions(set, get),
}));

export function useFilteredGraph() {
  const graphData = useWorldBuildingStore((state) => state.graphData);
  const filter = useWorldBuildingStore((state) => state.filter);

  return useMemo(() => filterGraphData(graphData, filter), [filter, graphData]);
}
