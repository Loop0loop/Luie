export type GraphMode = "episode" | "character" | "event" | "world";
export type GraphDepth = number;

export type GraphNodeType = "character" | "faction" | "world-entity" | "event" | "chapter";

export interface GraphRelationship {
  targetName: string;
  type: string;
  details: string;
}

export interface GraphNodeData {
  label: string;
  type: GraphNodeType;
  description: string;
  relatedChapters: string[];
  relationships?: GraphRelationship[];
  sourceTexts?: string[];
  isFocused?: boolean;
}
