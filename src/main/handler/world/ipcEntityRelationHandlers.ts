import { IPC_CHANNELS } from "../../../shared/ipc/channels.js";
import type {
    EntityRelationCreateInput,
    EntityRelationUpdateInput,
} from "../../../shared/types/index.js";
import { registerIpcHandlers } from "../core/ipcRegistrar.js";
import {
    entityRelationCreateSchema,
    entityRelationUpdateSchema,
    entityRelationIdSchema,
    projectIdSchema,
} from "../../../shared/schemas/index.js";
import { z } from "zod";
import type { LoggerLike } from "../core/types.js";

type EntityRelationServiceLike = {
    createRelation: (input: EntityRelationCreateInput) => Promise<unknown>;
    getAllRelations: (projectId: string) => Promise<unknown>;
    updateRelation: (input: EntityRelationUpdateInput) => Promise<unknown>;
    deleteRelation: (id: string) => Promise<unknown>;
    getWorldGraph: (projectId: string) => Promise<unknown>;
};

export function registerEntityRelationIPCHandlers(
    logger: LoggerLike,
    entityRelationService: EntityRelationServiceLike,
): void {
    registerIpcHandlers(logger, [
        {
            channel: IPC_CHANNELS.ENTITY_RELATION_CREATE,
            logTag: "ENTITY_RELATION_CREATE",
            failMessage: "Failed to create entity relation",
            argsSchema: z.tuple([entityRelationCreateSchema]),
            handler: (input: EntityRelationCreateInput) =>
                entityRelationService.createRelation(input),
        },
        {
            channel: IPC_CHANNELS.ENTITY_RELATION_GET_ALL,
            logTag: "ENTITY_RELATION_GET_ALL",
            failMessage: "Failed to get entity relations",
            argsSchema: z.tuple([projectIdSchema]),
            handler: (projectId: string) =>
                entityRelationService.getAllRelations(projectId),
        },
        {
            channel: IPC_CHANNELS.ENTITY_RELATION_UPDATE,
            logTag: "ENTITY_RELATION_UPDATE",
            failMessage: "Failed to update entity relation",
            argsSchema: z.tuple([entityRelationUpdateSchema]),
            handler: (input: EntityRelationUpdateInput) =>
                entityRelationService.updateRelation(input),
        },
        {
            channel: IPC_CHANNELS.ENTITY_RELATION_DELETE,
            logTag: "ENTITY_RELATION_DELETE",
            failMessage: "Failed to delete entity relation",
            argsSchema: z.tuple([entityRelationIdSchema]),
            handler: (id: string) => entityRelationService.deleteRelation(id),
        },
        {
            channel: IPC_CHANNELS.WORLD_GRAPH_GET,
            logTag: "WORLD_GRAPH_GET",
            failMessage: "Failed to get world graph",
            argsSchema: z.tuple([projectIdSchema]),
            handler: (projectId: string) =>
                entityRelationService.getWorldGraph(projectId),
        },
    ]);
}
