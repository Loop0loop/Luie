import { api } from "@shared/api";
import type { WorldGraphData } from "@shared/types";
import { buildWorldGraphDocument } from "@shared/world/worldGraphDocument";

export const GRAPH_LOAD_TIMEOUT_MS = 8000;
export const GRAPH_REPLICA_TIMEOUT_MS = 4000;

const graphPersistQueue = new Map<string, Promise<void>>();
const graphMutationVersion = new Map<string, number>();

export const readGraphMutationVersion = (projectId: string): number =>
  graphMutationVersion.get(projectId) ?? 0;

export const markGraphMutation = (projectId: string): void => {
  graphMutationVersion.set(projectId, readGraphMutationVersion(projectId) + 1);
};

export const withTimeout = async <T>(
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

export const persistGraphDocument = async (
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
