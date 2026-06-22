import { IPC_CHANNELS } from "../../../shared/ipc/channels.js";
import type {
    EventCreateInput,
    EventUpdateInput,
} from "../../../shared/types/index.js";
import { registerIpcHandlers } from "../core/ipcRegistrar.js";
import {
    eventCreateSchema,
    eventUpdateSchema,
    eventIdSchema,
    projectIdSchema,
} from "../../../shared/schemas/index.js";
import { z } from "zod";
import type { LoggerLike } from "../core/types.js";

type EventServiceLike = {
    createEvent: (input: EventCreateInput) => Promise<unknown>;
    getEvent: (id: string) => Promise<unknown>;
    getAllEvents: (projectId: string) => Promise<unknown>;
    updateEvent: (input: EventUpdateInput) => Promise<unknown>;
    deleteEvent: (id: string) => Promise<unknown>;
};

export function registerEventIPCHandlers(
    logger: LoggerLike,
    eventService: EventServiceLike,
): void {
    registerIpcHandlers(logger, [
        {
            channel: IPC_CHANNELS.EVENT_CREATE,
            logTag: "EVENT_CREATE",
            failMessage: "Failed to create event",
            argsSchema: z.tuple([eventCreateSchema]),
            handler: (input: EventCreateInput) =>
                eventService.createEvent(input),
        },
        {
            channel: IPC_CHANNELS.EVENT_GET,
            logTag: "EVENT_GET",
            failMessage: "Failed to get event",
            argsSchema: z.tuple([eventIdSchema]),
            handler: (id: string) => eventService.getEvent(id),
        },
        {
            channel: IPC_CHANNELS.EVENT_GET_ALL,
            logTag: "EVENT_GET_ALL",
            failMessage: "Failed to get all events",
            argsSchema: z.tuple([projectIdSchema]),
            handler: (projectId: string) => eventService.getAllEvents(projectId),
        },
        {
            channel: IPC_CHANNELS.EVENT_UPDATE,
            logTag: "EVENT_UPDATE",
            failMessage: "Failed to update event",
            argsSchema: z.tuple([eventUpdateSchema]),
            handler: (input: EventUpdateInput) =>
                eventService.updateEvent(input),
        },
        {
            channel: IPC_CHANNELS.EVENT_DELETE,
            logTag: "EVENT_DELETE",
            failMessage: "Failed to delete event",
            argsSchema: z.tuple([eventIdSchema]),
            handler: (id: string) => eventService.deleteEvent(id),
        },
    ]);
}
