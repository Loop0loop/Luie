import type { WorldBuildingState } from "../worldBuildingStore.types";

export type StoreSetter<T> = (
  partial: T | Partial<T> | ((state: T) => T | Partial<T>),
) => void;

export type StoreGetter<T> = () => T;

export type WorldBuildingActions = Pick<
  WorldBuildingState,
  | "loadGraph"
  | "createGraphNode"
  | "updateGraphNode"
  | "updateGraphNodePosition"
  | "updateGraphNodePositionsBatch"
  | "updateWorldEntityPosition"
  | "deleteGraphNode"
  | "createWorldEntity"
  | "updateWorldEntity"
  | "deleteWorldEntity"
  | "createRelation"
  | "updateRelation"
  | "deleteRelation"
  | "setGraphCanvasBlocks"
  | "setGraphCanvasEdges"
  | "setGraphCanvasFiles"
  | "setTimelines"
>;
