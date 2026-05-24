import { createLogger } from "../../shared/logger/index.js";
import {
  chapterService,
  characterService,
  sceneService,
  noteService,
  synopsisService,
  plotService,
  scrapMemoService,
  eventService,
  factionService,
  projectService,
  searchService,
  snapshotService,
  termService,
  manuscriptAnalysisService,
  worldEntityService,
  entityRelationService,
  worldMentionService,
  worldReplicaService,
  graphPluginService,
  dbMaintenanceService,
  chapterSummaryProjector,
  embeddingProjector,
} from "../services/index.js";
import { utilityProcessBridge } from "../services/features/utility/utilityProcessBridge.js";
import { registerProjectHandlers } from "./project/index.js";
import { registerSearchHandlers } from "./search/index.js";
import { registerSystemHandlers } from "./system/index.js";
import { registerWorldHandlers } from "./world/index.js";
import { registerWritingHandlers } from "./writing/index.js";
import { registerAnalysisHandlers } from "./analysis/index.js";

const logger = createLogger("IPCHandler");

const loadAutoSaveManager = async () =>
  (await import("../manager/autoSaveManager.js")).autoSaveManager;

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
