import { registerCharacterIPCHandlers } from "./ipcCharacterHandlers.js";
import { registerTermIPCHandlers } from "./ipcTermHandlers.js";
import { registerEventIPCHandlers } from "./ipcEventHandlers.js";
import { registerFactionIPCHandlers } from "./ipcFactionHandlers.js";
import type { AppLogger } from "../core/types.js";

export function registerWorldHandlers(options: {
  logger: AppLogger;
  characterService: Parameters<typeof registerCharacterIPCHandlers>[1];
  termService: Parameters<typeof registerTermIPCHandlers>[1];
  eventService: Parameters<typeof registerEventIPCHandlers>[1];
  factionService: Parameters<typeof registerFactionIPCHandlers>[1];
}): void {
  registerCharacterIPCHandlers(options.logger, options.characterService);
  registerTermIPCHandlers(options.logger, options.termService);
  registerEventIPCHandlers(options.logger, options.eventService);
  registerFactionIPCHandlers(options.logger, options.factionService);
}
