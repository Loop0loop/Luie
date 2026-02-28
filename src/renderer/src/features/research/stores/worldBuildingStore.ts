/**
 * useWorldBuildingStore
 * 세계관 그래프 데이터 + 4가지 뷰 모드 + 선택 상태를 관리하는 Zustand 스토어
 */

import { create } from "zustand";
import { useMemo } from "react";
import { api } from "@shared/api";
import {
  getDefaultRelationForPair,
  isRelationAllowed,
  isWorldEntityBackedType,
} from "@shared/constants/worldRelationRules";
import type {
  Character,
  EntityRelation,
  EntityRelationCreateInput,
  EntityRelationUpdateInput,
  Event,
  Faction,
  RelationKind,
  Term,
  WorldEntity,
  WorldEntityCreateInput,
  WorldEntityType,
  WorldEntityUpdateInput,
  WorldEntityUpdatePositionInput,
  WorldGraphData,
  WorldGraphNode,
  WorldEntitySourceType,
} from "@shared/types";

export type WorldViewMode = "standard" | "protagonist" | "event-chain" | "freeform";

export interface WorldFilter {
  entityTypes: string[];
  relationKinds: RelationKind[];
  searchQuery: string;
  tags: string[];
}

const DEFAULT_FILTER: WorldFilter = {
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
  relationKinds: ["belongs_to", "enemy_of", "causes", "controls", "located_in", "violates"],
  searchQuery: "",
  tags: [],
};

type CreateGraphNodeInput = {
  projectId: string;
  entityType: WorldEntitySourceType;
  name: string;
  description?: string;
  positionX?: number;
  positionY?: number;
  subType?: WorldEntityType;
};

type UpdateGraphNodeInput = {
  id: string;
  entityType: WorldEntitySourceType;
  name?: string;
  description?: string;
  attributes?: Record<string, unknown>;
  subType?: WorldEntityType;
};

const toCharacterNode = (item: Character): WorldGraphNode => ({
  id: item.id,
  entityType: "Character",
  name: item.name,
  description: item.description ?? null,
  firstAppearance: item.firstAppearance ?? null,
  attributes:
    typeof item.attributes === "string"
      ? null
      : (item.attributes as Record<string, unknown> | null) ?? null,
  positionX: 0,
  positionY: 0,
});

const toFactionNode = (item: Faction): WorldGraphNode => ({
  id: item.id,
  entityType: "Faction",
  name: item.name,
  description: item.description ?? null,
  firstAppearance: item.firstAppearance ?? null,
  attributes:
    typeof item.attributes === "string"
      ? null
      : (item.attributes as Record<string, unknown> | null) ?? null,
  positionX: 0,
  positionY: 0,
});

const toEventNode = (item: Event): WorldGraphNode => ({
  id: item.id,
  entityType: "Event",
  name: item.name,
  description: item.description ?? null,
  firstAppearance: item.firstAppearance ?? null,
  attributes:
    typeof item.attributes === "string"
      ? null
      : (item.attributes as Record<string, unknown> | null) ?? null,
  positionX: 0,
  positionY: 0,
});

const toTermNode = (item: Term): WorldGraphNode => ({
  id: item.id,
  entityType: "Term",
  name: item.term,
  description: item.definition ?? null,
  firstAppearance: item.firstAppearance ?? null,
  attributes: item.category ? { tags: [item.category] } : null,
  positionX: 0,
  positionY: 0,
});

const toWorldEntityNode = (item: WorldEntity): WorldGraphNode => {
  const type = (item.type ?? "Place") as WorldEntityType;
  return {
    id: item.id,
    entityType: type,
    subType: type,
    name: item.name,
    description: item.description ?? null,
    firstAppearance: item.firstAppearance ?? null,
    attributes:
      typeof item.attributes === "string"
        ? null
        : (item.attributes as Record<string, unknown> | null) ?? null,
    positionX: item.positionX ?? 0,
    positionY: item.positionY ?? 0,
  };
};

const resolveWorldEntityType = (
  entityType: WorldEntitySourceType,
  subType?: WorldEntityType,
): WorldEntityType => {
  if (entityType === "Place" || entityType === "Concept" || entityType === "Rule" || entityType === "Item") {
    return entityType;
  }
  return subType ?? "Concept";
};

const toRelationSourceType = (entityType: WorldEntitySourceType): WorldEntitySourceType => {
  return entityType;
};

