import { api } from "@shared/api";
import type {
  EntityRelationCreateInput,
  EntityRelationUpdateInput,
  WorldGraphData,
  WorldEntityCreateInput,
  WorldEntityUpdateInput,
  WorldEntityUpdatePositionInput,
} from "@shared/types";
import {
  buildWorldGraphDocument,
  mergeWorldGraphLayout,
} from "@shared/world/worldGraphDocument";
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
import {
  clearGraphBackedSelection,
  syncGraphBackedStore,
} from "@renderer/features/research/utils/graphEntitySync";
import type {
  UpdateGraphNodeInput,
  WorldBuildingState,
} from "./worldBuildingStore.types";

type StoreSetter<T> = (
  partial: T | Partial<T> | ((state: T) => T | Partial<T>),
) => void;
type StoreGetter<T> = () => T;
const GRAPH_LOAD_TIMEOUT_MS = 8000;
const GRAPH_REPLICA_TIMEOUT_MS = 4000;

type WorldBuildingActions = Pick<
  WorldBuildingState,
  | "loadGraph"
  | "createGraphNode"
  | "updateGraphNode"
  | "updateGraphNodePosition"
  | "updateGraphNodePositionsBatch"
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

const withTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string,
): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timer);
        reject(error);
      },
    );
  });

const persistGraphDocument = async (
  projectId: string,
  graphData: WorldGraphData | null,
): Promise<void> => {
  if (!graphData) return;

  const response = await api.worldStorage.setDocument({
    projectId,
    docType: "graph",
    payload: buildWorldGraphDocument(graphData),
  });

  if (!response.success) {
    await api.logger.warn("Failed to save world graph document", {
      projectId,
      error: response.error,
    });
  }
};

export function createWorldBuildingActions(
  set: StoreSetter<WorldBuildingState>,
  get: StoreGetter<WorldBuildingState>,
): WorldBuildingActions {
  const persistActiveGraphDocument = async (): Promise<void> => {
    const projectId = get().activeProjectId;
    if (!projectId) return;
    await persistGraphDocument(projectId, get().graphData);
  };

  return {
    loadGraph: async (projectId) => {
      set({ isLoading: true, error: null, activeProjectId: projectId });
      try {
        const graphResponse = await withTimeout(
          api.worldGraph.get(projectId),
          GRAPH_LOAD_TIMEOUT_MS,
          "worldGraph.get",
        );

        const graphReplicaResponse = await withTimeout(
          api.worldStorage.getDocument({ projectId, docType: "graph" }),
          GRAPH_REPLICA_TIMEOUT_MS,
          "worldStorage.getDocument",
        ).catch(async (error) => {
          await api.logger.warn("Falling back to base graph without replica document", {
            projectId,
            error: String(error),
          });
          return null;
        });

        if (!graphResponse.success || !graphResponse.data) {
          throw new Error(graphResponse.error?.message ?? "Graph load failed");
        }

        const replicaPayload =
          graphReplicaResponse?.success && graphReplicaResponse.data?.found
            ? graphReplicaResponse.data.payload
            : null;
        const mergedGraph = mergeWorldGraphLayout(
          graphResponse.data,
          replicaPayload,
        );

        set({
          graphData: mergedGraph,
          isLoading: false,
        });
      } catch (error) {
        set({ error: String(error), isLoading: false });
      }
    },

    createGraphNode: async (input) => {
      const projectId = input.projectId || get().activeProjectId;
      if (!projectId) return null;

      const nextNode = await createGraphNodeFromInput(projectId, input);
      if (!nextNode) return null;

      set((state) => {
        const nextGraph = appendNodeToGraph(state.graphData, nextNode);
        return {
          graphData: nextGraph,
        };
      });
      await syncGraphBackedStore(nextNode.entityType, projectId);
      await persistGraphDocument(projectId, get().graphData);

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
      const projectId = get().activeProjectId;
      if (projectId) {
        await syncGraphBackedStore(updatedNode.entityType, projectId);
      }
      await persistActiveGraphDocument();
    },

    updateGraphNodePosition: async (input: WorldEntityUpdatePositionInput) => {
      const current = get().graphData?.nodes.find((node) => node.id === input.id);
      const projectId = get().activeProjectId;
      if (!current || !projectId) return;

      set((state) => ({
        graphData: updateNodePositionInGraph(
          state.graphData,
          input.id,
          input.positionX,
          input.positionY,
        ),
      }));

      if (isWorldEntityBackedType(current.entityType)) {
        await api.worldEntity.updatePosition(input);
      }
      await persistGraphDocument(projectId, get().graphData);
    },

    updateGraphNodePositionsBatch: async (inputs: WorldEntityUpdatePositionInput[]) => {
      if (inputs.length === 0) return;

      const projectId = get().activeProjectId;
      const graphData = get().graphData;
      if (!projectId || !graphData) return;

      const nodesById = new Map(graphData.nodes.map((node) => [node.id, node]));
      const normalizedInputs = inputs.filter((input) => {
        const current = nodesById.get(input.id);
        return current !== undefined;
      });
      if (normalizedInputs.length === 0) return;

      set((state) => {
        let nextGraph = state.graphData;
        normalizedInputs.forEach((input) => {
          nextGraph = updateNodePositionInGraph(
            nextGraph,
            input.id,
            input.positionX,
            input.positionY,
          );
        });
        return {
          graphData: nextGraph,
        };
      });

      await Promise.all(
        normalizedInputs.map(async (input) => {
          const current = nodesById.get(input.id);
          if (!current || !isWorldEntityBackedType(current.entityType)) {
            return;
          }
          await api.worldEntity.updatePosition(input);
        }),
      );

      await persistGraphDocument(projectId, get().graphData);
    },

    updateWorldEntityPosition: async (input: WorldEntityUpdatePositionInput) => {
      await get().updateGraphNodePosition(input);
    },

    deleteGraphNode: async (id) => {
      const current = get().graphData?.nodes.find((node) => node.id === id);
      const projectId = get().activeProjectId;
      if (!current || !projectId) return false;

      const deleted = await deleteGraphNodeByType(current);
      if (!deleted) return false;

      set((state) => ({
        graphData: removeNodeFromGraph(state.graphData, id),
      }));
      clearGraphBackedSelection(current.entityType, id);
      await syncGraphBackedStore(current.entityType, projectId);
      await persistGraphDocument(projectId, get().graphData);
      return true;
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

    deleteWorldEntity: async (id) => get().deleteGraphNode(id),

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
      await persistGraphDocument(resolvedProjectId, get().graphData);
      return createdRelation;
    },

    updateRelation: async (input: EntityRelationUpdateInput) => {
      const response = await api.entityRelation.update(input);
      if (!response.success || !response.data) return false;
      const updatedRelation = response.data;

      set((state) => ({
        graphData: replaceRelationInGraph(state.graphData, updatedRelation),
      }));
      await persistActiveGraphDocument();
      return true;
    },

    deleteRelation: async (id: string) => {
      const projectId = get().activeProjectId;
      const response = await api.entityRelation.delete(id);
      if (!response.success || !projectId) return false;

      set((state) => ({
        graphData: removeRelationFromGraph(state.graphData, id),
      }));
      await persistGraphDocument(projectId, get().graphData);
      return true;
    },
  };
}
