import type { EdgeTypes, NodeTypes } from "reactflow";
import { CanvasGraphNodeCard } from "./CanvasGraphNodeCard";
import { CanvasGraphEdge } from "./CanvasGraphEdge";
import { CanvasTimelineBlockNode } from "./CanvasTimelineBlockNode";
import { CanvasMemoBlockNode } from "./CanvasMemoBlockNode";
import { CustomEntityNode } from "./CustomEntityNode";

export const CANVAS_NODE_TYPES: NodeTypes = Object.freeze({
  "obsidian-card": CanvasGraphNodeCard,
  "canvas-timeline": CanvasTimelineBlockNode,
  "canvas-memo": CanvasMemoBlockNode,
  "custom-entity": CustomEntityNode,
});

export const CANVAS_EDGE_TYPES: EdgeTypes = Object.freeze({
  "canvas-edge": CanvasGraphEdge,
});