interface WorldBuildingState {
  graphData: WorldGraphData | null;
  activeProjectId: string | null;
  isLoading: boolean;
  error: string | null;

  viewMode: WorldViewMode;
  filter: WorldFilter;

  selectedNodeId: string | null;
  selectedEdgeId: string | null;

  suggestedMode: WorldViewMode | null;

  loadGraph: (projectId: string) => Promise<void>;
  setViewMode: (mode: WorldViewMode) => void;
  setFilter: (filter: Partial<WorldFilter>) => void;
  resetFilter: () => void;
  selectNode: (nodeId: string | null) => void;
  selectEdge: (edgeId: string | null) => void;
  dismissSuggestion: () => void;

  createGraphNode: (input: CreateGraphNodeInput) => Promise<WorldGraphNode | null>;
  updateGraphNode: (input: UpdateGraphNodeInput) => Promise<void>;
  updateWorldEntityPosition: (input: WorldEntityUpdatePositionInput) => Promise<void>;
  deleteGraphNode: (id: string) => Promise<void>;

  // Backward compatible aliases
  createWorldEntity: (input: WorldEntityCreateInput) => Promise<WorldGraphNode | null>;
  updateWorldEntity: (input: WorldEntityUpdateInput) => Promise<void>;
  deleteWorldEntity: (id: string) => Promise<void>;

  createRelation: (input: EntityRelationCreateInput) => Promise<EntityRelation | null>;
  updateRelation: (input: EntityRelationUpdateInput) => Promise<boolean>;
  deleteRelation: (id: string) => Promise<boolean>;
}

