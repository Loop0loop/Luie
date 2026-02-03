import { registerCharacterIPCHandlers } from "./ipcCharacterHandlers.js";
import { registerTermIPCHandlers } from "./ipcTermHandlers.js";
import type { AppLogger } from "../core/types.js";

export function registerWorldHandlers(options: {
  logger: AppLogger;
  characterService: Parameters<typeof registerCharacterIPCHandlers>[1];
  termService: Parameters<typeof registerTermIPCHandlers>[1];
}): void {
  registerCharacterIPCHandlers(options.logger, options.characterService);
  registerTermIPCHandlers(options.logger, options.termService);
}
