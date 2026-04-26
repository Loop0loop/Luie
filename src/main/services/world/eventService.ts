import { eq, isNull, asc, and, or } from "drizzle-orm";
import { db } from "../../database/index.js";
import { event, entityRelation } from "../../database/schema.js";
import { createLogger } from "../../../shared/logger/index.js";
import { ErrorCode } from "../../../shared/constants/index.js";
import type {
    EventCreateInput,
    EventUpdateInput,
} from "../../../shared/types/index.js";
import { projectService } from "../core/projectService.js";
import { ServiceError } from "../../utils/serviceError.js";

const logger = createLogger("EventService");

export class EventService {
    async createEvent(input: EventCreateInput) {
        try {
            logger.info("Creating event", input);

            const now = new Date().toISOString();
            const [result] = await db.getClient().insert(event).values({
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
                    ErrorCode.EVENT_CREATE_FAILED,
                    "Failed to create event",
                    { input },
                );
            }

            logger.info("Event created successfully", {
                eventId: result.id,
            });
            await projectService.touchProject(input.projectId);
            await projectService.persistPackageAfterMutation(input.projectId, "event:create");
            return result;
        } catch (error) {
            logger.error("Failed to create event", error);
            if (error instanceof ServiceError) throw error;
            throw new ServiceError(
                ErrorCode.EVENT_CREATE_FAILED,
                "Failed to create event",
                { input },
                error,
            );
        }
    }

    async getEvent(id: string) {
        try {
            const results = await db.getClient().select().from(event).where(eq(event.id, id)).limit(1);

            if (results.length === 0) {
                throw new ServiceError(
                    ErrorCode.EVENT_NOT_FOUND,
                    "Event not found",
                    { id },
                );
            }
            const e = results[0];
            if (e.deletedAt) {
                throw new ServiceError(
                    ErrorCode.EVENT_NOT_FOUND,
                    "Event not found",
                    { id },
                );
            }

            return e;
        } catch (error) {
            logger.error("Failed to get event", error);
            if (error instanceof ServiceError) throw error;
            throw error;
        }
    }

    async getAllEvents(projectId: string) {
        try {
            const results = await db.getClient().select().from(event).where(and(eq(event.projectId, projectId), isNull(event.deletedAt))).orderBy(asc(event.createdAt));

            return results;
        } catch (error) {
            logger.error("Failed to get all events", error);
            throw new ServiceError(
                ErrorCode.DB_QUERY_FAILED,
                "Failed to get all events",
                { projectId },
                error,
            );
        }
    }

    async updateEvent(input: EventUpdateInput) {
        try {
            const updateData: Partial<typeof event.$inferInsert> = {};

            if (input.name !== undefined) updateData.name = input.name;
            if (input.description !== undefined) updateData.description = input.description;
            if (input.firstAppearance !== undefined)
                updateData.firstAppearance = input.firstAppearance;
            if (input.attributes !== undefined) {
                updateData.attributes = JSON.stringify(input.attributes);
            }

            const currentResults = await db.getClient().select({ id: event.id, projectId: event.projectId, deletedAt: event.deletedAt }).from(event).where(eq(event.id, input.id)).limit(1);
            const current = currentResults[0];
            if (!current || current.deletedAt) {
                throw new ServiceError(
                    ErrorCode.EVENT_NOT_FOUND,
                    "Event not found",
                    { id: input.id },
                );
            }

            const [updated] = await db.getClient().update(event).set(updateData).where(eq(event.id, input.id)).returning();

            if (!updated) {
                throw new ServiceError(
                    ErrorCode.EVENT_UPDATE_FAILED,
                    "Event not found",
                    { id: input.id },
                );
            }

            logger.info("Event updated successfully", {
                eventId: updated.id,
            });
            await projectService.touchProject(String(updated.projectId));
            await projectService.persistPackageAfterMutation(String(updated.projectId), "event:update");
            return updated;
        } catch (error) {
            logger.error("Failed to update event", error);
            if (error instanceof ServiceError) throw error;
            throw new ServiceError(
                ErrorCode.EVENT_UPDATE_FAILED,
                "Failed to update event",
                { input },
                error,
            );
        }
    }

    async deleteEvent(id: string) {
        try {
            const currentResults = await db.getClient().select({ projectId: event.projectId, deletedAt: event.deletedAt }).from(event).where(eq(event.id, id)).limit(1);
            const current = currentResults[0];

            const projectId = current?.projectId ?? null;
            const now = new Date().toISOString();

            await db.getClient().transaction(async (tx) => {
                if (projectId) {
                    await tx.delete(entityRelation).where(or(eq(entityRelation.sourceId, id), eq(entityRelation.targetId, id)));
                }
                const [result] = await tx.update(event).set({ deletedAt: now, updatedAt: now }).where(eq(event.id, id)).returning({ id: event.id });
                if (!result) {
                    throw new ServiceError(
                        ErrorCode.EVENT_NOT_FOUND,
                        "Event not found",
                        { id },
                    );
                }
            });

            logger.info("Event deleted successfully", { eventId: id });
            if (projectId) {
                await projectService.touchProject(projectId);
                await projectService.persistPackageAfterMutation(projectId, "event:delete");
            }
            return { success: true };
        } catch (error) {
            logger.error("Failed to delete event", error);
            throw new ServiceError(
                ErrorCode.EVENT_DELETE_FAILED,
                "Failed to delete event",
                { id },
                error,
            );
        }
    }
}

export const eventService = new EventService();
