import type { CanvasNodeKind } from "./canvasProjection.types";
import type {
  WorldGraphCanvasEdgeDirection,
} from "@shared/types";

export interface RFEntityNodeData {
  readonly kind: CanvasNodeKind;
  readonly label: string;
  readonly description?: string | null;
  readonly connectionCount: number;
  readonly isSelected: boolean;
}

export interface RFMemoNodeData {
  readonly title: string;
  readonly body: string;
  readonly tags: readonly string[];
  readonly color?: string;
}

export interface RFTimelineNodeData {
  readonly content: string;
  readonly isHeld: boolean;
  readonly color?: string;
}

export interface RFRelationEdgeData {
  readonly label: string;
  readonly color?: string;
  readonly direction: WorldGraphCanvasEdgeDirection;
}

export interface RFCanvasEdgeData {
  readonly label: string;
  readonly color?: string;
  readonly direction: WorldGraphCanvasEdgeDirection;
}
