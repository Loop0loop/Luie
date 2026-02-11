import { ipcMain } from "electron";
import { randomUUID } from "node:crypto";
import type { ZodType } from "zod";
import {
  createErrorResponse,
  createSuccessResponse,
} from "../../../shared/ipc/index.js";
import { ErrorCode } from "../../../shared/constants/index.js";
import { withLogContext } from "../../../shared/logger/index.js";
import { isServiceError } from "../../utils/serviceError.js";
import type { LoggerLike } from "./types.js";

type MaybePromise<T> = T | Promise<T>;

export function registerIpcHandler<TArgs extends unknown[], TResult>(options: {
  logger: LoggerLike;
  channel: string;
  logTag?: string;
  failMessage: string;
  argsSchema?: ZodType<TArgs>;
  handler: (...args: TArgs) => MaybePromise<TResult>;
}): void {
  ipcMain.handle(options.channel, async (_event, ...args: unknown[]) => {
    const start = Date.now();
    const requestId = randomUUID();
    let parsedArgs = args as TArgs;

    if (options.argsSchema) {
      const parsed = options.argsSchema.safeParse(args);
      if (!parsed.success) {
        const details = {
          issues: parsed.error.issues,
        };
        return createErrorResponse(
          ErrorCode.INVALID_INPUT,
          "Invalid input",
          details,
          {
            timestamp: new Date().toISOString(),
            duration: Date.now() - start,
            requestId,
            channel: options.channel,
          },
        );
      }
      parsedArgs = parsed.data;
    }
    try {
      const result = await options.handler(...parsedArgs);
      return createSuccessResponse(result, {
        timestamp: new Date().toISOString(),
        duration: Date.now() - start,
        requestId,
        channel: options.channel,
      });
    } catch (error) {
      const tag = options.logTag ?? options.channel;
      options.logger.error(
        `${tag} failed`,
        withLogContext({ error }, { requestId, channel: options.channel }),
      );
      const err = error as Error;
      if (isServiceError(err)) {
        return createErrorResponse(
          err.code,
          err.message,
          err.details,
          {
            timestamp: new Date().toISOString(),
            duration: Date.now() - start,
            requestId,
            channel: options.channel,
          },
        );
      }

      const message = err?.message ?? options.failMessage;
      const codeValues = Object.values(ErrorCode) as string[];
      const isKnownCode = codeValues.includes(message);
      return createErrorResponse(
        isKnownCode ? message : ErrorCode.UNKNOWN_ERROR,
        options.failMessage,
        undefined,
        {
          timestamp: new Date().toISOString(),
          duration: Date.now() - start,
          requestId,
          channel: options.channel,
        },
      );
    }
  });
}
