import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "../../../../infra/database/index.js";
import { plot } from "../../../../infra/database/index.js";
import { createLogger } from "../../../../../shared/logger/index.js";
import { ErrorCode } from "../../../../../shared/constants/index.js";
import type {
  PlotCreateInput,
  PlotUpdateInput,
} from "../../../../../shared/types/index.js";
import { ServiceError } from "../../../../utils/error/index.js";
import { projectService } from "../../project/projectService.js";
import { dbMaintenanceService } from "../../dbMaintenance/index.js";
import { MEMORY_TARGET_TYPES } from "../../memory/memoryJobConstants.js";

const logger = createLogger("PlotService");

class PlotService {
  async createPlot(input: PlotCreateInput) {
    try {
      const now = new Date().toISOString();
      const [created] = await db
        .getClient()
        .insert(plot)
        .values({
          id: crypto.randomUUID(),
          projectId: input.projectId,
          title: input.title,
          body: input.body ?? "",
          updatedAt: now,
        })
        .returning();

      if (!created)
        throw new ServiceError(
          ErrorCode.PLOT_CREATE_FAILED,
          "Failed to create plot",
          { input },
        );

      await dbMaintenanceService.rebuildMemoryChunks({
        projectId: input.projectId,
        sourceType: MEMORY_TARGET_TYPES.PLOT,
        sourceId: String(created.id),
      });
      await projectService.touchProject(input.projectId);
      await projectService.persistPackageAfterMutation(
        input.projectId,
        "plot:create",
      );
      return created;
    } catch (error) {
      logger.error("Failed to create plot", error);
      if (error instanceof ServiceError) throw error;
      throw new ServiceError(
        ErrorCode.PLOT_CREATE_FAILED,
        "Failed to create plot",
        { input },
        error,
      );
    }
  }

  async getPlot(id: string) {
    const [found] = await db
      .getClient()
      .select()
      .from(plot)
      .where(and(eq(plot.id, id), isNull(plot.deletedAt)))
      .limit(1);
    if (!found)
      throw new ServiceError(ErrorCode.PLOT_NOT_FOUND, "Plot not found", {
        id,
      });
    return found;
  }

  async getAllPlots(projectId: string) {
    return db
      .getClient()
      .select()
      .from(plot)
      .where(and(eq(plot.projectId, projectId), isNull(plot.deletedAt)))
      .orderBy(asc(plot.updatedAt));
  }

  async updatePlot(input: PlotUpdateInput) {
    try {
      const [current] = await db
        .getClient()
        .select({ id: plot.id, projectId: plot.projectId })
        .from(plot)
        .where(and(eq(plot.id, input.id), isNull(plot.deletedAt)))
        .limit(1);
      if (!current)
        throw new ServiceError(ErrorCode.PLOT_NOT_FOUND, "Plot not found", {
          id: input.id,
        });

      const patch: Partial<typeof plot.$inferInsert> = {
        updatedAt: new Date().toISOString(),
      };
      if (input.title !== undefined) patch.title = input.title;
      if (input.body !== undefined) patch.body = input.body;

      const [updated] = await db
        .getClient()
        .update(plot)
        .set(patch)
        .where(eq(plot.id, input.id))
        .returning();
      if (!updated)
        throw new ServiceError(ErrorCode.PLOT_NOT_FOUND, "Plot not found", {
          id: input.id,
        });

      await dbMaintenanceService.rebuildMemoryChunks({
        projectId: String(updated.projectId),
        sourceType: MEMORY_TARGET_TYPES.PLOT,
        sourceId: String(updated.id),
      });
      await projectService.touchProject(String(updated.projectId));
      await projectService.persistPackageAfterMutation(
        String(updated.projectId),
        "plot:update",
      );
      return updated;
    } catch (error) {
      logger.error("Failed to update plot", error);
      if (error instanceof ServiceError) throw error;
      throw new ServiceError(
        ErrorCode.PLOT_UPDATE_FAILED,
        "Failed to update plot",
        { input },
        error,
      );
    }
  }

  async deletePlot(id: string) {
    try {
      const [current] = await db
        .getClient()
        .select({ id: plot.id, projectId: plot.projectId })
        .from(plot)
        .where(and(eq(plot.id, id), isNull(plot.deletedAt)))
        .limit(1);
      if (!current)
        throw new ServiceError(ErrorCode.PLOT_NOT_FOUND, "Plot not found", {
          id,
        });

      const now = new Date().toISOString();
      await db
        .getClient()
        .update(plot)
        .set({ deletedAt: now, updatedAt: now })
        .where(eq(plot.id, id));
      await dbMaintenanceService.rebuildMemoryChunks({
        projectId: String(current.projectId),
        sourceType: MEMORY_TARGET_TYPES.PLOT,
        sourceId: id,
      });
      await projectService.touchProject(String(current.projectId));
      await projectService.persistPackageAfterMutation(
        String(current.projectId),
        "plot:delete",
      );
      return { success: true };
    } catch (error) {
      logger.error("Failed to delete plot", error);
      if (error instanceof ServiceError) throw error;
      throw new ServiceError(
        ErrorCode.PLOT_DELETE_FAILED,
        "Failed to delete plot",
        { id },
        error,
      );
    }
  }
}

export const plotService = new PlotService();
