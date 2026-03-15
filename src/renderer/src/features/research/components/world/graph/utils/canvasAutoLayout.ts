import dagre from "dagre";
import type { EntityRelation, WorldGraphNode } from "@shared/types";

const NODE_WIDTH = 240;
const NODE_HEIGHT = 150;

export function buildCanvasAutoLayout(
  nodes: WorldGraphNode[],
  edges: EntityRelation[],
): Array<{ id: string; positionX: number; positionY: number }> {
  const graph = new dagre.graphlib.Graph();
  graph.setGraph({
    rankdir: "LR",
    ranksep: 150,
    nodesep: 72,
    marginx: 80,
    marginy: 80,
  });
  graph.setDefaultEdgeLabel(() => ({}));

  nodes.forEach((node) => {
    graph.setNode(node.id, {
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    });
  });

  edges.forEach((edge) => {
    if (graph.hasNode(edge.sourceId) && graph.hasNode(edge.targetId)) {
      graph.setEdge(edge.sourceId, edge.targetId);
    }
  });

  dagre.layout(graph);

  return nodes.map((node, index) => {
    const positioned = graph.node(node.id);
    if (!positioned) {
      return {
        id: node.id,
        positionX: 120 + (index % 4) * 280,
        positionY: 120 + Math.floor(index / 4) * 220,
      };
    }
    return {
      id: node.id,
      positionX: Math.round(positioned.x - NODE_WIDTH / 2),
      positionY: Math.round(positioned.y - NODE_HEIGHT / 2),
    };
  });
}
