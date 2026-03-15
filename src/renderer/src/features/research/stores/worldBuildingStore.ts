import { create } from "zustand";
import { createWorldBuildingActions } from "./worldBuildingStore.actions";
import {
  INITIAL_WORLD_BUILDING_STATE,
  type WorldBuildingState,
} from "./worldBuildingStore.types";

export type {
  CreateGraphNodeInput,
  UpdateGraphNodeInput,
  WorldBuildingState,
} from "./worldBuildingStore.types";

export const useWorldBuildingStore = create<WorldBuildingState>((set, get) => ({
  ...INITIAL_WORLD_BUILDING_STATE,
  ...createWorldBuildingActions(set, get),
}));
