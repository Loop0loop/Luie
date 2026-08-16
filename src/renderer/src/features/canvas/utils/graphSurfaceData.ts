import type { Edge, Node } from "reactflow";
import type { WorldGraphData } from "@shared/types";
import type { GraphNodeData, GraphNodeType } from "../types/graph";

export interface GraphSurfaceData {
  sourceNodes: Node<GraphNodeData>[];
  sourceEdges: Edge[];
}

const toGraphNodeType = (entityType: string): GraphNodeType => {
  if (entityType === "Character") return "character";
  if (entityType === "Faction") return "faction";
  if (entityType === "Event" || entityType === "Scene") return "event";
  if (entityType === "Chapter") return "chapter";
  return "world-entity";
};

/** graphData가 없으면 mock 대신 빈 node/edge 배열을 반환한다. */
export function buildGraphSurfaceData(
  graphData: WorldGraphData | null,
): GraphSurfaceData {
  if (!graphData?.nodes.length) {
    return { sourceNodes: [], sourceEdges: [] };
  }

  const nodeNameById = new Map(graphData.nodes.map((node) => [node.id, node.name]));
  const relationshipsByNodeId = new Map<string, NonNullable<GraphNodeData["relationships"]>>();
  for (const edge of graphData.edges) {
    const sourceRelationships = relationshipsByNodeId.get(edge.sourceId) ?? [];
    sourceRelationships.push({
      targetName: nodeNameById.get(edge.targetId) ?? edge.targetId,
      type: edge.relation,
      details: edge.relation,
    });
    relationshipsByNodeId.set(edge.sourceId, sourceRelationships);
  }

  return {
    sourceNodes: graphData.nodes.map((node): Node<GraphNodeData> => ({
      id: node.id,
      type: "pensive",
      position: {
        x: Number.isFinite(node.positionX) ? node.positionX : 0,
        y: Number.isFinite(node.positionY) ? node.positionY : 0,
      },
      data: {
        label: node.name,
        type: toGraphNodeType(node.entityType),
        description: node.description ?? "",
        relatedChapters: [],
        relationships: relationshipsByNodeId.get(node.id) ?? [],
        sourceTexts: [],
      },
    })),
    sourceEdges: graphData.edges.map((edge): Edge => ({
      id: edge.id,
      source: edge.sourceId,
      target: edge.targetId,
      data: {
        label: edge.relation,
        strength: 1,
      },
    })),
  };
}
