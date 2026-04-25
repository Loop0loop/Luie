import { eq, isNull, asc, and, or } from "drizzle-orm";
import { db } from "../../database/index.js";
import { faction, entityRelation } from "../../database/schema.js";
import { createLogger } from "../../../shared/logger/index.js";
import { ErrorCode } from "../../../shared/constants/index.js";
import type {
    FactionCreateInput,
    FactionUpdateInput,
} from "../../../shared/types/index.js";
import { projectService } from "../core/projectService.js";
import { ServiceError } from "../../utils/serviceError.js";

const logger = createLogger("FactionService");

export class FactionService {
    async createFaction(input: FactionCreateInput) {
        try {
            logger.info("Creating faction", input);

            const now = new Date().toISOString();
            const [result] = await db.getDrizzleClient().insert(faction).values({
                id: crypto.randomUUID(),
                projectId: input.projectId,
                name: input.name,
                description: input.description ?? null,
                firstAppearance: input.firstAppearance ?? null,
                attributes: input.attributes ? JSON.stringify(input.attributes) : null,
                updatedAt: now,
            }).returning();

            if (!result) {
                throw new ServiceError(
                    ErrorCode.FACTION_CREATE_FAILED,
                    "Failed to create faction",
                    { input },
                );
            }

            logger.info("Faction created successfully", {
                factionId: result.id,
            });
            await projectService.touchProject(input.projectId);
            await projectService.persistPackageAfterMutation(input.projectId, "faction:create");
            return result;
        } catch (error) {
            logger.error("Failed to create faction", error);
            if (error instanceof ServiceError) throw error;
            throw new ServiceError(
                ErrorCode.FACTION_CREATE_FAILED,
                "Failed to create faction",
                { input },
                error,
            );
        }
    }

    async getFaction(id: string) {
        try {
            const results = await db.getDrizzleClient().select().from(faction).where(eq(faction.id, id)).limit(1);

            if (results.length === 0) {
                throw new ServiceError(
                    ErrorCode.FACTION_NOT_FOUND,
                    "Faction not found",
                    { id },
                );
            }
            const f = results[0];
            if (f.deletedAt) {
                throw new ServiceError(
                    ErrorCode.FACTION_NOT_FOUND,
                    "Faction not found",
                    { id },
                );
            }

            return f;
        } catch (error) {
            logger.error("Failed to get faction", error);
            if (error instanceof ServiceError) throw error;
            throw error;
        }
    }

    async getAllFactions(projectId: string) {
        try {
            const results = await db.getDrizzleClient().select().from(faction).where(and(eq(faction.projectId, projectId), isNull(faction.deletedAt))).orderBy(asc(faction.createdAt));

            return results;
        } catch (error) {
            logger.error("Failed to get all factions", error);
            throw new ServiceError(
                ErrorCode.FACTION_NOT_FOUND,
                "Failed to get all factions",
                { projectId },
                error,
            );
        }
    }

    async updateFaction(input: FactionUpdateInput) {
        try {
            const updateData: Partial<typeof faction.$inferInsert> = {};

            if (input.name !== undefined) updateData.name = input.name;
            if (input.description !== undefined) updateData.description = input.description;
            if (input.firstAppearance !== undefined)
                updateData.firstAppearance = input.firstAppearance;
            if (input.attributes !== undefined) {
                updateData.attributes = JSON.stringify(input.attributes);
            }

            const currentResults = await db.getDrizzleClient().select({ id: faction.id, projectId: faction.projectId, deletedAt: faction.deletedAt }).from(faction).where(eq(faction.id, input.id)).limit(1);
            const current = currentResults[0];
            if (!current || current.deletedAt) {
                throw new ServiceError(
                    ErrorCode.FACTION_NOT_FOUND,
                    "Faction not found",
                    { id: input.id },
                );
            }

            const [updated] = await db.getDrizzleClient().update(faction).set(updateData).where(eq(faction.id, input.id)).returning();

            if (!updated) {
                throw new ServiceError(
                    ErrorCode.FACTION_UPDATE_FAILED,
                    "Faction not found",
                    { id: input.id },
                );
            }

            logger.info("Faction updated successfully", {
                factionId: updated.id,
            });
            await projectService.touchProject(String(updated.projectId));
            await projectService.persistPackageAfterMutation(String(updated.projectId), "faction:update");
            return updated;
        } catch (error) {
            logger.error("Failed to update faction", error);
            if (error instanceof ServiceError) throw error;
            throw new ServiceError(
                ErrorCode.FACTION_UPDATE_FAILED,
                "Failed to update faction",
                { input },
                error,
            );
        }
    }

    async deleteFaction(id: string) {
        try {
            const currentResults = await db.getDrizzleClient().select({ projectId: faction.projectId, deletedAt: faction.deletedAt }).from(faction).where(eq(faction.id, id)).limit(1);
            const current = currentResults[0];

            const projectId = current?.projectId ?? null;
            const now = new Date().toISOString();

            await db.getDrizzleClient().transaction(async (tx) => {
                if (projectId) {
                    await tx.delete(entityRelation).where(or(eq(entityRelation.sourceId, id), eq(entityRelation.targetId, id)));
                }
                const [result] = await tx.update(faction).set({ deletedAt: now, updatedAt: now }).where(eq(faction.id, id)).returning({ id: faction.id });
                if (!result) {
                    throw new ServiceError(
                        ErrorCode.FACTION_NOT_FOUND,
                        "Faction not found",
                        { id },
                    );
                }
            });

            logger.info("Faction deleted successfully", { factionId: id });
            if (projectId) {
                await projectService.touchProject(projectId);
                await projectService.persistPackageAfterMutation(projectId, "faction:delete");
            }
            return { success: true };
        } catch (error) {
            logger.error("Failed to delete faction", error);
            throw new ServiceError(
                ErrorCode.FACTION_DELETE_FAILED,
                "Failed to delete faction",
                { id },
                error,
            );
        }
    }
}

export const factionService = new FactionService();
