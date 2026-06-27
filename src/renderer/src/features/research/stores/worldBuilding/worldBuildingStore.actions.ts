import { api } from "@shared/api";
import type {
  EntityRelationCreateInput,
  EntityRelationUpdateInput,
  WorldGraphCanvasBlock,
  WorldGraphCanvasEdge,
  WorldGraphCanvasFile,
  WorldGraphData,
  WorldEntityCreateInput,
  WorldEntityUpdateInput,
  WorldEntityUpdatePositionInput,
  WorldTimelineTrack,
} from "@shared/types";
import {
  normalizeCanvasBlocks,
  normalizeCanvasEdges,
  normalizeCanvasFiles,
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
import {
  createLoadGraphAction,
  persistGraphDocument,
  type StoreGetter,
  type StoreSetter,
  type WorldBuildingActions,
} from "./worldBuildingActions";

const graphNodeCreateLocks = new Set<string>();

function updateGraphNodeSelection(input: UpdateGraphNodeInput) {
  return (state: WorldBuildingState) => {
    const current = state.graphData?.nodes.find((node) => node.id === input.id);
    return current ?? null;
  };
}

function applyActiveGraphUpdate(
  set: StoreSetter<WorldBuildingState>,
  projectId: string,
  update: (graphData: WorldGraphData | null) => WorldGraphData | null | undefined,
): WorldGraphData | null {
  let nextGraphSnapshot: WorldGraphData | null = null;

  set((state) => {
    if (state.activeProjectId !== projectId) {
      return state;
    }
    const nextGraph = update(state.graphData);
    if (nextGraph === undefined) {
      return state;
    }
    nextGraphSnapshot = nextGraph;
    return {
      graphData: nextGraph,
    };
  });

  return nextGraphSnapshot;
}

export function createWorldBuildingActions(
  set: StoreSetter<WorldBuildingState>,
  get: StoreGetter<WorldBuildingState>,
): WorldBuildingActions {
  const ensureGraphLoaded = async (projectId: string): Promise<boolean> => {
    if (get().graphData) return true;
    await get().loadGraph(projectId);
    return Boolean(get().graphData);
  };

  return {
    loadGraph: createLoadGraphAction(set, get),

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

        const nextGraphSnapshot = applyActiveGraphUpdate(
          set,
          projectId,
          (graphData) => appendNodeToGraph(graphData, nextNode),
        );
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

      const nextGraphSnapshot = applyActiveGraphUpdate(
        set,
        projectId,
        (graphData) => replaceNodeInGraph(graphData, updatedNode),
      );
      await syncGraphBackedStore(updatedNode.entityType, projectId);
      await persistGraphDocument(projectId, nextGraphSnapshot);
    },

    updateGraphNodePosition: async (input: WorldEntityUpdatePositionInput) => {
      const current = get().graphData?.nodes.find(
        (node) => node.id === input.id,
      );
      const projectId = get().activeProjectId;
      if (!current || !projectId) return;

      const nextGraphSnapshot = applyActiveGraphUpdate(
        set,
        projectId,
        (graphData) =>
          updateNodePositionInGraph(
            graphData,
            input.id,
            input.positionX,
            input.positionY,
          ),
      );

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

      const nextGraphSnapshot = applyActiveGraphUpdate(
        set,
        projectId,
        (graphData) => {
          let nextGraph = graphData;
          normalizedInputs.forEach((input) => {
            nextGraph = updateNodePositionInGraph(
              nextGraph,
              input.id,
              input.positionX,
              input.positionY,
            );
          });
          return nextGraph;
        },
      );

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

      const nextGraphSnapshot = applyActiveGraphUpdate(
        set,
        projectId,
        (graphData) => removeNodeFromGraph(graphData, id),
      );
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

      const nextGraphSnapshot = applyActiveGraphUpdate(
        set,
        resolvedProjectId,
        (graphData) => appendRelationToGraph(graphData, createdRelation),
      );
      await persistGraphDocument(resolvedProjectId, nextGraphSnapshot);
      return createdRelation;
    },

    updateRelation: async (input: EntityRelationUpdateInput) => {
      const response = await api.entityRelation.update(input);
      if (!response.success || !response.data) return false;
      const updatedRelation = response.data;

      const projectId = get().activeProjectId;
      if (!projectId) return true;

      const nextGraphSnapshot = applyActiveGraphUpdate(
        set,
        projectId,
        (graphData) => replaceRelationInGraph(graphData, updatedRelation),
      );
      await persistGraphDocument(projectId, nextGraphSnapshot);
      return true;
    },

    deleteRelation: async (id: string) => {
      const projectId = get().activeProjectId;
      const response = await api.entityRelation.delete(id);
      if (!response.success || !projectId) return false;

      const nextGraphSnapshot = applyActiveGraphUpdate(
        set,
        projectId,
        (graphData) => removeRelationFromGraph(graphData, id),
      );
      await persistGraphDocument(projectId, nextGraphSnapshot);
      return true;
    },

    setGraphCanvasBlocks: async (blocks: WorldGraphCanvasBlock[]) => {
      const projectId = get().activeProjectId;
      if (!projectId) return;
      if (!(await ensureGraphLoaded(projectId))) return;
      const nextCanvasBlocks = normalizeCanvasBlocks(blocks);

      const nextGraphSnapshot = applyActiveGraphUpdate(
        set,
        projectId,
        (graphData) =>
          graphData ? { ...graphData, canvasBlocks: nextCanvasBlocks } : undefined,
      );

      await persistGraphDocument(projectId, nextGraphSnapshot);
    },

    setGraphCanvasEdges: async (edges: WorldGraphCanvasEdge[]) => {
      const projectId = get().activeProjectId;
      if (!projectId) return;
      if (!(await ensureGraphLoaded(projectId))) return;
      const nextCanvasEdges = normalizeCanvasEdges(edges);

      const nextGraphSnapshot = applyActiveGraphUpdate(
        set,
        projectId,
        (graphData) =>
          graphData ? { ...graphData, canvasEdges: nextCanvasEdges } : undefined,
      );

      await persistGraphDocument(projectId, nextGraphSnapshot);
    },

    setGraphCanvasFiles: async (files: WorldGraphCanvasFile[]) => {
      const projectId = get().activeProjectId;
      if (!projectId) return;
      if (!(await ensureGraphLoaded(projectId))) return;
      const nextCanvasFiles = normalizeCanvasFiles(files);

      const nextGraphSnapshot = applyActiveGraphUpdate(
        set,
        projectId,
        (graphData) =>
          graphData ? { ...graphData, canvasFiles: nextCanvasFiles } : undefined,
      );

      await persistGraphDocument(projectId, nextGraphSnapshot);
    },

    setTimelines: async (timelines: WorldTimelineTrack[]) => {
      const projectId = get().activeProjectId;
      if (!projectId) return;
      if (!(await ensureGraphLoaded(projectId))) return;
      const nextTimelines = normalizeTimelines(timelines);

      const nextGraphSnapshot = applyActiveGraphUpdate(
        set,
        projectId,
        (graphData) =>
          graphData ? { ...graphData, timelines: nextTimelines } : undefined,
      );

      await persistGraphDocument(projectId, nextGraphSnapshot);
    },
  };
}
