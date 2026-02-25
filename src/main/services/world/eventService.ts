import { db } from "../../database/index.js";
import { createLogger } from "../../../shared/logger/index.js";
import { ErrorCode } from "../../../shared/constants/index.js";
import type {
    EventCreateInput,
    EventUpdateInput,
} from "../../../shared/types/index.js";
import { projectService } from "../core/projectService.js";
import { ServiceError } from "../../utils/serviceError.js";

const logger = createLogger("EventService");

function isPrismaNotFoundError(error: unknown): boolean {
    return (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: unknown }).code === "P2025"
    );
}

export class EventService {
    async createEvent(input: EventCreateInput) {
        try {
            logger.info("Creating event", input);

            const event = await db.getClient().event.create({
                data: {
                    projectId: input.projectId,
                    name: input.name,
                    description: input.description,
                    firstAppearance: input.firstAppearance,
                    attributes: input.attributes ? JSON.stringify(input.attributes) : null,
                },
            });

            logger.info("Event created successfully", {
                eventId: event.id,
            });
            projectService.schedulePackageExport(input.projectId, "event:create");
            return event;
        } catch (error) {
            logger.error("Failed to create event", error);
            throw new ServiceError(
                ErrorCode.DB_QUERY_FAILED,
                "Failed to create event",
                { input },
                error,
            );
        }
    }

    async getEvent(id: string) {
        try {
            const event = await db.getClient().event.findUnique({
                where: { id },
            });

            if (!event) {
                throw new ServiceError(
                    ErrorCode.DB_QUERY_FAILED,
                    "Event not found",
                    { id },
                );
            }

            return event;
        } catch (error) {
            logger.error("Failed to get event", error);
            throw error;
        }
    }

    async getAllEvents(projectId: string) {
        try {
            const events = await db.getClient().event.findMany({
                where: { projectId },
                orderBy: { createdAt: "asc" },
            });

            return events;
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
            const updateData: Record<string, unknown> = {};

            if (input.name !== undefined) updateData.name = input.name;
            if (input.description !== undefined) updateData.description = input.description;
            if (input.firstAppearance !== undefined)
                updateData.firstAppearance = input.firstAppearance;
            if (input.attributes !== undefined) {
                updateData.attributes = JSON.stringify(input.attributes);
            }

            const event = await db.getClient().event.update({
                where: { id: input.id },
                data: updateData,
            });

            logger.info("Event updated successfully", {
                eventId: event.id,
            });
            projectService.schedulePackageExport(String(event.projectId), "event:update");
            return event;
        } catch (error) {
            logger.error("Failed to update event", error);
            if (isPrismaNotFoundError(error)) {
                throw new ServiceError(
                    ErrorCode.DB_QUERY_FAILED,
                    "Event not found",
                    { id: input.id },
                    error,
                );
            }
            throw new ServiceError(
                ErrorCode.DB_QUERY_FAILED,
                "Failed to update event",
                { input },
                error,
            );
        }
    }

    async deleteEvent(id: string) {
        try {
            const event = await db.getClient().event.findUnique({
                where: { id },
                select: { projectId: true },
            });

            await db.getClient().event.deleteMany({ where: { id } });

            logger.info("Event deleted successfully", { eventId: id });
            if ((event as { projectId?: unknown })?.projectId) {
                projectService.schedulePackageExport(
                    String((event as { projectId: unknown }).projectId),
                    "event:delete",
                );
            }
            return { success: true };
        } catch (error) {
            logger.error("Failed to delete event", error);
            throw new ServiceError(
                ErrorCode.DB_QUERY_FAILED,
                "Failed to delete event",
                { id },
                error,
            );
        }
    }
}

export const eventService = new EventService();
