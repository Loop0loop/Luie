import type { CharacterAppearanceInput } from "../../../shared/types/index.js";
import { IPC_CHANNELS } from "../../../shared/ipc/channels.js";
import type {
  CharacterCreateInput,
  CharacterUpdateInput,
} from "../../../shared/types/index.js";
import { registerIpcHandlers } from "../core/ipcRegistrar.js";
import {
  characterCreateSchema,
  characterUpdateSchema,
  characterIdSchema,
  projectIdSchema,
  characterAppearanceSchema,
} from "../../../shared/schemas/index.js";
import { z } from "zod";
import { registerAppearanceIPCHandlers } from "./ipcAppearanceHandlers.js";
import type { LoggerLike } from "../core/types.js";

type CharacterServiceLike = {
  createCharacter: (input: CharacterCreateInput) => Promise<unknown>;
  getCharacter: (id: string) => Promise<unknown>;
  getAllCharacters: (projectId: string) => Promise<unknown>;
  updateCharacter: (input: CharacterUpdateInput) => Promise<unknown>;
  deleteCharacter: (id: string) => Promise<unknown>;
  recordAppearance: (input: CharacterAppearanceInput) => Promise<unknown>;
  getAppearancesByChapter: (chapterId: string) => Promise<unknown>;
};

export function registerCharacterIPCHandlers(
  logger: LoggerLike,
  characterService: CharacterServiceLike,
): void {
  registerIpcHandlers(logger, [
    {
      channel: IPC_CHANNELS.CHARACTER_CREATE,
      logTag: "CHARACTER_CREATE",
      failMessage: "Failed to create character",
      argsSchema: z.tuple([characterCreateSchema]),
      handler: (input: CharacterCreateInput) =>
        characterService.createCharacter(input),
    },
    {
      channel: IPC_CHANNELS.CHARACTER_GET,
      logTag: "CHARACTER_GET",
      failMessage: "Failed to get character",
      argsSchema: z.tuple([characterIdSchema]),
      handler: (id: string) => characterService.getCharacter(id),
    },
    {
      channel: IPC_CHANNELS.CHARACTER_GET_ALL,
      logTag: "CHARACTER_GET_ALL",
      failMessage: "Failed to get all characters",
      argsSchema: z.tuple([projectIdSchema]),
      handler: (projectId: string) => characterService.getAllCharacters(projectId),
    },
    {
      channel: IPC_CHANNELS.CHARACTER_UPDATE,
      logTag: "CHARACTER_UPDATE",
      failMessage: "Failed to update character",
      argsSchema: z.tuple([characterUpdateSchema]),
      handler: (input: CharacterUpdateInput) =>
        characterService.updateCharacter(input),
    },
    {
      channel: IPC_CHANNELS.CHARACTER_DELETE,
      logTag: "CHARACTER_DELETE",
      failMessage: "Failed to delete character",
      argsSchema: z.tuple([characterIdSchema]),
      handler: (id: string) => characterService.deleteCharacter(id),
    },
  ]);

  registerAppearanceIPCHandlers<CharacterAppearanceInput>({
    logger,
    service: characterService,
    record: {
      channel: "character:record-appearance",
      logTag: "CHARACTER_RECORD_APPEARANCE",
      failMessage: "Failed to record character appearance",
      schema: characterAppearanceSchema,
    },
    get: {
      channel: "character:get-appearances",
      logTag: "CHARACTER_GET_APPEARANCES",
      failMessage: "Failed to get character appearances",
    },
  });
}
