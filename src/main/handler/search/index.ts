import { registerSearchIPCHandlers } from "./ipcSearchHandlers.js";
import type { AppLogger } from "../core/types.js";

export function registerSearchHandlers(options: {
  logger: AppLogger;
  searchService: Parameters<typeof registerSearchIPCHandlers>[1];
  dbMaintenanceService: Parameters<typeof registerSearchIPCHandlers>[2];
  chapterSummaryProjector: Parameters<typeof registerSearchIPCHandlers>[3];
  embeddingProjector: Parameters<typeof registerSearchIPCHandlers>[4];
  narrativeMemoryQueryService: Parameters<typeof registerSearchIPCHandlers>[5];
  narrativeSummaryStatusService: Parameters<typeof registerSearchIPCHandlers>[6];
  packagePersistence?: Parameters<typeof registerSearchIPCHandlers>[7];
}): void {
  registerSearchIPCHandlers(
    options.logger,
    options.searchService,
    options.dbMaintenanceService,
    options.chapterSummaryProjector,
    options.embeddingProjector,
    options.narrativeMemoryQueryService,
    options.narrativeSummaryStatusService,
    options.packagePersistence,
  );
}
