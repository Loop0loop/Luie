import { createLogger } from "../../shared/logger/index.js";
import {
  chapterSummaryProjector,
  dbMaintenanceService,
  embeddingProjector,
  manuscriptAnalysisService,
  searchService,
} from "../domains/analysis/index.js";
import { chapterService } from "../domains/manuscript/index.js";
import {
  projectService,
  graphPluginService,
} from "../domains/project/index.js";
import { snapshotService } from "../domains/recovery/index.js";
import {
  characterService,
  entityRelationService,
  factionService,
  eventService,
  noteService,
  plotService,
  sceneService,
  scrapMemoService,
  synopsisService,
  termService,
  worldEntityService,
  worldMentionService,
  worldReplicaService,
} from "../domains/world/index.js";
import { utilityProcessBridge } from "../infra/utility-process/index.js";
import { narrativeMemoryQueryService } from "../services/features/memory/query/narrativeMemoryQueryService.js";
import { getNarrativeSummaryStatus } from "../services/features/memory/summary/memoryNarrativeSummaryStatus.js";
import { registerProjectHandlers } from "./project/index.js";
import { registerSearchHandlers } from "./search/index.js";
import { registerSystemHandlers } from "./system/index.js";
import { registerWorldHandlers } from "./world/index.js";
import { registerWritingHandlers } from "./writing/index.js";
import { registerAnalysisHandlers } from "./analysis/index.js";

const logger = createLogger("IPCHandler");

const loadAutoSaveManager = async () =>
  (await import("../domains/manuscript/index.js")).autoSaveManager;

export async function registerAllIPCHandlers(): Promise<void> {
  registerProjectHandlers({
    logger,
    projectService,
    chapterService,
  });

  registerWorldHandlers({
    logger,
    characterService,
    sceneService,
    noteService,
    synopsisService,
    plotService,
    scrapMemoService,
    termService,
    eventService,
    factionService,
    worldEntityService,
    entityRelationService,
    worldMentionService,
    worldReplicaService,
  });

  registerWritingHandlers({
    logger,
    autoSaveManager: await loadAutoSaveManager(),
    snapshotService,
  });

  registerSearchHandlers({
    logger,
    searchService,
    dbMaintenanceService,
    chapterSummaryProjector,
    embeddingProjector,
    narrativeMemoryQueryService,
    narrativeSummaryStatusService: {
      getStatus: getNarrativeSummaryStatus,
    },
  });

  registerSystemHandlers({
    logger,
    graphPluginService,
  });

  registerAnalysisHandlers({
    logger,
    manuscriptAnalysisService,
    ragQaService: {
      ask: (input, window) => utilityProcessBridge.askRagQa(input, window.id),
      stop: (runId?: string) => utilityProcessBridge.stopRagQa(runId),
    },
  });

  logger.info("IPC handlers registered successfully");
}

// Backward compat
export const registerIPCHandlers = registerAllIPCHandlers;
