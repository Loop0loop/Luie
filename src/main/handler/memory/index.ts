import { registerMemoryIPCHandlers } from "./ipcMemoryHandlers.js";
import type { AppLogger } from "../core/types.js";

export function registerMemoryHandlers(options: {
  logger: AppLogger;
  chunkSearchService: Parameters<typeof registerMemoryIPCHandlers>[1];
  memoryMaintenanceService: Parameters<typeof registerMemoryIPCHandlers>[2];
  chapterSummaryProjector: Parameters<typeof registerMemoryIPCHandlers>[3];
  embeddingProjector: Parameters<typeof registerMemoryIPCHandlers>[4];
  narrativeMemoryQueryService: Parameters<typeof registerMemoryIPCHandlers>[5];
  narrativeSummaryStatusService: Parameters<typeof registerMemoryIPCHandlers>[6];
  packagePersistence?: Parameters<typeof registerMemoryIPCHandlers>[7];
}): void {
  registerMemoryIPCHandlers(
    options.logger,
    options.chunkSearchService,
    options.memoryMaintenanceService,
    options.chapterSummaryProjector,
    options.embeddingProjector,
    options.narrativeMemoryQueryService,
    options.narrativeSummaryStatusService,
    options.packagePersistence,
  );
}
