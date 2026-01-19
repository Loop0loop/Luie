import type { createLogger } from "../../../shared/logger/index.js";
import { registerCharacterIPCHandlers } from "./ipcCharacterHandlers.js";
import { registerTermIPCHandlers } from "./ipcTermHandlers.js";

type LoggerLike = ReturnType<typeof createLogger>;

export function registerWorldHandlers(options: {
  logger: LoggerLike;
  characterService: Parameters<typeof registerCharacterIPCHandlers>[1];
  termService: Parameters<typeof registerTermIPCHandlers>[1];
}): void {
  registerCharacterIPCHandlers(options.logger, options.characterService);
  registerTermIPCHandlers(options.logger, options.termService);
}
