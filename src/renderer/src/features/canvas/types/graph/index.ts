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
  starGrade?: "prime" | "major" | "minor";
  /** 필터 드롭다운이 만든 기본 투명도. canvas focus 투명도는 여기에 곱해진다. */
  baseOpacity?: number;
  opacity?: number;
  isInteractive?: boolean;
}
