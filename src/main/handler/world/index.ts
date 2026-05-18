import { registerCharacterIPCHandlers } from "./ipcCharacterHandlers.js";
import { registerCharacterAIIPCHandlers } from "./ipcCharacterAIHandlers.js";
import { registerTermIPCHandlers } from "./ipcTermHandlers.js";
import { registerEventIPCHandlers } from "./ipcEventHandlers.js";
import { registerFactionIPCHandlers } from "./ipcFactionHandlers.js";
import { registerWorldEntityIPCHandlers } from "./ipcWorldEntityHandlers.js";
import { registerEntityRelationIPCHandlers } from "./ipcEntityRelationHandlers.js";
import { registerWorldStorageIPCHandlers } from "./ipcWorldStorageHandlers.js";
import { registerSceneIPCHandlers } from "./ipcSceneHandlers.js";
import { registerNoteIPCHandlers } from "./ipcNoteHandlers.js";
import { registerSynopsisIPCHandlers } from "./ipcSynopsisHandlers.js";
import { registerPlotIPCHandlers } from "./ipcPlotHandlers.js";
import { registerScrapMemoIPCHandlers } from "./ipcScrapMemoHandlers.js";
import type { AppLogger } from "../core/types.js";

export function registerWorldHandlers(options: {
  logger: AppLogger;
  characterService: Parameters<typeof registerCharacterIPCHandlers>[1];
  sceneService: Parameters<typeof registerSceneIPCHandlers>[1];
  noteService: Parameters<typeof registerNoteIPCHandlers>[1];
  synopsisService: Parameters<typeof registerSynopsisIPCHandlers>[1];
  plotService: Parameters<typeof registerPlotIPCHandlers>[1];
  scrapMemoService: Parameters<typeof registerScrapMemoIPCHandlers>[1];
  termService: Parameters<typeof registerTermIPCHandlers>[1];
  eventService: Parameters<typeof registerEventIPCHandlers>[1];
  factionService: Parameters<typeof registerFactionIPCHandlers>[1];
  worldEntityService: Parameters<typeof registerWorldEntityIPCHandlers>[1];
  entityRelationService: Parameters<typeof registerEntityRelationIPCHandlers>[1];
  worldMentionService: Parameters<typeof registerEntityRelationIPCHandlers>[2];
  worldReplicaService: Parameters<typeof registerWorldStorageIPCHandlers>[1];
}): void {
  registerCharacterIPCHandlers(options.logger, options.characterService);
  registerSceneIPCHandlers(options.logger, options.sceneService);
  registerNoteIPCHandlers(options.logger, options.noteService);
  registerSynopsisIPCHandlers(options.logger, options.synopsisService);
  registerPlotIPCHandlers(options.logger, options.plotService);
  registerScrapMemoIPCHandlers(options.logger, options.scrapMemoService);
  registerTermIPCHandlers(options.logger, options.termService);
  registerEventIPCHandlers(options.logger, options.eventService);
  registerFactionIPCHandlers(options.logger, options.factionService);
  registerWorldEntityIPCHandlers(options.logger, options.worldEntityService);
  registerEntityRelationIPCHandlers(
    options.logger,
    options.entityRelationService,
    options.worldMentionService,
  );
  registerWorldStorageIPCHandlers(options.logger, options.worldReplicaService);
  registerCharacterAIIPCHandlers(options.logger);
}
