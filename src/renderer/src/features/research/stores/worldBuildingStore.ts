/**
 * useWorldBuildingStore
 * 세계관 그래프 데이터 + 4가지 뷰 모드 + 선택 상태를 관리하는 Zustand 스토어
 */

import { create } from "zustand";
import { useMemo } from "react";
import { api } from "@shared/api";
import type {
    WorldGraphData,
    WorldGraphNode,
    EntityRelation,
    WorldEntityCreateInput,
    WorldEntityUpdateInput,
    WorldEntityUpdatePositionInput,
    EntityRelationCreateInput,
    EntityRelationUpdateInput,
    RelationKind,
} from "@shared/types";

// ─── 뷰 모드 ────────────────────────────────────────────────────────────────

export type WorldViewMode = "standard" | "protagonist" | "event-chain" | "freeform";

// ─── 필터 상태 ───────────────────────────────────────────────────────────────

export interface WorldFilter {
    entityTypes: string[];
    relationKinds: RelationKind[];
    searchQuery: string;
    tags: string[];
}

const DEFAULT_FILTER: WorldFilter = {
    entityTypes: ["Character", "Faction", "Event", "Term", "Place", "Concept", "Rule", "Item", "WorldEntity"],
    relationKinds: ["belongs_to", "enemy_of", "causes", "controls", "located_in", "violates"],
    searchQuery: "",
    tags: [],
};

// ─── 스토어 인터페이스 ────────────────────────────────────────────────────────

interface WorldBuildingState {
    // 데이터
    graphData: WorldGraphData | null;
    activeProjectId: string | null;
    isLoading: boolean;
    error: string | null;

    // 뷰 모드
    viewMode: WorldViewMode;
    filter: WorldFilter;

    // 선택 상태
    selectedNodeId: string | null;
    selectedEdgeId: string | null;

    // 시스템 제안
    suggestedMode: WorldViewMode | null;

    // 액션
    loadGraph: (projectId: string) => Promise<void>;
    setViewMode: (mode: WorldViewMode) => void;
    setFilter: (filter: Partial<WorldFilter>) => void;
    resetFilter: () => void;
    selectNode: (nodeId: string | null) => void;
    selectEdge: (edgeId: string | null) => void;
    dismissSuggestion: () => void;

    // WorldEntity CRUD
    createWorldEntity: (input: WorldEntityCreateInput) => Promise<WorldGraphNode | null>;
    updateWorldEntity: (input: WorldEntityUpdateInput) => Promise<void>;
    updateWorldEntityPosition: (input: WorldEntityUpdatePositionInput) => Promise<void>;
    deleteWorldEntity: (id: string) => Promise<void>;

    // EntityRelation CRUD
    createRelation: (input: EntityRelationCreateInput) => Promise<EntityRelation | null>;
    updateRelation: (input: EntityRelationUpdateInput) => Promise<void>;
    deleteRelation: (id: string) => Promise<void>;
}

