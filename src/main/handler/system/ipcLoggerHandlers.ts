import { IPC_CHANNELS } from "../../../shared/ipc/channels.js";
import { registerIpcHandlers } from "../core/ipcRegistrar.js";
import type { LoggerLike } from "../core/types.js";

type LogEntry = { level: string; message: string; data?: unknown };

const logEntry = (
  ipcLogger: { debug: Function; info: Function; warn: Function; error: Function },
  entry: LogEntry,
) => {
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
};

export function registerLoggerIPCHandlers(logger: LoggerLike): void {
  registerIpcHandlers(logger, [
    {
      channel: IPC_CHANNELS.LOGGER_LOG,
      logTag: "LOGGER_LOG",
      failMessage: "Failed to log",
      handler: async ({ level, message, data }: LogEntry) => {
        const { createLogger } = await import("../../../shared/logger/index.js");
        const ipcLogger = createLogger("IPCLogger");
        logEntry(ipcLogger, { level, message, data });
        return { success: true };
      },
    },
    {
      channel: IPC_CHANNELS.LOGGER_LOG_BATCH,
      logTag: "LOGGER_LOG_BATCH",
      failMessage: "Failed to log batch",
      handler: async (entries: LogEntry[]) => {
        const { createLogger } = await import("../../../shared/logger/index.js");
        const ipcLogger = createLogger("IPCLogger");
        for (const entry of entries) {
          logEntry(ipcLogger, entry);
        }
        return { success: true };
      },
    },
  ]);
}
