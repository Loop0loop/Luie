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
  WorldGraphData,
  WorldGraphNode,
} from "@shared/types";

export type WorldViewMode =
  | "standard"
  | "protagonist"
  | "event-chain"
  | "freeform";

export interface WorldFilter {
  entityTypes: string[];
  relationKinds: RelationKind[];
  searchQuery: string;
  tags: string[];
}

export const DEFAULT_FILTER: WorldFilter = {
  entityTypes: [
    "Character",
    "Faction",
    "Event",
    "Term",
    "Place",
    "Concept",
    "Rule",
    "Item",
    "WorldEntity",
  ],
  relationKinds: [
    "belongs_to",
    "enemy_of",
    "causes",
    "controls",
    "located_in",
    "violates",
  ],
  searchQuery: "",
  tags: [],
};

export type CreateGraphNodeInput = {
  projectId: string;
  entityType: WorldEntitySourceType;
  name: string;
  description?: string;
  positionX?: number;
  positionY?: number;
  subType?: WorldEntityType;
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
  viewMode: WorldViewMode;
  filter: WorldFilter;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  suggestedMode: WorldViewMode | null;
  isTimelineOpen: boolean;
  isMapOpen: boolean;
  loadGraph: (projectId: string) => Promise<void>;
  setViewMode: (mode: WorldViewMode) => void;
  setFilter: (filter: Partial<WorldFilter>) => void;
  resetFilter: () => void;
  selectNode: (nodeId: string | null) => void;
  selectEdge: (edgeId: string | null) => void;
  dismissSuggestion: () => void;
  toggleTimeline: () => void;
  toggleMap: () => void;
  createGraphNode: (input: CreateGraphNodeInput) => Promise<WorldGraphNode | null>;
  updateGraphNode: (input: UpdateGraphNodeInput) => Promise<void>;
  updateWorldEntityPosition: (input: WorldEntityUpdatePositionInput) => Promise<void>;
  deleteGraphNode: (id: string) => Promise<void>;
  createWorldEntity: (input: WorldEntityCreateInput) => Promise<WorldGraphNode | null>;
  updateWorldEntity: (input: WorldEntityUpdateInput) => Promise<void>;
  deleteWorldEntity: (id: string) => Promise<void>;
  createRelation: (input: EntityRelationCreateInput) => Promise<EntityRelation | null>;
  updateRelation: (input: EntityRelationUpdateInput) => Promise<boolean>;
  deleteRelation: (id: string) => Promise<boolean>;
}

export const INITIAL_WORLD_BUILDING_STATE = {
  graphData: null,
  activeProjectId: null,
  isLoading: false,
  error: null,
  viewMode: "standard",
  filter: DEFAULT_FILTER,
  selectedNodeId: null,
  selectedEdgeId: null,
  suggestedMode: null,
  isTimelineOpen: false,
  isMapOpen: false,
} satisfies Pick<
  WorldBuildingState,
  | "graphData"
  | "activeProjectId"
  | "isLoading"
  | "error"
  | "viewMode"
  | "filter"
  | "selectedNodeId"
  | "selectedEdgeId"
  | "suggestedMode"
  | "isTimelineOpen"
  | "isMapOpen"
>;
