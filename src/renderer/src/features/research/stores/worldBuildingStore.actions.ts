import { api } from "@shared/api";
import type {
  EntityRelationCreateInput,
  EntityRelationUpdateInput,
  WorldGraphCanvasBlock,
  WorldGraphCanvasEdge,
  WorldGraphData,
  WorldEntityCreateInput,
  WorldEntityUpdateInput,
  WorldEntityUpdatePositionInput,
  WorldTimelineTrack,
} from "@shared/types";
import {
  buildWorldGraphDocument,
  mergeWorldGraphLayout,
  normalizeCanvasBlocks,
  normalizeCanvasEdges,
  normalizeTimelines,
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
const graphPersistQueue = new Map<string, Promise<void>>();
const graphLoadQueue = new Map<string, number>();
const graphMutationVersion = new Map<string, number>();
const graphNodeCreateLocks = new Set<string>();

const readGraphMutationVersion = (projectId: string): number =>
  graphMutationVersion.get(projectId) ?? 0;

const markGraphMutation = (projectId: string): void => {
  graphMutationVersion.set(projectId, readGraphMutationVersion(projectId) + 1);
};

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
  | "setGraphCanvasBlocks"
  | "setGraphCanvasEdges"
  | "setTimelines"
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

  markGraphMutation(projectId);

  const previousWrite = graphPersistQueue.get(projectId) ?? Promise.resolve();
  const nextWrite = previousWrite
    .catch(() => undefined)
    .then(async () => {
      const response = await api.worldStorage.setDocument({
        projectId,
        docType: "graph",
        payload: buildWorldGraphDocument(graphData),
      });

      if (!response.success) {
        await api.logger.error("Failed to save world graph document", {
          projectId,
          error: response.error,
        });

        const message =
          typeof response.error?.message === "string"
            ? response.error.message
            : "Failed to persist world graph document";
        throw new Error(message);
      }

      const packageExportResult = response.data as
        | { packageExportError?: string }
        | null
        | undefined;
      if (packageExportResult?.packageExportError) {
        await api.logger.error("Failed to export world graph into .luie", {
          projectId,
          error: packageExportResult.packageExportError,
        });
        throw new Error(packageExportResult.packageExportError);
      }
    });

  graphPersistQueue.set(projectId, nextWrite);

  try {
    await nextWrite;
  } finally {
    if (graphPersistQueue.get(projectId) === nextWrite) {
      graphPersistQueue.delete(projectId);
    }
  }
};

