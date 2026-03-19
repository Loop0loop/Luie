import { create } from "zustand";
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from "zustand/middleware";
import type { RelationKind } from "@shared/types";

export type GraphIdeTab =
  | "canvas"
  | "timeline"
  | "notes"
  | "entity"
  | "library";

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

type WorldGraphUiState = {
  activeTab: GraphIdeTab;
  noteSearchQuery: string;
  selectedNoteId: string | null;
  selectedTimelineId: string | null;
  isSidebarOpen: boolean;
  sidebarWidth: number;
  autoLayoutTrigger: number;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  visibilityFilter: GraphVisibilityFilter;
  hiddenNodeIds: string[];
  hiddenEdgeIds: string[];
  setActiveTab: (tab: GraphIdeTab) => void;
  setNoteSearchQuery: (query: string) => void;
  setSelectedNoteId: (id: string | null) => void;
  setSelectedTimelineId: (id: string | null) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (isOpen: boolean) => void;
  setSidebarWidth: (width: number) => void;
  triggerAutoLayout: () => void;
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
  resetSessionSelection: () => void;
};

const WORLD_GRAPH_UI_STORAGE_KEY = "worldGraph_ui";
const DEFAULT_SIDEBAR_WIDTH = 320;
const MIN_SIDEBAR_WIDTH = 220;
const MAX_SIDEBAR_WIDTH = 520;

const clampSidebarWidth = (width: number): number =>
  Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, Math.round(width)));

const createNoopStorage = (): StateStorage => ({
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
});

const dedupeIds = (values: string[]): string[] => Array.from(new Set(values));

export const useWorldGraphUiStore = create<WorldGraphUiState>()(
  persist(
    (set) => ({
      activeTab: "canvas",
      noteSearchQuery: "",
      selectedNoteId: null,
      selectedTimelineId: null,
      isSidebarOpen: true,
      sidebarWidth: DEFAULT_SIDEBAR_WIDTH,
      autoLayoutTrigger: 0,
      selectedNodeId: null,
      selectedEdgeId: null,
      visibilityFilter: DEFAULT_GRAPH_VISIBILITY_FILTER,
      hiddenNodeIds: [],
      hiddenEdgeIds: [],
      setActiveTab: (activeTab) => set({ activeTab, isSidebarOpen: true }),
      setNoteSearchQuery: (noteSearchQuery) => set({ noteSearchQuery }),
      setSelectedNoteId: (selectedNoteId) => set({ selectedNoteId }),
      setSelectedTimelineId: (selectedTimelineId) =>
        set({ selectedTimelineId }),
      toggleSidebar: () =>
        set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
      setSidebarOpen: (isSidebarOpen) => set({ isSidebarOpen }),
      setSidebarWidth: (sidebarWidth) =>
        set({ sidebarWidth: clampSidebarWidth(sidebarWidth) }),
      triggerAutoLayout: () =>
        set((state) => ({ autoLayoutTrigger: state.autoLayoutTrigger + 1 })),
      selectNode: (selectedNodeId) =>
        set({ selectedNodeId, selectedEdgeId: null }),
      selectEdge: (selectedEdgeId) =>
        set({ selectedEdgeId, selectedNodeId: null }),
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
      showAllCanvasElements: () =>
        set({ hiddenNodeIds: [], hiddenEdgeIds: [] }),
      resetSessionSelection: () =>
        set({
          selectedNodeId: null,
          selectedEdgeId: null,
          selectedNoteId: null,
          selectedTimelineId: null,
        }),
    }),
    {
      name: WORLD_GRAPH_UI_STORAGE_KEY,
      storage: createJSONStorage(() =>
        typeof localStorage === "undefined"
          ? createNoopStorage()
          : localStorage,
      ),
      partialize: (state) => ({
        activeTab: state.activeTab,
        isSidebarOpen: state.isSidebarOpen,
        sidebarWidth: state.sidebarWidth,
        selectedNodeId: state.selectedNodeId,
        selectedTimelineId: state.selectedTimelineId,
        selectedNoteId: state.selectedNoteId,
      }),
    },
  ),
);

export type { WorldGraphUiState };
