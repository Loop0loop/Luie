/**
 * WorldEntity service — 세계관 엔티티(Place/Concept/Rule/Item) CRUD
 */

import { createLogger } from "../../../shared/logger/index.js";
import { ErrorCode } from "../../../shared/constants/index.js";
import type {
    WorldEntityCreateInput,
    WorldEntityUpdateInput,
    WorldEntityUpdatePositionInput,
} from "../../../shared/types/index.js";
import { ServiceError } from "../../utils/serviceError.js";
import { projectService } from "../core/projectService.js";
import { getWorldDbClient } from "./characterService.js";

const logger = createLogger("WorldEntityService");

function isPrismaNotFoundError(error: unknown): boolean {
    return (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: unknown }).code === "P2025"
    );
}

export class WorldEntityService {
    async createWorldEntity(input: WorldEntityCreateInput) {
        try {
            logger.info("Creating world entity", input);

            const entity = await getWorldDbClient().worldEntity.create({
                data: {
                    projectId: input.projectId,
                    type: input.type,
                    name: input.name,
                    description: input.description,
                    firstAppearance: input.firstAppearance,
                    attributes: input.attributes ? JSON.stringify(input.attributes) : null,
                    positionX: input.positionX ?? 0,
                    positionY: input.positionY ?? 0,
                },
            });

            logger.info("World entity created", { entityId: entity.id });
            projectService.schedulePackageExport(String(entity.projectId), "world-entity:create");
            return entity;
        } catch (error) {
            logger.error("Failed to create world entity", error);
            throw new ServiceError(
                ErrorCode.WORLD_ENTITY_CREATE_FAILED,
                "Failed to create world entity",
                { input },
                error,
            );
        }
    }

    async getWorldEntity(id: string) {
        try {
            const entity = await getWorldDbClient().worldEntity.findUnique({
                where: { id },
            });

            if (!entity) {
                throw new ServiceError(
                    ErrorCode.WORLD_ENTITY_NOT_FOUND,
                    "World entity not found",
                    { id },
                );
            }

            return entity;
        } catch (error) {
            logger.error("Failed to get world entity", error);
            throw error;
        }
    }

    async getAllWorldEntities(projectId: string) {
        try {
            const entities = await getWorldDbClient().worldEntity.findMany({
                where: { projectId },
                orderBy: { createdAt: "asc" },
            });

            return entities;
        } catch (error) {
            logger.error("Failed to get all world entities", error);
            throw new ServiceError(
                ErrorCode.DB_QUERY_FAILED,
                "Failed to get all world entities",
                { projectId },
                error,
            );
        }
    }

    async updateWorldEntity(input: WorldEntityUpdateInput) {
        try {
            const updateData: Record<string, unknown> = {};

            if (input.type !== undefined) updateData.type = input.type;
            if (input.name !== undefined) updateData.name = input.name;
            if (input.description !== undefined) updateData.description = input.description;
            if (input.firstAppearance !== undefined) updateData.firstAppearance = input.firstAppearance;
            if (input.attributes !== undefined) {
                updateData.attributes = JSON.stringify(input.attributes);
            }

            const entity = await getWorldDbClient().worldEntity.update({
                where: { id: input.id },
                data: updateData,
            });

            logger.info("World entity updated", { entityId: entity.id });
            projectService.schedulePackageExport(String(entity.projectId), "world-entity:update");
            return entity;
        } catch (error) {
            logger.error("Failed to update world entity", error);
            if (isPrismaNotFoundError(error)) {
                throw new ServiceError(
                    ErrorCode.WORLD_ENTITY_NOT_FOUND,
                    "World entity not found",
                    { id: input.id },
                    error,
                );
            }
            throw new ServiceError(
                ErrorCode.WORLD_ENTITY_UPDATE_FAILED,
                "Failed to update world entity",
                { input },
                error,
            );
        }
    }

    async updateWorldEntityPosition(input: WorldEntityUpdatePositionInput) {
        try {
            const entity = await getWorldDbClient().worldEntity.update({
                where: { id: input.id },
                data: { positionX: input.positionX, positionY: input.positionY },
            });

            projectService.schedulePackageExport(String(entity.projectId), "world-entity:update-position");
            return entity;
        } catch (error) {
            logger.error("Failed to update world entity position", error);
            if (isPrismaNotFoundError(error)) {
                throw new ServiceError(
                    ErrorCode.WORLD_ENTITY_NOT_FOUND,
                    "World entity not found",
                    { id: input.id },
                    error,
                );
            }
            throw new ServiceError(
                ErrorCode.WORLD_ENTITY_UPDATE_FAILED,
                "Failed to update position",
                { input },
                error,
            );
        }
    }

    async deleteWorldEntity(id: string) {
        try {
            const deleted = await getWorldDbClient().worldEntity.delete({ where: { id } });
            logger.info("World entity deleted", { entityId: id });
            projectService.schedulePackageExport(String(deleted.projectId), "world-entity:delete");
            return { success: true };
        } catch (error) {
            logger.error("Failed to delete world entity", error);
            throw new ServiceError(
                ErrorCode.WORLD_ENTITY_DELETE_FAILED,
                "Failed to delete world entity",
                { id },
                error,
            );
        }
    }
}

export const worldEntityService = new WorldEntityService();
