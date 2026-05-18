import { IPC_CHANNELS } from "../../../shared/ipc/channels.js";
import type { NoteCreateInput, NoteUpdateInput } from "../../../shared/types/index.js";
import { registerIpcHandlers } from "../core/ipcRegistrar.js";
import { noteCreateSchema, noteIdSchema, noteUpdateSchema, projectIdSchema } from "../../../shared/schemas/index.js";
import { z } from "zod";
import type { LoggerLike } from "../core/types.js";

type NoteServiceLike = {
  createNote: (input: NoteCreateInput) => Promise<unknown>;
  getNote: (id: string) => Promise<unknown>;
  getAllNotes: (projectId: string) => Promise<unknown>;
  updateNote: (input: NoteUpdateInput) => Promise<unknown>;
  deleteNote: (id: string) => Promise<unknown>;
};

export function registerNoteIPCHandlers(logger: LoggerLike, noteService: NoteServiceLike): void {
  registerIpcHandlers(logger, [
    {
      channel: IPC_CHANNELS.NOTE_CREATE,
      logTag: "NOTE_CREATE",
      failMessage: "Failed to create note",
      argsSchema: z.tuple([noteCreateSchema]),
      handler: (input: NoteCreateInput) => noteService.createNote(input),
    },
    {
      channel: IPC_CHANNELS.NOTE_GET,
      logTag: "NOTE_GET",
      failMessage: "Failed to get note",
      argsSchema: z.tuple([noteIdSchema]),
      handler: (id: string) => noteService.getNote(id),
    },
    {
      channel: IPC_CHANNELS.NOTE_GET_ALL,
      logTag: "NOTE_GET_ALL",
      failMessage: "Failed to get notes",
      argsSchema: z.tuple([projectIdSchema]),
      handler: (projectId: string) => noteService.getAllNotes(projectId),
    },
    {
      channel: IPC_CHANNELS.NOTE_UPDATE,
      logTag: "NOTE_UPDATE",
      failMessage: "Failed to update note",
      argsSchema: z.tuple([noteUpdateSchema]),
      handler: (input: NoteUpdateInput) => noteService.updateNote(input),
    },
    {
      channel: IPC_CHANNELS.NOTE_DELETE,
      logTag: "NOTE_DELETE",
      failMessage: "Failed to delete note",
      argsSchema: z.tuple([noteIdSchema]),
      handler: (id: string) => noteService.deleteNote(id),
    },
  ]);
}