export const useWorldBuildingStore = create<WorldBuildingState>((set, get) => ({
  graphData: null,
  activeProjectId: null,
  isLoading: false,
  error: null,
  viewMode: "standard",
  filter: DEFAULT_FILTER,
  selectedNodeId: null,
  selectedEdgeId: null,
  suggestedMode: null,

  loadGraph: async (projectId: string) => {
    set({ isLoading: true, error: null, activeProjectId: projectId });
    try {
      const res = await api.worldGraph.get(projectId);
      if (!res.success || !res.data) {
        throw new Error(res.error?.message ?? "Graph load failed");
      }

      set({
        graphData: res.data,
        isLoading: false,
        selectedNodeId: null,
        selectedEdgeId: null,
      });

      const eventCount = res.data.nodes.filter((node) => node.entityType === "Event").length;
      const total = res.data.nodes.length;
      if (total > 0 && eventCount / total >= 0.4 && get().viewMode === "standard") {
        set({ suggestedMode: "event-chain" });
      }
    } catch (error) {
      set({ error: String(error), isLoading: false });
    }
  },

  setViewMode: (mode) => {
    set((state) => {
      let nextFilter = { ...state.filter };
      if (mode === "event-chain") {
        // Event-chain focuses on Events and their causal connections,
        // but Character/Faction remain visible as they participate in events
        nextFilter.entityTypes = ["Event", "Character", "Faction", "Concept", "Place", "Rule", "Item", "WorldEntity"];
        nextFilter.relationKinds = ["causes", "located_in", "violates", "belongs_to", "controls"];
      } else {
        nextFilter = DEFAULT_FILTER;
      }
      return { viewMode: mode, suggestedMode: null, filter: nextFilter };
    });
  },

  setFilter: (partial) => set((state) => ({ filter: { ...state.filter, ...partial } })),
  resetFilter: () => set({ filter: DEFAULT_FILTER }),

  selectNode: (nodeId) => set({ selectedNodeId: nodeId, selectedEdgeId: null }),
  selectEdge: (edgeId) => set({ selectedEdgeId: edgeId, selectedNodeId: null }),
  dismissSuggestion: () => set({ suggestedMode: null }),

  createGraphNode: async (input) => {
    const projectId = input.projectId || get().activeProjectId;
    if (!projectId) return null;

    const name = input.name.trim() || "Untitled";
    let nextNode: WorldGraphNode | null = null;

    if (input.entityType === "Character") {
      const res = await api.character.create({ projectId, name, description: input.description });
      if (!res.success || !res.data) return null;
      nextNode = toCharacterNode(res.data);
    } else if (input.entityType === "Faction") {
      const res = await api.faction.create({ projectId, name, description: input.description });
      if (!res.success || !res.data) return null;
      nextNode = toFactionNode(res.data);
    } else if (input.entityType === "Event") {
      const res = await api.event.create({ projectId, name, description: input.description });
      if (!res.success || !res.data) return null;
      nextNode = toEventNode(res.data);
    } else if (input.entityType === "Term") {
      const res = await api.term.create({
        projectId,
        term: name,
        definition: input.description,
      });
      if (!res.success || !res.data) return null;
      nextNode = toTermNode(res.data);
    } else {
      const res = await api.worldEntity.create({
        projectId,
        type: resolveWorldEntityType(input.entityType, input.subType),
        name,
        description: input.description,
        positionX: input.positionX ?? 0,
        positionY: input.positionY ?? 0,
      });
      if (!res.success || !res.data) return null;
      nextNode = toWorldEntityNode(res.data);
    }

    set((state) => {
      const newNodes = state.graphData ? [...state.graphData.nodes, nextNode!] : [nextNode!];

      // Auto-suggestion heuristics
      let suggestedMode: WorldViewMode | null = state.suggestedMode;
      if (state.viewMode === "standard") {
        const charCount = newNodes.filter(n => n.entityType === "Character").length;
        const eventCount = newNodes.filter(n => n.entityType === "Event").length;
        const total = newNodes.length;
        if (total > 3) {
          if (eventCount / total >= 0.4) {
            suggestedMode = "event-chain";
          } else if (charCount / total >= 0.4) {
            suggestedMode = "protagonist";
          }
        }
      }

      return {
        graphData: state.graphData
          ? { ...state.graphData, nodes: newNodes }
          : { nodes: newNodes, edges: [] },
        selectedNodeId: nextNode?.id ?? null,
        selectedEdgeId: null,
        suggestedMode
      };
    });

    return nextNode;
  },

  updateGraphNode: async (input) => {
    const graphData = get().graphData;
    const current = graphData?.nodes.find((node) => node.id === input.id);
    if (!current) return;

    let updatedNode: WorldGraphNode | null = null;
    if (input.entityType === "Character") {
      const res = await api.character.update({
        id: input.id,
        name: input.name,
        description: input.description,
        attributes: input.attributes,
      });
      if (!res.success || !res.data) return;
      updatedNode = toCharacterNode(res.data);
    } else if (input.entityType === "Faction") {
      const res = await api.faction.update({
        id: input.id,
        name: input.name,
        description: input.description,
        attributes: input.attributes,
      });
      if (!res.success || !res.data) return;
      updatedNode = toFactionNode(res.data);
    } else if (input.entityType === "Event") {
      const res = await api.event.update({
        id: input.id,
        name: input.name,
        description: input.description,
        attributes: input.attributes,
      });
      if (!res.success || !res.data) return;
      updatedNode = toEventNode(res.data);
    } else if (input.entityType === "Term") {
      const res = await api.term.update({
        id: input.id,
        term: input.name,
        definition: input.description,
        category:
          Array.isArray(input.attributes?.tags) && input.attributes?.tags.length > 0
            ? String(input.attributes.tags[0])
            : undefined,
      });
      if (!res.success || !res.data) return;
      updatedNode = toTermNode(res.data);
    } else {
      const worldEntityType = resolveWorldEntityType(input.entityType, input.subType ?? current.subType);
      const res = await api.worldEntity.update({
        id: input.id,
        type: worldEntityType,
        name: input.name,
        description: input.description,
        attributes: input.attributes,
      });
      if (!res.success || !res.data) return;
      updatedNode = toWorldEntityNode(res.data);
    }

    set((state) => ({
      graphData: state.graphData
        ? {
          ...state.graphData,
          nodes: state.graphData.nodes.map((node) => (node.id === input.id ? updatedNode! : node)),
        }
        : null,
    }));
  },

  updateWorldEntityPosition: async (input) => {
    const current = get().graphData?.nodes.find((node) => node.id === input.id);
    if (!current) return;
    if (!isWorldEntityBackedType(current.entityType)) return;

    set((state) => ({
      graphData: state.graphData
        ? {
          ...state.graphData,
          nodes: state.graphData.nodes.map((node) =>
            node.id === input.id
              ? { ...node, positionX: input.positionX, positionY: input.positionY }
              : node,
          ),
        }
        : null,
    }));

    await api.worldEntity.updatePosition(input);
  },

  deleteGraphNode: async (id) => {
    const current = get().graphData?.nodes.find((node) => node.id === id);
    if (!current) return;

    if (current.entityType === "Character") {
      const res = await api.character.delete(id);
      if (!res.success) return;
    } else if (current.entityType === "Faction") {
      const res = await api.faction.delete(id);
      if (!res.success) return;
    } else if (current.entityType === "Event") {
      const res = await api.event.delete(id);
      if (!res.success) return;
    } else if (current.entityType === "Term") {
      const res = await api.term.delete(id);
      if (!res.success) return;
    } else {
      const res = await api.worldEntity.delete(id);
      if (!res.success) return;
    }

    set((state) => ({
      graphData: state.graphData
        ? {
          nodes: state.graphData.nodes.filter((node) => node.id !== id),
          edges: state.graphData.edges.filter((edge) => edge.sourceId !== id && edge.targetId !== id),
        }
        : null,
      selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
    }));
  },

  createWorldEntity: async (input) => {
    return get().createGraphNode({
      projectId: input.projectId,
      entityType: input.type,
      subType: input.type,
      name: input.name,
      description: input.description,
      positionX: input.positionX,
      positionY: input.positionY,
    });
  },

  updateWorldEntity: async (input) => {
    const current = get().graphData?.nodes.find((node) => node.id === input.id);
    if (!current) return;
    await get().updateGraphNode({
      id: input.id,
      entityType: current.entityType,
      subType: input.type ?? current.subType,
      name: input.name,
      description: input.description,
      attributes: input.attributes,
    });
  },

  deleteWorldEntity: async (id) => {
    await get().deleteGraphNode(id);
  },

  createRelation: async (input) => {
    const activeProjectId = get().activeProjectId;
    const resolvedProjectId = input.projectId || activeProjectId;
    if (!resolvedProjectId) return null;

    const sourceType = toRelationSourceType(input.sourceType);
    const targetType = toRelationSourceType(input.targetType);
    const relation =
      input.relation ?? getDefaultRelationForPair(sourceType, targetType) ?? "belongs_to";

    if (!isRelationAllowed(relation, sourceType, targetType)) {
      return null;
    }

    const res = await api.entityRelation.create({
      ...input,
      sourceType,
      targetType,
      relation,
      projectId: resolvedProjectId,
    });
    if (!res.success || !res.data) return null;

    set((state) => {
      if (!state.graphData) return state;
      const exists = state.graphData.edges.some((edge) => edge.id === res.data!.id);
      return exists
        ? state
        : {
          graphData: { ...state.graphData, edges: [...state.graphData.edges, res.data!] },
        };
    });
    return res.data;
  },

  updateRelation: async (input) => {
    const res = await api.entityRelation.update(input);
    if (!res.success || !res.data) return false;
    const updated = res.data;

    set((state) => ({
      graphData: state.graphData
        ? {
          ...state.graphData,
          edges: state.graphData.edges.map((edge) => (edge.id === input.id ? updated : edge)),
        }
        : null,
    }));
    return true;
  },

  deleteRelation: async (id) => {
    const res = await api.entityRelation.delete(id);
    if (!res.success) return false;

    set((state) => ({
      graphData: state.graphData
        ? {
          ...state.graphData,
          edges: state.graphData.edges.filter((edge) => edge.id !== id),
        }
        : null,
      selectedEdgeId: state.selectedEdgeId === id ? null : state.selectedEdgeId,
    }));
    return true;
  },
}));

export function useFilteredGraph() {
  const graphData = useWorldBuildingStore((state) => state.graphData);
  const filter = useWorldBuildingStore((state) => state.filter);

  return useMemo(() => {
    if (!graphData) {
      return { nodes: [], edges: [] };
    }

    const { searchQuery, entityTypes, relationKinds } = filter;
    const normalizedQuery = searchQuery.trim().toLowerCase();

    const nodes = graphData.nodes.filter((node) => {
      const displayType = node.subType ?? node.entityType;
      if (!entityTypes.includes(displayType)) return false;
      if (!normalizedQuery) return true;
      const nameMatch = node.name.toLowerCase().includes(normalizedQuery);
      const descriptionMatch = (node.description ?? "").toLowerCase().includes(normalizedQuery);
      return nameMatch || descriptionMatch;
    });

    const nodeIds = new Set(nodes.map((node) => node.id));
    const edges = graphData.edges.filter(
      (edge) =>
        relationKinds.includes(edge.relation) &&
        nodeIds.has(edge.sourceId) &&
        nodeIds.has(edge.targetId),
    );

    return { nodes, edges };
  }, [filter, graphData]);
}
