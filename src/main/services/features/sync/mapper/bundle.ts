import type { SyncBundle } from "./types.js";

export const createEmptySyncBundle = (): SyncBundle => ({
  projects: [],
  chapters: [],
  characters: [],
  events: [],
  factions: [],
  terms: [],
  worldDocuments: [],
  memos: [],
  snapshots: [],
  memoryCanonicalRows: [],
  tombstones: [],
});
