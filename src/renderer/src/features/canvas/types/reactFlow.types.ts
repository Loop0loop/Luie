import type { CanvasNodeKind } from "./canvasProjection.types";
import type {
  WorldGraphCanvasEdgeDirection,
} from "@shared/types";

export interface RFEntityNodeData {
  readonly rawId?: string;
  readonly kind: CanvasNodeKind;
  readonly label: string;
  readonly description?: string | null;
  readonly connectionCount: number;
  readonly isSelected: boolean;
  readonly color?: string;
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
  readonly rawId?: string;
  readonly label: string;
  readonly color?: string;
  readonly direction: WorldGraphCanvasEdgeDirection;
}

export interface RFCanvasEdgeData {
  readonly label: string;
  readonly color?: string;
  readonly direction: WorldGraphCanvasEdgeDirection;
}
