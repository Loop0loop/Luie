import { registerIpcHandler } from "../core/ipcHandler.js";

type LoggerLike = {
  error: (message: string, data?: unknown) => void;
};

export function registerLoggerIPCHandlers(logger: LoggerLike): void {
  registerIpcHandler({
    logger,
    channel: "logger:log",
    logTag: "LOGGER_LOG",
    failMessage: "Failed to log",
    handler: async ({ level, message, data }: { level: string; message: string; data?: unknown }) => {
      const { createLogger } = await import("../../../shared/logger/index.js");
      const ipcLogger = createLogger("IPCLogger");
      switch (level) {
        case "debug":
          ipcLogger.debug(message, data || undefined);
          break;
        case "info":
          ipcLogger.info(message, data || undefined);
          break;
        case "warn":
          ipcLogger.warn(message, data || undefined);
          break;
        case "error":
          ipcLogger.error(message, data || undefined);
          break;
        default:
          ipcLogger.info(message, data || undefined);
      }
      return { success: true };
    },
  });

  registerIpcHandler({
    logger,
    channel: "logger:log-batch",
    logTag: "LOGGER_LOG_BATCH",
    failMessage: "Failed to log batch",
    handler: async (entries: { level: string; message: string; data?: unknown }[]) => {
      const { createLogger } = await import("../../../shared/logger/index.js");
      const ipcLogger = createLogger("IPCLogger");
      for (const entry of entries) {
        switch (entry.level) {
          case "debug":
            ipcLogger.debug(entry.message, entry.data || undefined);
            break;
          case "info":
            ipcLogger.info(entry.message, entry.data || undefined);
            break;
          case "warn":
            ipcLogger.warn(entry.message, entry.data || undefined);
            break;
          case "error":
            ipcLogger.error(entry.message, entry.data || undefined);
            break;
          default:
            ipcLogger.info(entry.message, entry.data || undefined);
        }
      }
      return { success: true };
    },
  });
}
