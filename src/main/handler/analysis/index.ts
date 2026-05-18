import { registerAnalysisIPCHandlers } from "./ipcAnalysisHandlers.js";
import { registerRagQaIPCHandlers } from "./ipcRagQaHandlers.js";
import type { AppLogger } from "../core/types.js";

export function registerAnalysisHandlers(options: {
  logger: AppLogger;
  manuscriptAnalysisService: Parameters<typeof registerAnalysisIPCHandlers>[1];
  ragQaService: Parameters<typeof registerRagQaIPCHandlers>[1];
}): void {
  registerAnalysisIPCHandlers(options.logger, options.manuscriptAnalysisService);
  registerRagQaIPCHandlers(options.logger, options.ragQaService);
}
