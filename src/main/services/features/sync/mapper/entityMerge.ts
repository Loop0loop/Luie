import type { SyncWorldDocumentRecord } from "./types.js";

export const toTimestamp = (value: string | undefined | null): number => {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const chooseLatest = <
  T extends { updatedAt: string; deletedAt?: string | null },
>(
  left: T,
  right: T,
): [winner: T, loser: T] => {
  const leftUpdatedAt = toTimestamp(left.updatedAt);
  const rightUpdatedAt = toTimestamp(right.updatedAt);
  if (leftUpdatedAt !== rightUpdatedAt) {
    return leftUpdatedAt > rightUpdatedAt ? [left, right] : [right, left];
  }

  const leftDeleted = Boolean(left.deletedAt);
  const rightDeleted = Boolean(right.deletedAt);
  if (leftDeleted !== rightDeleted) {
    return leftDeleted ? [left, right] : [right, left];
  }

  return [left, right];
};

export const mergeEntityList = <T extends { id: string; updatedAt: string }>(
  local: T[],
  remote: T[],
): T[] => {
  const merged = new Map<string, T>();
  for (const item of local) {
    merged.set(item.id, item);
  }
  for (const item of remote) {
    const existing = merged.get(item.id);
    if (!existing) {
      merged.set(item.id, item);
      continue;
    }
    const [winner] = chooseLatest(existing, item);
    merged.set(item.id, winner);
  }
  return Array.from(merged.values());
};

export const mergeWorldDocs = (
  local: SyncWorldDocumentRecord[],
  remote: SyncWorldDocumentRecord[],
): SyncWorldDocumentRecord[] => {
  const merged = new Map<string, SyncWorldDocumentRecord>();
  for (const item of local) {
    merged.set(`${item.projectId}:${item.docType}`, item);
  }
  for (const item of remote) {
    const key = `${item.projectId}:${item.docType}`;
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, item);
      continue;
    }
    const [winner] = chooseLatest(existing, item);
    merged.set(key, winner);
  }
  return Array.from(merged.values());
};
