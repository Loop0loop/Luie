import { db } from "../../database/index.js";
import { createLogger } from "../../../shared/logger/index.js";
import { ErrorCode } from "../../../shared/constants/index.js";
import type {
    FactionCreateInput,
    FactionUpdateInput,
} from "../../../shared/types/index.js";
import { projectService } from "../core/projectService.js";
import { ServiceError } from "../../utils/serviceError.js";

const logger = createLogger("FactionService");

function isPrismaNotFoundError(error: unknown): boolean {
    return (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: unknown }).code === "P2025"
    );
}

export class FactionService {
    async createFaction(input: FactionCreateInput) {
        try {
            logger.info("Creating faction", input);

            const faction = await db.getClient().faction.create({
                data: {
                    projectId: input.projectId,
                    name: input.name,
                    description: input.description,
                    firstAppearance: input.firstAppearance,
                    attributes: input.attributes ? JSON.stringify(input.attributes) : null,
                },
            });

            logger.info("Faction created successfully", {
                factionId: faction.id,
            });
            projectService.schedulePackageExport(input.projectId, "faction:create");
            return faction;
        } catch (error) {
            logger.error("Failed to create faction", error);
            throw new ServiceError(
                ErrorCode.DB_QUERY_FAILED,
                "Failed to create faction",
                { input },
                error,
            );
        }
    }

    async getFaction(id: string) {
        try {
            const faction = await db.getClient().faction.findUnique({
                where: { id },
            });

            if (!faction) {
                throw new ServiceError(
                    ErrorCode.DB_QUERY_FAILED,
                    "Faction not found",
                    { id },
                );
            }

            return faction;
        } catch (error) {
            logger.error("Failed to get faction", error);
            throw error;
        }
    }

    async getAllFactions(projectId: string) {
        try {
            const factions = await db.getClient().faction.findMany({
                where: { projectId },
                orderBy: { createdAt: "asc" },
            });

            return factions;
        } catch (error) {
            logger.error("Failed to get all factions", error);
            throw new ServiceError(
                ErrorCode.DB_QUERY_FAILED,
                "Failed to get all factions",
                { projectId },
                error,
            );
        }
    }

    async updateFaction(input: FactionUpdateInput) {
        try {
            const updateData: Record<string, unknown> = {};

            if (input.name !== undefined) updateData.name = input.name;
            if (input.description !== undefined) updateData.description = input.description;
            if (input.firstAppearance !== undefined)
                updateData.firstAppearance = input.firstAppearance;
            if (input.attributes !== undefined) {
                updateData.attributes = JSON.stringify(input.attributes);
            }

            const faction = await db.getClient().faction.update({
                where: { id: input.id },
                data: updateData,
            });

            logger.info("Faction updated successfully", {
                factionId: faction.id,
            });
            projectService.schedulePackageExport(String(faction.projectId), "faction:update");
            return faction;
        } catch (error) {
            logger.error("Failed to update faction", error);
            if (isPrismaNotFoundError(error)) {
                throw new ServiceError(
                    ErrorCode.DB_QUERY_FAILED,
                    "Faction not found",
                    { id: input.id },
                    error,
                );
            }
            throw new ServiceError(
                ErrorCode.DB_QUERY_FAILED,
                "Failed to update faction",
                { input },
                error,
            );
        }
    }

    async deleteFaction(id: string) {
        try {
            const faction = await db.getClient().faction.findUnique({
                where: { id },
                select: { projectId: true },
            });

            const projectId =
                (faction as { projectId?: unknown })?.projectId
                    ? String((faction as { projectId: unknown }).projectId)
                    : null;

            await db.getClient().$transaction(async (tx: ReturnType<(typeof db)["getClient"]>) => {
                if (projectId) {
                    await tx.entityRelation.deleteMany({
                        where: {
                            projectId,
                            OR: [{ sourceId: id }, { targetId: id }],
                        },
                    });
                }
                await tx.faction.deleteMany({ where: { id } });
            });

            logger.info("Faction deleted successfully", { factionId: id });
            if (projectId) {
                projectService.schedulePackageExport(
                    projectId,
                    "faction:delete",
                );
            }
            return { success: true };
        } catch (error) {
            logger.error("Failed to delete faction", error);
            throw new ServiceError(
                ErrorCode.DB_QUERY_FAILED,
                "Failed to delete faction",
                { id },
                error,
            );
        }
    }
}

export const factionService = new FactionService();
