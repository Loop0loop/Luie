export {
  type SearchResult,
  getQuickAccess,
  searchProject,
} from "./basicSearch.js";

export {
  buildFtsQuery,
  mergeWithRRF,
  searchByShortTokens,
  searchByVector,
  shouldRunVectorSearch,
} from "./chunkSearch.js";

export {
  getChunkBacklink,
  getChunkWindow,
  searchChunks,
} from "./chunkOperations.js";

export {
  type CachedChapterSearchDocument,
  chapterSearchCacheService,
} from "./chapterSearchCacheService.js";

export { SearchService, searchService } from "./searchService.js";
