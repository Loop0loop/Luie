import type { ReplicaWorldDocumentType } from "@shared/types";

const WORLD_LOCAL_STORAGE_PREFIX = "luie:world:";

export const WORLD_REPLICA_LOCAL_KEY_BY_DOC_TYPE: Record<
  Exclude<ReplicaWorldDocumentType, "graph">,
  string
> = {
  synopsis: "synopsis",
  plot: "plot",
  drawing: "drawing",
  mindmap: "mindmap",
  scrap: "scrap-memos",
};

export const buildLocalStorageKey = (projectId: string, key: string) =>
  `${WORLD_LOCAL_STORAGE_PREFIX}${projectId}:${key}`;

export const loadLocalStorageJson = <T>(
  projectId: string,
  key: string,
): T | null => {
  try {
    const raw = localStorage.getItem(buildLocalStorageKey(projectId, key));
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

export const removeLocalStorageJson = (projectId: string, key: string) => {
  try {
    localStorage.removeItem(buildLocalStorageKey(projectId, key));
  } catch {
    // local fallback only
  }
};
