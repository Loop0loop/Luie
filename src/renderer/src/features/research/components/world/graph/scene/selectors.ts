import type { WorldGraphData } from "@shared/types";
import { filterGraphData } from "@renderer/features/research/stores/worldBuildingStore.graph";
import {
  buildEntityCatalogEntries,
  buildTimelineEntries,
  collectWorldGraphNodeTags,
} from "../utils/worldGraphIdeViewModels";
import type { GraphScene, GraphSelection, GraphVisibilityState } from "./types";

const EMPTY_GRAPH: WorldGraphData = { nodes: [], edges: [] };

export const createGraphSceneSelectors = (
  graphData: WorldGraphData | null,
  selection: GraphSelection,
  visibility: GraphVisibilityState,
): GraphScene => {
  const sourceGraph = graphData ?? EMPTY_GRAPH;
  const filteredGraph = filterGraphData(sourceGraph, {
    entityTypes: visibility.entityTypes,
    relationKinds: visibility.relationKinds,
    searchQuery: visibility.searchQuery,
    tags: [],
  });

  const visibleNodesBase = filteredGraph.nodes.filter(
    (node) => !visibility.hiddenNodeIds.has(node.id),
  );
  const visibleNodeIds = new Set(visibleNodesBase.map((node) => node.id));
  const visibleEdgesBase = filteredGraph.edges.filter(
    (edge) =>
      !visibility.hiddenEdgeIds.has(edge.id) &&
      visibleNodeIds.has(edge.sourceId) &&
      visibleNodeIds.has(edge.targetId),
  );
  const visibleEdgeIds = new Set(visibleEdgesBase.map((edge) => edge.id));

  const allNodes: GraphScene["allNodes"] = sourceGraph.nodes.map((node) => ({
    ...node,
    displayType: node.subType ?? node.entityType,
    tags: collectWorldGraphNodeTags(node),
    isSelected: selection.selectedNodeId === node.id,
    isVisible: visibleNodeIds.has(node.id),
  }));
  const allEdges: GraphScene["allEdges"] = sourceGraph.edges.map((edge) => ({
    ...edge,
    isSelected: selection.selectedEdgeId === edge.id,
    isVisible: visibleEdgeIds.has(edge.id),
  }));
  const nodeById = new Map(allNodes.map((node) => [node.id, node] as const));
  const edgeById = new Map(allEdges.map((edge) => [edge.id, edge] as const));
  const visibleNodes: GraphScene["visibleNodes"] = visibleNodesBase
    .map((node) => nodeById.get(node.id))
    .filter((node): node is NonNullable<typeof node> => node !== undefined);
  const visibleEdges: GraphScene["visibleEdges"] = visibleEdgesBase
    .map((edge) => edgeById.get(edge.id))
    .filter((edge): edge is NonNullable<typeof edge> => edge !== undefined);

  return {
    graphData: sourceGraph,
    allNodes,
    allEdges,
    visibleGraph: {
      nodes: visibleNodes,
      edges: visibleEdges,
    },
    visibleNodes,
    visibleEdges,
    nodeById,
    edgeById,
    selectedNode: selection.selectedNodeId
      ? nodeById.get(selection.selectedNodeId) ?? null
      : null,
    selectedEdge: selection.selectedEdgeId
      ? edgeById.get(selection.selectedEdgeId) ?? null
      : null,
    timelineEntries: buildTimelineEntries(sourceGraph.nodes, "").map((entry) => ({
      ...entry,
      isSelected: selection.selectedNodeId === entry.id,
    })),
    entityEntries: buildEntityCatalogEntries(sourceGraph.nodes, "").map((entry) => ({
      ...entry,
      isSelected: selection.selectedNodeId === entry.id,
    })),
    counts: {
      totalNodes: sourceGraph.nodes.length,
      visibleNodes: visibleNodes.length,
      totalEdges: sourceGraph.edges.length,
      visibleEdges: visibleEdges.length,
    },
  };
};
