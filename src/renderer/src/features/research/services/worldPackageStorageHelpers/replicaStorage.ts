import { api } from "@shared/api";
import type {
  ReplicaWorldDocumentType,
  WorldScrapMemosData,
} from "@shared/types";

export const loadReplicaDocument = async (
  projectId: string,
  docType: Exclude<ReplicaWorldDocumentType, "graph" | "scrap">,
): Promise<unknown | null> => {
  const response = await api.worldStorage.getDocument({ projectId, docType });
  if (!response.success) {
    await api.logger.warn("Failed to load world replica document", {
      projectId,
      docType,
      error: response.error,
    });
    return null;
  }
  if (!response.data?.found) {
    return null;
  }
  return response.data.payload ?? null;
};

export const saveReplicaDocument = async (
  projectId: string,
  docType: Exclude<ReplicaWorldDocumentType, "graph" | "scrap">,
  payload: unknown,
): Promise<boolean> => {
  const response = await api.worldStorage.setDocument({
    projectId,
    docType,
    payload,
  });
  if (!response.success) {
    await api.logger.warn("Failed to save world replica document", {
      projectId,
      docType,
      error: response.error,
    });
    return false;
  }
  return true;
};

export const ensureReplicaDocumentSaved = async (
  projectId: string,
  docType: Exclude<ReplicaWorldDocumentType, "graph" | "scrap">,
  payload: unknown,
): Promise<void> => {
  const persisted = await saveReplicaDocument(projectId, docType, payload);
  if (!persisted) {
    throw new Error(`Failed to save ${docType} world data to replica storage.`);
  }
};

export const loadReplicaScrapMemos = async (
  projectId: string,
): Promise<WorldScrapMemosData | null> => {
  const response = await api.worldStorage.getScrapMemos(projectId);
  if (!response.success) {
    await api.logger.warn("Failed to load world replica scrap memos", {
      projectId,
      error: response.error,
    });
    return null;
  }
  return response.data?.found ? response.data.data ?? null : null;
};

export const saveReplicaScrapMemos = async (
  projectId: string,
  data: WorldScrapMemosData,
): Promise<boolean> => {
  const response = await api.worldStorage.setScrapMemos({
    projectId,
    data,
  });
  if (!response.success) {
    await api.logger.warn("Failed to save world replica scrap memos", {
      projectId,
      error: response.error,
    });
    return false;
  }
  const packageExportResult = response.data as
    | { packageExportError?: string }
    | null
    | undefined;
  if (packageExportResult?.packageExportError) {
    await api.logger.warn("Failed to export world replica scrap memos", {
      projectId,
      error: packageExportResult.packageExportError,
    });
    return false;
  }
  return true;
};

export const ensureReplicaScrapMemosSaved = async (
  projectId: string,
  data: WorldScrapMemosData,
): Promise<void> => {
  const persisted = await saveReplicaScrapMemos(projectId, data);
  if (!persisted) {
    throw new Error("Failed to save scrap memos to replica storage.");
  }
};
