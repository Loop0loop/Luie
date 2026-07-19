import { eq, isNull, asc, and, or } from "drizzle-orm";
import { db } from "../../../../infra/database/index.js";
import { event, entityRelation } from "../../../../infra/database/index.js";
import { createLogger } from "../../../../../shared/logger/index.js";
import { ErrorCode } from "../../../../../shared/constants/index.js";
import type {
  EventCreateInput,
  EventUpdateInput,
} from "../../../../../shared/types/index.js";
import { projectService } from "../../project/projectService.js";
import { ServiceError } from "../../../../utils/error/index.js";
import { touchProjectUpdatedAt } from "../../../core/project/projectRevisionStore.js";
import { mergeStructuredAttributes } from "./worldEntityUpdateHelpers.js";

const logger = createLogger("EventService");

export class EventService {
  async createEvent(input: EventCreateInput) {
    try {
      logger.info("Creating event", input);

      const now = new Date().toISOString();
      const result = db.getClient().transaction((tx) => {
        const created = tx
          .insert(event)
          .values({
            id: crypto.randomUUID(),
            projectId: input.projectId,
            name: input.name,
            description: input.description ?? null,
            firstAppearance: input.firstAppearance ?? null,
            attributes: input.attributes
              ? JSON.stringify(input.attributes)
              : null,
            updatedAt: now,
          })
          .returning()
          .get();
        if (!created) {
          throw new ServiceError(
            ErrorCode.EVENT_CREATE_FAILED,
            "Failed to create event",
            { input },
          );
        }
        touchProjectUpdatedAt(tx, input.projectId, now);
        return created;
      });

      logger.info("Event created successfully", {
        eventId: result.id,
      });
      projectService.schedulePackageExport(input.projectId, "event:create");
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
      const results = await db
        .getClient()
        .select()
        .from(event)
        .where(eq(event.id, id))
        .limit(1);

      if (results.length === 0) {
        throw new ServiceError(ErrorCode.EVENT_NOT_FOUND, "Event not found", {
          id,
        });
      }
      const e = results[0];
      if (e.deletedAt) {
        throw new ServiceError(ErrorCode.EVENT_NOT_FOUND, "Event not found", {
          id,
        });
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
      const results = await db
        .getClient()
        .select()
        .from(event)
        .where(and(eq(event.projectId, projectId), isNull(event.deletedAt)))
        .orderBy(asc(event.createdAt));

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
      const now = new Date().toISOString();

      if (input.name !== undefined) updateData.name = input.name;
      if (input.description !== undefined)
        updateData.description = input.description;
      if (input.firstAppearance !== undefined)
        updateData.firstAppearance = input.firstAppearance;
      updateData.updatedAt = now;

      const updated = db.getClient().transaction((tx) => {
        const current = tx
          .select()
          .from(event)
          .where(eq(event.id, input.id))
          .get();
        if (!current || current.deletedAt) {
          throw new ServiceError(ErrorCode.EVENT_NOT_FOUND, "Event not found", {
            id: input.id,
          });
        }
        if (
          input.attributes !== undefined ||
          input.attributesPatch !== undefined
        ) {
          updateData.attributes = JSON.stringify(
            mergeStructuredAttributes(
              current.attributes,
              input.attributes,
              input.attributesPatch,
            ),
          );
        }
        const next = tx
          .update(event)
          .set(updateData)
          .where(eq(event.id, input.id))
          .returning()
          .get();
        if (!next) {
          throw new ServiceError(
            ErrorCode.EVENT_UPDATE_FAILED,
            "Event not found",
            { id: input.id },
          );
        }
        touchProjectUpdatedAt(tx, String(current.projectId), now);
        return next;
      });

      logger.info("Event updated successfully", {
        eventId: updated.id,
      });
      projectService.schedulePackageExport(
        String(updated.projectId),
        "event:update",
      );
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
      const now = new Date().toISOString();

      const projectId = db.getClient().transaction((tx) => {
        const current = tx.select().from(event).where(eq(event.id, id)).get();
        if (!current || current.deletedAt) {
          throw new ServiceError(ErrorCode.EVENT_NOT_FOUND, "Event not found", {
            id,
          });
        }
        tx.delete(entityRelation)
          .where(
            or(
              eq(entityRelation.sourceId, id),
              eq(entityRelation.targetId, id),
            ),
          )
          .run();
        const deleted = tx
          .update(event)
          .set({ deletedAt: now, updatedAt: now })
          .where(eq(event.id, id))
          .returning()
          .get();
        if (!deleted) {
          throw new ServiceError(ErrorCode.EVENT_NOT_FOUND, "Event not found", {
            id,
          });
        }
        touchProjectUpdatedAt(tx, String(current.projectId), now);
        return String(current.projectId);
      });

      logger.info("Event deleted successfully", { eventId: id });
      projectService.schedulePackageExport(projectId, "event:delete");
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
