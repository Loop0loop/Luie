import type { ZodType } from "zod";
import { registerIpcHandler } from "./ipcHandler.js";
import type { LoggerLike } from "./types.js";

type MaybePromise<T> = T | Promise<T>;

export type IpcHandlerConfig<TArgs extends unknown[] = unknown[], TResult = unknown> = {
  channel: string;
  logTag?: string;
  failMessage: string;
  argsSchema?: ZodType<TArgs>;
  handler(...args: TArgs): MaybePromise<TResult>;
};

type AnyIpcHandlerConfig = IpcHandlerConfig<unknown[], unknown>;

export function registerIpcHandlers(
  logger: LoggerLike,
  handlers: AnyIpcHandlerConfig[],
): void {
  handlers.forEach((handler) => {
    registerIpcHandler({
      logger,
      channel: handler.channel,
      logTag: handler.logTag,
      failMessage: handler.failMessage,
      argsSchema: handler.argsSchema,
      handler: handler.handler,
    });
  });
}
