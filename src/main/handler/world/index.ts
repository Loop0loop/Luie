import { registerCharacterIPCHandlers } from "./ipcCharacterHandlers.js";
import { registerTermIPCHandlers } from "./ipcTermHandlers.js";
import { registerEventIPCHandlers } from "./ipcEventHandlers.js";
import { registerFactionIPCHandlers } from "./ipcFactionHandlers.js";
import { registerWorldEntityIPCHandlers } from "./ipcWorldEntityHandlers.js";
import { registerEntityRelationIPCHandlers } from "./ipcEntityRelationHandlers.js";
import type { AppLogger } from "../core/types.js";

export function registerWorldHandlers(options: {
  logger: AppLogger;
  characterService: Parameters<typeof registerCharacterIPCHandlers>[1];
  termService: Parameters<typeof registerTermIPCHandlers>[1];
  eventService: Parameters<typeof registerEventIPCHandlers>[1];
  factionService: Parameters<typeof registerFactionIPCHandlers>[1];
  worldEntityService: Parameters<typeof registerWorldEntityIPCHandlers>[1];
  entityRelationService: Parameters<typeof registerEntityRelationIPCHandlers>[1];
}): void {
  registerCharacterIPCHandlers(options.logger, options.characterService);
  registerTermIPCHandlers(options.logger, options.termService);
  registerEventIPCHandlers(options.logger, options.eventService);
  registerFactionIPCHandlers(options.logger, options.factionService);
  registerWorldEntityIPCHandlers(options.logger, options.worldEntityService);
  registerEntityRelationIPCHandlers(options.logger, options.entityRelationService);
}
