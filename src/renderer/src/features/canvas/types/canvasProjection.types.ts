import type { WorldEntitySourceType } from "@shared/types";

export type CanvasNodeKind =
  | "chapter"
  | "character"
  | "event"
  | "faction"
  | "term"
  | "world-entity";

export interface CanvasProjectionNode {
  id: string;
  kind: CanvasNodeKind;
  label: string;
  x: number;
  y: number;
  description?: string | null;
}

export type CanvasEdgeStyle = "solid" | "dashed";

export interface CanvasProjectionEdge {
  id: string;
  sourceId: string;
  targetId: string;
  label?: string;
  style: CanvasEdgeStyle;
}

export interface CanvasProjection {
  nodes: CanvasProjectionNode[];
  edges: CanvasProjectionEdge[];
  sourceVersion: string;
}

export type CanvasProjectionStatus =
  | "idle"
  | "loading"
  | "ready"
  | "error";

export const ENTITY_TYPE_TO_NODE_KIND: Record<
  WorldEntitySourceType,
  CanvasNodeKind
> = {
  Character: "character",
  Faction: "faction",
  Event: "event",
  Term: "term",
  Place: "world-entity",
  Concept: "world-entity",
  Rule: "world-entity",
  Item: "world-entity",
  WorldEntity: "world-entity",
};
