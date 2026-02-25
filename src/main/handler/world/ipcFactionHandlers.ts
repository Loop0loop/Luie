import { IPC_CHANNELS } from "../../../shared/ipc/channels.js";
import type {
    FactionCreateInput,
    FactionUpdateInput,
} from "../../../shared/types/index.js";
import { registerIpcHandlers } from "../core/ipcRegistrar.js";
import {
    factionCreateSchema,
    factionUpdateSchema,
    factionIdSchema,
    projectIdSchema,
} from "../../../shared/schemas/index.js";
import { z } from "zod";
import type { LoggerLike } from "../core/types.js";

type FactionServiceLike = {
    createFaction: (input: FactionCreateInput) => Promise<unknown>;
    getFaction: (id: string) => Promise<unknown>;
    getAllFactions: (projectId: string) => Promise<unknown>;
    updateFaction: (input: FactionUpdateInput) => Promise<unknown>;
    deleteFaction: (id: string) => Promise<unknown>;
};

export function registerFactionIPCHandlers(
    logger: LoggerLike,
    factionService: FactionServiceLike,
): void {
    registerIpcHandlers(logger, [
        {
            channel: IPC_CHANNELS.FACTION_CREATE,
            logTag: "FACTION_CREATE",
            failMessage: "Failed to create faction",
            argsSchema: z.tuple([factionCreateSchema]),
            handler: (input: FactionCreateInput) =>
                factionService.createFaction(input),
        },
        {
            channel: IPC_CHANNELS.FACTION_GET,
            logTag: "FACTION_GET",
            failMessage: "Failed to get faction",
            argsSchema: z.tuple([factionIdSchema]),
            handler: (id: string) => factionService.getFaction(id),
        },
        {
            channel: IPC_CHANNELS.FACTION_GET_ALL,
            logTag: "FACTION_GET_ALL",
            failMessage: "Failed to get all factions",
            argsSchema: z.tuple([projectIdSchema]),
            handler: (projectId: string) => factionService.getAllFactions(projectId),
        },
        {
            channel: IPC_CHANNELS.FACTION_UPDATE,
            logTag: "FACTION_UPDATE",
            failMessage: "Failed to update faction",
            argsSchema: z.tuple([factionUpdateSchema]),
            handler: (input: FactionUpdateInput) =>
                factionService.updateFaction(input),
        },
        {
            channel: IPC_CHANNELS.FACTION_DELETE,
            logTag: "FACTION_DELETE",
            failMessage: "Failed to delete faction",
            argsSchema: z.tuple([factionIdSchema]),
            handler: (id: string) => factionService.deleteFaction(id),
        },
    ]);
}
