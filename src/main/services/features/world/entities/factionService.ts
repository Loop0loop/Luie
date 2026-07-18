import { eq, isNull, asc, and, or } from "drizzle-orm";
import { db } from "../../../../infra/database/index.js";
import { faction, entityRelation } from "../../../../infra/database/index.js";
import { createLogger } from "../../../../../shared/logger/index.js";
import { ErrorCode } from "../../../../../shared/constants/index.js";
import type {
  FactionCreateInput,
  FactionUpdateInput,
} from "../../../../../shared/types/index.js";
import { projectService } from "../../project/projectService.js";
import { ServiceError } from "../../../../utils/error/index.js";
import { bumpProjectRevision } from "../../../core/project/projectRevisionStore.js";
import { mergeStructuredAttributes } from "./worldEntityUpdateHelpers.js";

const logger = createLogger("FactionService");

export class FactionService {
  async createFaction(input: FactionCreateInput) {
    try {
      logger.info("Creating faction", input);

      const now = new Date().toISOString();
      const result = db.getClient().transaction((tx) => {
        const created = tx
          .insert(faction)
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
            ErrorCode.FACTION_CREATE_FAILED,
            "Failed to create faction",
            { input },
          );
        }
        bumpProjectRevision(tx, input.projectId, now);
        return created;
      });

      logger.info("Faction created successfully", {
        factionId: result.id,
      });
      projectService.schedulePackageExport(
        input.projectId,
        "faction:create",
      );
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
      const results = await db
        .getClient()
        .select()
        .from(faction)
        .where(eq(faction.id, id))
        .limit(1);

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
      const results = await db
        .getClient()
        .select()
        .from(faction)
        .where(and(eq(faction.projectId, projectId), isNull(faction.deletedAt)))
        .orderBy(asc(faction.createdAt));

      return results;
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
      const updateData: Partial<typeof faction.$inferInsert> = {};
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
          .from(faction)
          .where(eq(faction.id, input.id))
          .get();
        if (!current || current.deletedAt) {
          throw new ServiceError(
            ErrorCode.FACTION_NOT_FOUND,
            "Faction not found",
            { id: input.id },
          );
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
          .update(faction)
          .set(updateData)
          .where(eq(faction.id, input.id))
          .returning()
          .get();
        if (!next) {
          throw new ServiceError(
            ErrorCode.FACTION_UPDATE_FAILED,
            "Faction not found",
            { id: input.id },
          );
        }
        bumpProjectRevision(tx, String(current.projectId), now);
        return next;
      });

      logger.info("Faction updated successfully", {
        factionId: updated.id,
      });
      projectService.schedulePackageExport(
        String(updated.projectId),
        "faction:update",
      );
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
      const now = new Date().toISOString();

      const projectId = db.getClient().transaction((tx) => {
        const current = tx
          .select()
          .from(faction)
          .where(eq(faction.id, id))
          .get();
        if (!current || current.deletedAt) {
          throw new ServiceError(
            ErrorCode.FACTION_NOT_FOUND,
            "Faction not found",
            { id },
          );
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
          .update(faction)
          .set({ deletedAt: now, updatedAt: now })
          .where(eq(faction.id, id))
          .returning()
          .get();
        if (!deleted) {
          throw new ServiceError(
            ErrorCode.FACTION_NOT_FOUND,
            "Faction not found",
            { id },
          );
        }
        bumpProjectRevision(tx, String(current.projectId), now);
        return String(current.projectId);
      });

      logger.info("Faction deleted successfully", { factionId: id });
      projectService.schedulePackageExport(projectId, "faction:delete");
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