export function createWorldBuildingActions(
  set: StoreSetter<WorldBuildingState>,
  get: StoreGetter<WorldBuildingState>,
): WorldBuildingActions {
  return {
    loadGraph: async (projectId) => {
      const loadRequest = (graphLoadQueue.get(projectId) ?? 0) + 1;
      graphLoadQueue.set(projectId, loadRequest);
      const mutationVersionAtLoadStart = readGraphMutationVersion(projectId);

      set((state) => ({
        isLoading: true,
        error: null,
        activeProjectId: projectId,
        // Keep the current graph visible during same-project reloads so
        // in-flight mutations can rebase against a real snapshot.
        graphData:
          state.activeProjectId === projectId ? state.graphData : null,
      }));
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
          await api.logger.warn(
            "Falling back to base graph without replica document",
            {
              projectId,
              error: String(error),
            },
          );
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

        const latestLoadRequest = graphLoadQueue.get(projectId) ?? 0;
        if (latestLoadRequest !== loadRequest) {
          return;
        }

        const latestMutationVersion = readGraphMutationVersion(projectId);
        if (latestMutationVersion !== mutationVersionAtLoadStart) {
          set({ isLoading: false });
          return;
        }

        if (get().activeProjectId !== projectId) {
          return;
        }

        set({
          graphData: mergedGraph,
          isLoading: false,
        });
      } catch (error) {
        const latestLoadRequest = graphLoadQueue.get(projectId) ?? 0;
        if (latestLoadRequest !== loadRequest) {
          return;
        }
        if (get().activeProjectId !== projectId) {
          return;
        }
        set({ error: String(error), isLoading: false });
      }
    },

    createGraphNode: async (input) => {
      const projectId = input.projectId || get().activeProjectId;
      if (!projectId) return null;

      if (graphNodeCreateLocks.has(projectId)) {
        return null;
      }

      graphNodeCreateLocks.add(projectId);
      try {
        const nextNode = await createGraphNodeFromInput(projectId, input);
        if (!nextNode) return null;

        if (get().activeProjectId !== projectId) {
          return nextNode;
        }

        let nextGraphSnapshot: WorldGraphData | null = null;

        set((state) => {
          if (state.activeProjectId !== projectId) {
            return state;
          }
          const nextGraph = appendNodeToGraph(state.graphData, nextNode);
          nextGraphSnapshot = nextGraph;
          return {
            graphData: nextGraph,
          };
        });
        await syncGraphBackedStore(nextNode.entityType, projectId);
        await persistGraphDocument(projectId, nextGraphSnapshot);

        return nextNode;
      } finally {
        graphNodeCreateLocks.delete(projectId);
      }
    },

    updateGraphNode: async (input) => {
      const current = updateGraphNodeSelection(input)(get());
      if (!current) return;

      const updatedNode = await updateGraphNodeFromInput(input, current);
      if (!updatedNode) return;

      const projectId = get().activeProjectId;
      if (!projectId) return;

      let nextGraphSnapshot: WorldGraphData | null = null;

      set((state) => {
        if (state.activeProjectId !== projectId) {
          return state;
        }
        const nextGraph = replaceNodeInGraph(state.graphData, updatedNode);
        nextGraphSnapshot = nextGraph;
        return {
          graphData: nextGraph,
        };
      });
      await syncGraphBackedStore(updatedNode.entityType, projectId);
      await persistGraphDocument(projectId, nextGraphSnapshot);
    },

    updateGraphNodePosition: async (input: WorldEntityUpdatePositionInput) => {
      const current = get().graphData?.nodes.find(
        (node) => node.id === input.id,
      );
      const projectId = get().activeProjectId;
      if (!current || !projectId) return;

      let nextGraphSnapshot: WorldGraphData | null = null;

      set((state) => {
        if (state.activeProjectId !== projectId) {
          return state;
        }

        const nextGraph = updateNodePositionInGraph(
          state.graphData,
          input.id,
          input.positionX,
          input.positionY,
        );
        nextGraphSnapshot = nextGraph;
        return {
          graphData: nextGraph,
        };
      });

      if (isWorldEntityBackedType(current.entityType)) {
        await api.worldEntity.updatePosition(input);
      }
      await persistGraphDocument(projectId, nextGraphSnapshot);
    },

    updateGraphNodePositionsBatch: async (
      inputs: WorldEntityUpdatePositionInput[],
    ) => {
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

      let nextGraphSnapshot: WorldGraphData | null = null;

      set((state) => {
        if (state.activeProjectId !== projectId) {
          return state;
        }
        let nextGraph = state.graphData;
        normalizedInputs.forEach((input) => {
          nextGraph = updateNodePositionInGraph(
            nextGraph,
            input.id,
            input.positionX,
            input.positionY,
          );
        });
        nextGraphSnapshot = nextGraph;
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

      await persistGraphDocument(projectId, nextGraphSnapshot);
    },

    updateWorldEntityPosition: async (
      input: WorldEntityUpdatePositionInput,
    ) => {
      await get().updateGraphNodePosition(input);
    },

    deleteGraphNode: async (id) => {
      const current = get().graphData?.nodes.find((node) => node.id === id);
      const projectId = get().activeProjectId;
      if (!current || !projectId) return false;

      const deleted = await deleteGraphNodeByType(current);
      if (!deleted) return false;

      let nextGraphSnapshot: WorldGraphData | null = null;

      set((state) => {
        if (state.activeProjectId !== projectId) {
          return state;
        }
        const nextGraph = removeNodeFromGraph(state.graphData, id);
        nextGraphSnapshot = nextGraph;
        return {
          graphData: nextGraph,
        };
      });
      clearGraphBackedSelection(current.entityType, id);
      await syncGraphBackedStore(current.entityType, projectId);
      await persistGraphDocument(projectId, nextGraphSnapshot);
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
      const current = get().graphData?.nodes.find(
        (node) => node.id === input.id,
      );
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

      if (get().activeProjectId !== resolvedProjectId) {
        return createdRelation;
      }

      let nextGraphSnapshot: WorldGraphData | null = null;

      set((state) => {
        if (state.activeProjectId !== resolvedProjectId) {
          return state;
        }
        const nextGraph = appendRelationToGraph(
          state.graphData,
          createdRelation,
        );
        nextGraphSnapshot = nextGraph;
        return {
          graphData: nextGraph,
        };
      });
      await persistGraphDocument(resolvedProjectId, nextGraphSnapshot);
      return createdRelation;
    },

    updateRelation: async (input: EntityRelationUpdateInput) => {
      const response = await api.entityRelation.update(input);
      if (!response.success || !response.data) return false;
      const updatedRelation = response.data;

      const projectId = get().activeProjectId;
      if (!projectId) return true;

      let nextGraphSnapshot: WorldGraphData | null = null;

      set((state) => {
        if (state.activeProjectId !== projectId) {
          return state;
        }
        const nextGraph = replaceRelationInGraph(
          state.graphData,
          updatedRelation,
        );
        nextGraphSnapshot = nextGraph;
        return {
          graphData: nextGraph,
        };
      });
      await persistGraphDocument(projectId, nextGraphSnapshot);
      return true;
    },

    deleteRelation: async (id: string) => {
      const projectId = get().activeProjectId;
      const response = await api.entityRelation.delete(id);
      if (!response.success || !projectId) return false;

      let nextGraphSnapshot: WorldGraphData | null = null;

      set((state) => {
        if (state.activeProjectId !== projectId) {
          return state;
        }
        const nextGraph = removeRelationFromGraph(state.graphData, id);
        nextGraphSnapshot = nextGraph;
        return {
          graphData: nextGraph,
        };
      });
      await persistGraphDocument(projectId, nextGraphSnapshot);
      return true;
    },

    setGraphCanvasBlocks: async (blocks: WorldGraphCanvasBlock[]) => {
      const projectId = get().activeProjectId;
      if (!projectId) return;
      const nextCanvasBlocks = normalizeCanvasBlocks(blocks);

      let nextGraphSnapshot: WorldGraphData | null = null;

      set((state) => {
        if (state.activeProjectId !== projectId) {
          return state;
        }
        if (!state.graphData) {
          return state;
        }

        nextGraphSnapshot = {
          ...state.graphData,
          canvasBlocks: nextCanvasBlocks,
        };
        return {
          graphData: nextGraphSnapshot,
        };
      });

      await persistGraphDocument(projectId, nextGraphSnapshot);
    },

    setGraphCanvasEdges: async (edges: WorldGraphCanvasEdge[]) => {
      const projectId = get().activeProjectId;
      if (!projectId) return;
      const nextCanvasEdges = normalizeCanvasEdges(edges);

      let nextGraphSnapshot: WorldGraphData | null = null;

      set((state) => {
        if (state.activeProjectId !== projectId) {
          return state;
        }
        if (!state.graphData) {
          return state;
        }

        nextGraphSnapshot = {
          ...state.graphData,
          canvasEdges: nextCanvasEdges,
        };
        return {
          graphData: nextGraphSnapshot,
        };
      });

      await persistGraphDocument(projectId, nextGraphSnapshot);
    },

    setTimelines: async (timelines: WorldTimelineTrack[]) => {
      const projectId = get().activeProjectId;
      if (!projectId) return;
      const nextTimelines = normalizeTimelines(timelines);

      let nextGraphSnapshot: WorldGraphData | null = null;

      set((state) => {
        if (state.activeProjectId !== projectId) {
          return state;
        }
        if (!state.graphData) {
          return state;
        }

        nextGraphSnapshot = {
          ...state.graphData,
          timelines: nextTimelines,
        };
        return {
          graphData: nextGraphSnapshot,
        };
      });

      await persistGraphDocument(projectId, nextGraphSnapshot);
    },
  };
}
