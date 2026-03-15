import type { EntityRelation, RelationKind, WorldGraphData, WorldGraphNode } from "@shared/types";
import type { EntityCatalogEntry, TimelineEntry } from "../utils/worldGraphIdeViewModels";

export type GraphSceneNode = WorldGraphNode & {
  displayType: string;
  tags: string[];
  isSelected: boolean;
  isVisible: boolean;
};

export type GraphSceneEdge = EntityRelation & {
  isSelected: boolean;
  isVisible: boolean;
};

export type GraphSelection = {
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
};

export type GraphVisibilityState = {
  entityTypes: string[];
  relationKinds: RelationKind[];
  searchQuery: string;
  hiddenNodeIds: Set<string>;
  hiddenEdgeIds: Set<string>;
};

export type TimelineEntryViewModel = TimelineEntry & {
  isSelected: boolean;
};

export type EntityCatalogEntryViewModel = EntityCatalogEntry & {
  isSelected: boolean;
};

export type GraphScene = {
  graphData: WorldGraphData;
  allNodes: GraphSceneNode[];
  allEdges: GraphSceneEdge[];
  visibleGraph: WorldGraphData;
  visibleNodes: GraphSceneNode[];
  visibleEdges: GraphSceneEdge[];
  nodeById: Map<string, GraphSceneNode>;
  edgeById: Map<string, GraphSceneEdge>;
  selectedNode: GraphSceneNode | null;
  selectedEdge: GraphSceneEdge | null;
  timelineEntries: TimelineEntryViewModel[];
  entityEntries: EntityCatalogEntryViewModel[];
  counts: {
    totalNodes: number;
    visibleNodes: number;
    totalEdges: number;
    visibleEdges: number;
  };
};
