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

const MUTATING_CHANNEL_SUFFIX = [
  ":create",
  ":update",
  ":delete",
  ":restore",
  ":purge",
  ":reorder",
  ":set-",
  ":run-now",
  "fs:write-",
  "fs:create-",
  "auto-save",
];

const AUTO_SYNC_EXCLUDED_PREFIXES = [
  "sync:",
  "settings:",
  "window:",
  "logger:",
  "app:",
  "recovery:",
];

const shouldTriggerAutoSync = (channel: string): boolean =>
  !AUTO_SYNC_EXCLUDED_PREFIXES.some((prefix) => channel.startsWith(prefix)) &&
  MUTATING_CHANNEL_SUFFIX.some((suffix) => channel.includes(suffix));

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
      if (shouldTriggerAutoSync(options.channel)) {
        void import("../../services/features/syncService.js")
          .then(({ syncService }) => {
            syncService.onLocalMutation(options.channel);
          })
          .catch((error) => {
            options.logger.error(
              "Failed to trigger auto sync after local mutation",
              withLogContext({ error }, { requestId, channel: options.channel }),
            );
          });
      }
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
