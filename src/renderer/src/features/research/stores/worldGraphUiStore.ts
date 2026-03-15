import { create } from "zustand";
import type { RelationKind } from "@shared/types";

export type GraphIdeTab = "graph" | "timeline" | "note" | "entity" | "library";
export type GraphLayoutMode = "auto" | "cluster" | "reset";

export type GraphVisibilityFilter = {
  entityTypes: string[];
  relationKinds: RelationKind[];
  searchQuery: string;
};

export const DEFAULT_GRAPH_ENTITY_TYPES = [
  "Character",
  "Faction",
  "Event",
  "Term",
  "Place",
  "Concept",
  "Rule",
  "Item",
  "WorldEntity",
] as const;

export const DEFAULT_GRAPH_RELATION_KINDS = [
  "belongs_to",
  "enemy_of",
  "causes",
  "controls",
  "located_in",
  "violates",
] as const satisfies readonly RelationKind[];

export const DEFAULT_GRAPH_VISIBILITY_FILTER: GraphVisibilityFilter = {
  entityTypes: [...DEFAULT_GRAPH_ENTITY_TYPES],
  relationKinds: [...DEFAULT_GRAPH_RELATION_KINDS],
  searchQuery: "",
};

type GraphLayoutTrigger = {
  mode: GraphLayoutMode;
  version: number;
} | null;

type WorldGraphUiState = {
  activeTab: GraphIdeTab;
  noteSearchQuery: string;
  selectedNoteId: string | null;
  isSidebarOpen: boolean;
  layoutTrigger: GraphLayoutTrigger;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  visibilityFilter: GraphVisibilityFilter;
  hiddenNodeIds: string[];
  hiddenEdgeIds: string[];
  setActiveTab: (tab: GraphIdeTab) => void;
  setNoteSearchQuery: (query: string) => void;
  setSelectedNoteId: (id: string | null) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (isOpen: boolean) => void;
  triggerLayout: (mode: GraphLayoutMode) => void;
  selectNode: (nodeId: string | null) => void;
  selectEdge: (edgeId: string | null) => void;
  clearSelection: () => void;
  setVisibilityFilter: (filter: Partial<GraphVisibilityFilter>) => void;
  setGraphSearchQuery: (query: string) => void;
  toggleEntityTypeFilter: (entityType: string) => void;
  toggleRelationKindFilter: (relationKind: RelationKind) => void;
  resetVisibility: () => void;
  hideNode: (nodeId: string) => void;
  hideEdge: (edgeId: string) => void;
  showAllCanvasElements: () => void;
};

const dedupeIds = (values: string[]): string[] => Array.from(new Set(values));

export const useWorldGraphUiStore = create<WorldGraphUiState>((set) => ({
  activeTab: "graph",
  noteSearchQuery: "",
  selectedNoteId: null,
  isSidebarOpen: true,
  layoutTrigger: null,
  selectedNodeId: null,
  selectedEdgeId: null,
  visibilityFilter: DEFAULT_GRAPH_VISIBILITY_FILTER,
  hiddenNodeIds: [],
  hiddenEdgeIds: [],
  setActiveTab: (activeTab) => set({ activeTab, isSidebarOpen: true }),
  setNoteSearchQuery: (noteSearchQuery) => set({ noteSearchQuery }),
  setSelectedNoteId: (selectedNoteId) => set({ selectedNoteId }),
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSidebarOpen: (isSidebarOpen) => set({ isSidebarOpen }),
  triggerLayout: (mode) =>
    set((state) => ({
      layoutTrigger: {
        mode,
        version: (state.layoutTrigger?.version ?? 0) + 1,
      },
    })),
  selectNode: (selectedNodeId) => set({ selectedNodeId, selectedEdgeId: null }),
  selectEdge: (selectedEdgeId) => set({ selectedEdgeId, selectedNodeId: null }),
  clearSelection: () => set({ selectedNodeId: null, selectedEdgeId: null }),
  setVisibilityFilter: (filter) =>
    set((state) => ({
      visibilityFilter: {
        ...state.visibilityFilter,
        ...filter,
      },
    })),
  setGraphSearchQuery: (searchQuery) =>
    set((state) => ({
      visibilityFilter: {
        ...state.visibilityFilter,
        searchQuery,
      },
    })),
  toggleEntityTypeFilter: (entityType) =>
    set((state) => {
      const current = state.visibilityFilter.entityTypes;
      const entityTypes = current.includes(entityType)
        ? current.filter((value) => value !== entityType)
        : [...current, entityType];
      return {
        visibilityFilter: {
          ...state.visibilityFilter,
          entityTypes,
        },
      };
    }),
  toggleRelationKindFilter: (relationKind) =>
    set((state) => {
      const current = state.visibilityFilter.relationKinds;
      const relationKinds = current.includes(relationKind)
        ? current.filter((value) => value !== relationKind)
        : [...current, relationKind];
      return {
        visibilityFilter: {
          ...state.visibilityFilter,
          relationKinds,
        },
      };
    }),
  resetVisibility: () =>
    set({
      visibilityFilter: DEFAULT_GRAPH_VISIBILITY_FILTER,
      hiddenNodeIds: [],
      hiddenEdgeIds: [],
    }),
  hideNode: (nodeId) =>
    set((state) => ({
      hiddenNodeIds: dedupeIds([...state.hiddenNodeIds, nodeId]),
      selectedNodeId:
        state.selectedNodeId === nodeId ? null : state.selectedNodeId,
    })),
  hideEdge: (edgeId) =>
    set((state) => ({
      hiddenEdgeIds: dedupeIds([...state.hiddenEdgeIds, edgeId]),
      selectedEdgeId:
        state.selectedEdgeId === edgeId ? null : state.selectedEdgeId,
    })),
  showAllCanvasElements: () => set({ hiddenNodeIds: [], hiddenEdgeIds: [] }),
}));

export type { WorldGraphUiState };
