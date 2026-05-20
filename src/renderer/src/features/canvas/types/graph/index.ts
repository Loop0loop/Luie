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

export interface GraphRelationship {
  targetName: string;
  type: string;
  details?: string;
}

export type GraphNodeData = {
  label: string;
  type: "character" | "event" | "world-entity" | "faction" | "chapter";
  isFocused?: boolean;
  description?: string;
  relatedChapters?: string[];
  relationships?: GraphRelationship[];
  sourceTexts?: string[];
};

export type GraphEdgeData = {
  strength?: number;
  label?: string;
};
