import type { EdgeTypes, NodeTypes } from "reactflow";
import { CanvasGraphNodeCard } from "./CanvasGraphNodeCard";

export const CANVAS_NODE_TYPES: NodeTypes = Object.freeze({
  "obsidian-card": CanvasGraphNodeCard,
});

export const CANVAS_EDGE_TYPES: EdgeTypes = Object.freeze({});
