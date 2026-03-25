import { api } from "@shared/api";
import { useWorldBuildingStore } from "@renderer/features/research/stores/worldBuildingStore";

type PendingRefresh = {
  timerId: number;
  promise: Promise<void>;
  resolve: () => void;
};

const pendingRefreshes = new Map<string, PendingRefresh>();
const WORLD_GRAPH_REFRESH_DEBOUNCE_MS = 80;

const finalizeRefresh = async (projectId: string): Promise<void> => {
  try {
    await useWorldBuildingStore.getState().loadGraph(projectId);
  } catch (error) {
    await api.logger.warn("Failed to refresh world graph after mutation", {
      projectId,
      error,
    });
  }
};

export async function refreshWorldGraph(
  projectId: string | null | undefined,
): Promise<void> {
  if (!projectId) {
    return;
  }

  const existing = pendingRefreshes.get(projectId);
  if (existing) {
    window.clearTimeout(existing.timerId);
    existing.timerId = window.setTimeout(() => {
      pendingRefreshes.delete(projectId);
      void finalizeRefresh(projectId)
        .catch(() => undefined)
        .finally(existing.resolve);
    }, WORLD_GRAPH_REFRESH_DEBOUNCE_MS);
    return existing.promise;
  }

  let resolve!: () => void;
  const promise = new Promise<void>((promiseResolve) => {
    resolve = promiseResolve;
  });

  const pending: PendingRefresh = {
    timerId: window.setTimeout(() => {
      pendingRefreshes.delete(projectId);
      void finalizeRefresh(projectId).catch(() => undefined).finally(resolve);
    }, WORLD_GRAPH_REFRESH_DEBOUNCE_MS),
    promise,
    resolve,
  };

  pendingRefreshes.set(projectId, pending);
  return promise;
}
