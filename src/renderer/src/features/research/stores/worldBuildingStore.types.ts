import type {
  EntityRelation,
  EntityRelationCreateInput,
  EntityRelationUpdateInput,
  RelationKind,
  WorldEntityCreateInput,
  WorldEntitySourceType,
  WorldEntityType,
  WorldEntityUpdateInput,
  WorldEntityUpdatePositionInput,
  WorldGraphCanvasBlock,
  WorldGraphCanvasEdge,
  WorldGraphData,
  WorldGraphNode,
} from "@shared/types";

export interface WorldFilter {
  entityTypes: string[];
  relationKinds: RelationKind[];
  searchQuery: string;
  tags: string[];
}

export type CreateGraphNodeInput = {
  projectId: string;
  entityType: WorldEntitySourceType;
  name: string;
  description?: string;
  positionX?: number;
  positionY?: number;
  subType?: WorldEntityType;
  attributes?: Record<string, unknown>;
};

export type UpdateGraphNodeInput = {
  id: string;
  entityType: WorldEntitySourceType;
  name?: string;
  description?: string;
  attributes?: Record<string, unknown>;
  subType?: WorldEntityType;
};

export interface WorldBuildingState {
  graphData: WorldGraphData | null;
  activeProjectId: string | null;
  isLoading: boolean;
  error: string | null;
  loadGraph: (projectId: string) => Promise<void>;

  createGraphNode: (
    input: CreateGraphNodeInput,
  ) => Promise<WorldGraphNode | null>;
  updateGraphNode: (input: UpdateGraphNodeInput) => Promise<void>;
  updateGraphNodePosition: (
    input: WorldEntityUpdatePositionInput,
  ) => Promise<void>;
  updateGraphNodePositionsBatch: (
    inputs: WorldEntityUpdatePositionInput[],
  ) => Promise<void>;
  updateWorldEntityPosition: (
    input: WorldEntityUpdatePositionInput,
  ) => Promise<void>;
  deleteGraphNode: (id: string) => Promise<boolean>;
  createWorldEntity: (
    input: WorldEntityCreateInput,
  ) => Promise<WorldGraphNode | null>;
  updateWorldEntity: (input: WorldEntityUpdateInput) => Promise<void>;
  deleteWorldEntity: (id: string) => Promise<boolean>;
  createRelation: (
    input: EntityRelationCreateInput,
  ) => Promise<EntityRelation | null>;
  updateRelation: (input: EntityRelationUpdateInput) => Promise<boolean>;
  deleteRelation: (id: string) => Promise<boolean>;
  setGraphCanvasBlocks: (blocks: WorldGraphCanvasBlock[]) => Promise<void>;
  setGraphCanvasEdges: (edges: WorldGraphCanvasEdge[]) => Promise<void>;
}

export const INITIAL_WORLD_BUILDING_STATE = {
  graphData: null,
  activeProjectId: null,
  isLoading: false,
  error: null,
} satisfies Pick<
  WorldBuildingState,
  "graphData" | "activeProjectId" | "isLoading" | "error"
>;
