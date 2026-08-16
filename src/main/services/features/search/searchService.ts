import type {
  MemoryChunkSearchQuery,
  MemoryChunkWindowQuery,
  SearchQuery,
} from "../../../../shared/types/index.js";
import { searchProject } from "./basicSearch.js";
import {
  getChunkBacklink,
  getChunkWindow,
  searchChunks,
} from "./chunkOperations.js";
import { utilityProcessBridge } from "../utility/utilityProcessBridge.js";

export const searchService = {
  search: (input: SearchQuery) => searchProject(input),
  searchChunks: (input: MemoryChunkSearchQuery) =>
    searchChunks(input, utilityProcessBridge.embed),
  getChunkBacklink: (chunkId: string) => getChunkBacklink(chunkId),
  getChunkWindow: (input: MemoryChunkWindowQuery) => getChunkWindow(input),
};
