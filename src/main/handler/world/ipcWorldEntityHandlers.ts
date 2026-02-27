import { IPC_CHANNELS } from "../../../shared/ipc/channels.js";
import type {
    WorldEntityCreateInput,
    WorldEntityUpdateInput,
    WorldEntityUpdatePositionInput,
} from "../../../shared/types/index.js";
import { registerIpcHandlers } from "../core/ipcRegistrar.js";
import {
    worldEntityCreateSchema,
    worldEntityUpdateSchema,
    worldEntityUpdatePositionSchema,
    worldEntityIdSchema,
    projectIdSchema,
} from "../../../shared/schemas/index.js";
import { z } from "zod";
import type { LoggerLike } from "../core/types.js";

type WorldEntityServiceLike = {
    createWorldEntity: (input: WorldEntityCreateInput) => Promise<unknown>;
    getWorldEntity: (id: string) => Promise<unknown>;
    getAllWorldEntities: (projectId: string) => Promise<unknown>;
    updateWorldEntity: (input: WorldEntityUpdateInput) => Promise<unknown>;
    updateWorldEntityPosition: (input: WorldEntityUpdatePositionInput) => Promise<unknown>;
    deleteWorldEntity: (id: string) => Promise<unknown>;
};

export function registerWorldEntityIPCHandlers(
    logger: LoggerLike,
    worldEntityService: WorldEntityServiceLike,
): void {
    registerIpcHandlers(logger, [
        {
            channel: IPC_CHANNELS.WORLD_ENTITY_CREATE,
            logTag: "WORLD_ENTITY_CREATE",
            failMessage: "Failed to create world entity",
            argsSchema: z.tuple([worldEntityCreateSchema]),
            handler: (input: WorldEntityCreateInput) =>
                worldEntityService.createWorldEntity(input),
        },
        {
            channel: IPC_CHANNELS.WORLD_ENTITY_GET,
            logTag: "WORLD_ENTITY_GET",
            failMessage: "Failed to get world entity",
            argsSchema: z.tuple([worldEntityIdSchema]),
            handler: (id: string) => worldEntityService.getWorldEntity(id),
        },
        {
            channel: IPC_CHANNELS.WORLD_ENTITY_GET_ALL,
            logTag: "WORLD_ENTITY_GET_ALL",
            failMessage: "Failed to get all world entities",
            argsSchema: z.tuple([projectIdSchema]),
            handler: (projectId: string) => worldEntityService.getAllWorldEntities(projectId),
        },
        {
            channel: IPC_CHANNELS.WORLD_ENTITY_UPDATE,
            logTag: "WORLD_ENTITY_UPDATE",
            failMessage: "Failed to update world entity",
            argsSchema: z.tuple([worldEntityUpdateSchema]),
            handler: (input: WorldEntityUpdateInput) =>
                worldEntityService.updateWorldEntity(input),
        },
        {
            channel: IPC_CHANNELS.WORLD_ENTITY_UPDATE_POSITION,
            logTag: "WORLD_ENTITY_UPDATE_POSITION",
            failMessage: "Failed to update world entity position",
            argsSchema: z.tuple([worldEntityUpdatePositionSchema]),
            handler: (input: WorldEntityUpdatePositionInput) =>
                worldEntityService.updateWorldEntityPosition(input),
        },
        {
            channel: IPC_CHANNELS.WORLD_ENTITY_DELETE,
            logTag: "WORLD_ENTITY_DELETE",
            failMessage: "Failed to delete world entity",
            argsSchema: z.tuple([worldEntityIdSchema]),
            handler: (id: string) => worldEntityService.deleteWorldEntity(id),
        },
    ]);
}
