/**
 * Search service - 통합 검색 (고유명사 우선)
 */

import type {
  MemoryChunkSearchQuery,
  MemoryChunkWindowQuery,
  SearchQuery,
} from "../../../shared/types/index.js";
import {
  getChunkBacklink,
  getChunkWindow,
  getQuickAccess,
  searchChunks,
  searchProject,
  type SearchResult,
} from "./search/index.js";
import { utilityProcessBridge } from "./utility/utilityProcessBridge.js";

export class SearchService {
  async search(input: SearchQuery): Promise<SearchResult[]> {
    return searchProject(input);
  }

  async searchCharacters(projectId: string, query: string) {
    return this.search({ projectId, query, type: "character" });
  }

  async searchTerms(projectId: string, query: string) {
    return this.search({ projectId, query, type: "term" });
  }

  async searchChapters(projectId: string, query: string) {
    return this.search({ projectId, query, type: "all" });
  }

  async searchChunks(input: MemoryChunkSearchQuery) {
    return searchChunks(input, utilityProcessBridge.embed);
  }

  async getChunkBacklink(chunkId: string) {
    return getChunkBacklink(chunkId);
  }

  async getChunkWindow(input: MemoryChunkWindowQuery) {
    return getChunkWindow(input);
  }

  async getQuickAccess(projectId: string) {
    return getQuickAccess(projectId);
  }
}

export const searchService = new SearchService();
