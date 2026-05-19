/**
 * Narrative Graph Types
 */

export type GraphMode = "episode" | "character" | "event" | "world";
export type GraphDepth = 1 | 2 | 3;

export interface GraphFilterState {
  mode: GraphMode;
  depth: GraphDepth;
  // TODO: Add focusId, scopeId etc.
}

export type GraphNodeData = {
  label: string;
  type: "character" | "event" | "location" | "faction" | "chapter";
  isFocused?: boolean;
};

export type GraphEdgeData = {
  strength?: number;
  label?: string;
};
