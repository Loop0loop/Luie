import type { Edge, Node, XYPosition } from "reactflow";
import type { GraphNodeData } from "../types/graph";
import { calculateForceLayout } from "../utils/graphLayout";

export type GraphLayoutRequest = {
  requestId: number;
  nodes: Node<GraphNodeData>[];
  edges: Edge[];
  iterations: number;
  center: XYPosition;
};

export type GraphLayoutResult = {
  requestId: number;
  positions: Array<{ id: string; position: XYPosition }>;
};

export const calculateGraphLayoutResult = ({
  requestId,
  nodes,
  edges,
  iterations,
  center,
}: GraphLayoutRequest): GraphLayoutResult => ({
  requestId,
  positions: calculateForceLayout(nodes, edges, iterations, center).map((node) => ({
    id: node.id,
    position: node.position,
  })),
});