// ─── 스토어 생성 ──────────────────────────────────────────────────────────────

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

    // ─── 데이터 로드 ────
    loadGraph: async (projectId: string) => {
        set({ isLoading: true, error: null, activeProjectId: projectId });
        try {
            const res = await api.worldGraph.get(projectId);
            if (!res.success || !res.data) {
                throw new Error(res.error?.message ?? "Graph load failed");
            }
            set({ graphData: res.data, isLoading: false });

            // 자동 모드 제안: 사건이 많으면 event-chain 제안
            const eventCount = res.data.nodes.filter((n) => n.entityType === "Event").length;
            const total = res.data.nodes.length;
            if (total > 0 && eventCount / total >= 0.4 && get().viewMode === "standard") {
                set({ suggestedMode: "event-chain" });
            }
        } catch (e) {
            set({ error: String(e), isLoading: false });
        }
    },

    // ─── 뷰 모드 ───────
    setViewMode: (mode) => set({ viewMode: mode, suggestedMode: null }),
    setFilter: (partial) =>
        set((s) => ({ filter: { ...s.filter, ...partial } })),
    resetFilter: () => set({ filter: DEFAULT_FILTER }),

    // ─── 선택 ──────────
    selectNode: (nodeId) => set({ selectedNodeId: nodeId, selectedEdgeId: null }),
    selectEdge: (edgeId) => set({ selectedEdgeId: edgeId, selectedNodeId: null }),

    // ─── 제안 해제 ──────
    dismissSuggestion: () => set({ suggestedMode: null }),

    // ─── WorldEntity CRUD ────

    createWorldEntity: async (input) => {
        const res = await api.worldEntity.create(input);
        if (!res.success || !res.data) return null;
        const newNode: WorldGraphNode = {
            id: res.data.id,
            entityType: "WorldEntity",
            subType: res.data.type,
            name: res.data.name,
            description: res.data.description,
            firstAppearance: res.data.firstAppearance,
            attributes: typeof res.data.attributes === "string"
                ? null
                : res.data.attributes ?? null,
            positionX: res.data.positionX,
            positionY: res.data.positionY,
        };
        set((s) => ({
            graphData: s.graphData
                ? { ...s.graphData, nodes: [...s.graphData.nodes, newNode] }
                : { nodes: [newNode], edges: [] },
        }));
        return newNode;
    },

    updateWorldEntity: async (input) => {
        const res = await api.worldEntity.update(input);
        if (!res.success || !res.data) return;
        const updated = res.data;
        set((s) => ({
            graphData: s.graphData
                ? {
                    ...s.graphData,
                    nodes: s.graphData.nodes.map((n) =>
                        n.id === input.id
                            ? {
                                ...n,
                                name: updated.name,
                                description: updated.description,
                                subType: updated.type,
                                attributes: typeof updated.attributes === "string"
                                    ? null
                                    : updated.attributes ?? null,
                            }
                            : n,
                    ),
                }
                : null,
        }));
    },

    updateWorldEntityPosition: async (input) => {
        // 낙관적 업데이트
        set((s) => ({
            graphData: s.graphData
                ? {
                    ...s.graphData,
                    nodes: s.graphData.nodes.map((n) =>
                        n.id === input.id
                            ? { ...n, positionX: input.positionX, positionY: input.positionY }
                            : n,
                    ),
                }
                : null,
        }));
        await api.worldEntity.updatePosition(input);
    },

    deleteWorldEntity: async (id) => {
        const res = await api.worldEntity.delete(id);
        if (!res.success) return;
        set((s) => ({
            graphData: s.graphData
                ? {
                    nodes: s.graphData.nodes.filter((n) => n.id !== id),
                    edges: s.graphData.edges.filter(
                        (e) => e.sourceId !== id && e.targetId !== id,
                    ),
                }
                : null,
            selectedNodeId: s.selectedNodeId === id ? null : s.selectedNodeId,
        }));
    },

    // ─── EntityRelation CRUD ────

    createRelation: async (input) => {
        const activeProjectId = get().activeProjectId;
        const resolvedProjectId = input.projectId || activeProjectId;
        if (!resolvedProjectId) {
            return null;
        }
        const res = await api.entityRelation.create({
            ...input,
            projectId: resolvedProjectId,
        });
        if (!res.success || !res.data) return null;
        set((s) => ({
            graphData: s.graphData
                ? { ...s.graphData, edges: [...s.graphData.edges, res.data!] }
                : null,
        }));
        return res.data;
    },

    updateRelation: async (input) => {
        const res = await api.entityRelation.update(input);
        if (!res.success || !res.data) return;
        const updated = res.data;
        set((s) => ({
            graphData: s.graphData
                ? {
                    ...s.graphData,
                    edges: s.graphData.edges.map((e) => (e.id === input.id ? updated : e)),
                }
                : null,
        }));
    },

    deleteRelation: async (id) => {
        const res = await api.entityRelation.delete(id);
        if (!res.success) return;
        set((s) => ({
            graphData: s.graphData
                ? { ...s.graphData, edges: s.graphData.edges.filter((e) => e.id !== id) }
                : null,
            selectedEdgeId: s.selectedEdgeId === id ? null : s.selectedEdgeId,
        }));
    },
}));

// ─── 셀렉터: 현재 필터 적용된 그래프 ──────────────────────────────────────────

export function useFilteredGraph() {
    const graphData = useWorldBuildingStore((s) => s.graphData);
    const filter = useWorldBuildingStore((s) => s.filter);

    return useMemo(() => {
        if (!graphData) {
            return { nodes: [], edges: [] };
        }
        const { searchQuery, entityTypes, relationKinds } = filter;

        const nodes = graphData.nodes.filter((node) => {
            const displayType = node.subType ?? node.entityType;
            if (!entityTypes.includes(displayType)) return false;
            if (
                searchQuery &&
                !node.name.toLowerCase().includes(searchQuery.toLowerCase())
            ) {
                return false;
            }
            return true;
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
