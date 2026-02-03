import { z } from "zod";
import { chapterIdSchema } from "../../../shared/schemas/index.js";
import { registerIpcHandlers } from "../core/ipcRegistrar.js";
import type { LoggerLike } from "../core/types.js";

type AppearanceServiceLike<TInput> = {
  recordAppearance: (input: TInput) => Promise<unknown>;
  getAppearancesByChapter: (chapterId: string) => Promise<unknown>;
};

type AppearanceHandlerOptions<TInput> = {
  logger: LoggerLike;
  service: AppearanceServiceLike<TInput>;
  record: {
    channel: string;
    logTag: string;
    failMessage: string;
    schema: z.ZodType<TInput>;
  };
  get: {
    channel: string;
    logTag: string;
    failMessage: string;
  };
};

export function registerAppearanceIPCHandlers<TInput>(
  options: AppearanceHandlerOptions<TInput>,
): void {
  registerIpcHandlers(options.logger, [
    {
      channel: options.record.channel,
      logTag: options.record.logTag,
      failMessage: options.record.failMessage,
      argsSchema: z.tuple([options.record.schema]),
      handler: (input: TInput) => options.service.recordAppearance(input),
    },
    {
      channel: options.get.channel,
      logTag: options.get.logTag,
      failMessage: options.get.failMessage,
      argsSchema: z.tuple([chapterIdSchema]),
      handler: (chapterId: string) => options.service.getAppearancesByChapter(chapterId),
    },
  ]);
}
