import { api } from "@shared/api";
import { mergeWorldGraphLayout } from "@shared/world/worldGraphDocument";
import type { WorldBuildingState } from "../worldBuildingStore.types";
import type { StoreGetter, StoreSetter } from "./types";
import {
  GRAPH_LOAD_TIMEOUT_MS,
  GRAPH_REPLICA_TIMEOUT_MS,
  readGraphMutationVersion,
  withTimeout,
} from "./runtime";

const graphLoadQueue = new Map<string, number>();

export const createLoadGraphAction = (
  set: StoreSetter<WorldBuildingState>,
  get: StoreGetter<WorldBuildingState>,
) => async (projectId: string) => {
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
};
