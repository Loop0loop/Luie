import { ipcMain } from "electron";
import {
  createErrorResponse,
  createSuccessResponse,
} from "../../../shared/ipc/index.js";

type LoggerLike = {
  error: (message: string, data?: unknown) => void;
};

type MaybePromise<T> = T | Promise<T>;

export function registerIpcHandler<TArgs extends unknown[], TResult>(options: {
  logger: LoggerLike;
  channel: string;
  logTag?: string;
  failMessage: string;
  handler: (...args: TArgs) => MaybePromise<TResult>;
}): void {
  ipcMain.handle(options.channel, async (_event, ...args: unknown[]) => {
    try {
      const result = await options.handler(...(args as TArgs));
      return createSuccessResponse(result);
    } catch (error) {
      const tag = options.logTag ?? options.channel;
      options.logger.error(`${tag} failed`, error);
      return createErrorResponse(
        (error as Error).message,
        options.failMessage,
      );
    }
  });
}
