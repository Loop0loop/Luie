import { api } from "@shared/api";
import type {
  EntityRelationCreateInput,
  EntityRelationUpdateInput,
  WorldEntityCreateInput,
  WorldEntityUpdateInput,
  WorldEntityUpdatePositionInput,
} from "@shared/types";
import {
  appendNodeToGraph,
  appendRelationToGraph,
  getResolvedRelationKind,
  isValidRelationForPair,
  isWorldEntityBackedType,
  removeNodeFromGraph,
  removeRelationFromGraph,
  replaceNodeInGraph,
  replaceRelationInGraph,
  toRelationSourceType,
  updateNodePositionInGraph,
} from "./worldBuildingStore.graph";
import {
  createGraphNodeFromInput,
  deleteGraphNodeByType,
  updateGraphNodeFromInput,
} from "./worldBuildingStore.mutations";
import type {
  UpdateGraphNodeInput,
  WorldBuildingState,
} from "./worldBuildingStore.types";
import { DEFAULT_FILTER } from "./worldBuildingStore.types";

type StoreSetter<T> = (
  partial: T | Partial<T> | ((state: T) => T | Partial<T>),
) => void;
type StoreGetter<T> = () => T;

type WorldBuildingActions = Pick<
  WorldBuildingState,
  | "loadGraph"
  | "setMainView"
  | "setFilter"
  | "resetFilter"
  | "selectNode"
  | "selectEdge"
  | "createGraphNode"
  | "updateGraphNode"
  | "updateWorldEntityPosition"
  | "deleteGraphNode"
  | "createWorldEntity"
  | "updateWorldEntity"
  | "deleteWorldEntity"
  | "createRelation"
  | "updateRelation"
  | "deleteRelation"
>;

function updateGraphNodeSelection(input: UpdateGraphNodeInput) {
  return (state: WorldBuildingState) => {
    const current = state.graphData?.nodes.find((node) => node.id === input.id);
    return current ?? null;
  };
}

export function createWorldBuildingActions(
  set: StoreSetter<WorldBuildingState>,
  get: StoreGetter<WorldBuildingState>,
): WorldBuildingActions {
  return {
    loadGraph: async (projectId) => {
      set({ isLoading: true, error: null, activeProjectId: projectId });
      try {
        const response = await api.worldGraph.get(projectId);
        if (!response.success || !response.data) {
          throw new Error(response.error?.message ?? "Graph load failed");
        }

        set({
          graphData: response.data,
          isLoading: false,
          selectedNodeId: null,
          selectedEdgeId: null,
        });
      } catch (error) {
        set({ error: String(error), isLoading: false });
      }
    },

    setMainView: (view) => set({ mainView: view }),

    setFilter: (filter) =>
      set((state) => ({ filter: { ...state.filter, ...filter } })),
    resetFilter: () => set({ filter: DEFAULT_FILTER }),
    selectNode: (nodeId: string | null) => set({ selectedNodeId: nodeId, selectedEdgeId: null }),
    selectEdge: (edgeId: string | null) => set({ selectedEdgeId: edgeId, selectedNodeId: null }),

    createGraphNode: async (input) => {
      const projectId = input.projectId || get().activeProjectId;
      if (!projectId) return null;

      const nextNode = await createGraphNodeFromInput(projectId, input);
      if (!nextNode) return null;

      set((state) => {
        const nextGraph = appendNodeToGraph(state.graphData, nextNode);
        return {
          graphData: nextGraph,
          selectedNodeId: nextNode.id,
          selectedEdgeId: null,
        };
      });

      return nextNode;
    },

    updateGraphNode: async (input) => {
      const current = updateGraphNodeSelection(input)(get());
      if (!current) return;

      const updatedNode = await updateGraphNodeFromInput(input, current);
      if (!updatedNode) return;

      set((state) => ({
        graphData: replaceNodeInGraph(state.graphData, updatedNode),
      }));
    },

    updateWorldEntityPosition: async (input: WorldEntityUpdatePositionInput) => {
      const current = get().graphData?.nodes.find((node) => node.id === input.id);
      if (!current || !isWorldEntityBackedType(current.entityType)) return;

      set((state) => ({
        graphData: updateNodePositionInGraph(
          state.graphData,
          input.id,
          input.positionX,
          input.positionY,
        ),
      }));

      await api.worldEntity.updatePosition(input);
    },

    deleteGraphNode: async (id) => {
      const current = get().graphData?.nodes.find((node) => node.id === id);
      if (!current) return;

      const deleted = await deleteGraphNodeByType(current);
      if (!deleted) return;

      set((state) => ({
        graphData: removeNodeFromGraph(state.graphData, id),
        selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
      }));
    },

    createWorldEntity: async (input: WorldEntityCreateInput) =>
      get().createGraphNode({
        projectId: input.projectId,
        entityType: input.type,
        subType: input.type,
        name: input.name,
        description: input.description,
        positionX: input.positionX,
        positionY: input.positionY,
      }),

    updateWorldEntity: async (input: WorldEntityUpdateInput) => {
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

    createRelation: async (input: EntityRelationCreateInput) => {
      const resolvedProjectId = input.projectId || get().activeProjectId;
      if (!resolvedProjectId) return null;

      const sourceType = toRelationSourceType(input.sourceType);
      const targetType = toRelationSourceType(input.targetType);
      const relation = getResolvedRelationKind(
        sourceType,
        targetType,
        input.relation,
      );

      if (!isValidRelationForPair(relation, sourceType, targetType)) {
        return null;
      }

      const response = await api.entityRelation.create({
        ...input,
        sourceType,
        targetType,
        relation,
        projectId: resolvedProjectId,
      });
      if (!response.success || !response.data) return null;
      const createdRelation = response.data;

      set((state) => ({
        graphData: appendRelationToGraph(state.graphData, createdRelation),
      }));
      return createdRelation;
    },

    updateRelation: async (input: EntityRelationUpdateInput) => {
      const response = await api.entityRelation.update(input);
      if (!response.success || !response.data) return false;
      const updatedRelation = response.data;

      set((state) => ({
        graphData: replaceRelationInGraph(state.graphData, updatedRelation),
      }));
      return true;
    },

    deleteRelation: async (id: string) => {
      const response = await api.entityRelation.delete(id);
      if (!response.success) return false;

      set((state) => ({
        graphData: removeRelationFromGraph(state.graphData, id),
        selectedEdgeId: state.selectedEdgeId === id ? null : state.selectedEdgeId,
      }));
      return true;
    },
  };
}
