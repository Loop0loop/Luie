import type { createLogger } from "../../../shared/logger/index.js";

export type LoggerLike = {
  error: (message: string, data?: unknown) => void;
};

export type AppLogger = ReturnType<typeof createLogger>;
