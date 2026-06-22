import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "../../infra/database/index.js";
import { note } from "../../infra/database/index.js";
import { createLogger } from "../../../shared/logger/index.js";
import { ErrorCode } from "../../../shared/constants/index.js";
import type {
  NoteCreateInput,
  NoteUpdateInput,
} from "../../../shared/types/index.js";
import { ServiceError } from "../../utils/error/index.js";
import { projectService } from "../core/projectService.js";
import { dbMaintenanceService } from "../features/dbMaintenance/index.js";
import { MEMORY_TARGET_TYPES } from "../features/memory/memoryJobConstants.js";

const logger = createLogger("NoteService");

class NoteService {
  async createNote(input: NoteCreateInput) {
    try {
      const now = new Date().toISOString();
      const [created] = await db
        .getClient()
        .insert(note)
        .values({
          id: crypto.randomUUID(),
          projectId: input.projectId,
          chapterId: input.chapterId ?? null,
          title: input.title,
          body: input.body ?? "",
          updatedAt: now,
        })
        .returning();

      if (!created) {
        throw new ServiceError(
          ErrorCode.NOTE_CREATE_FAILED,
          "Failed to create note",
          { input },
        );
      }

      await dbMaintenanceService.rebuildMemoryChunks({
        projectId: input.projectId,
        sourceType: MEMORY_TARGET_TYPES.NOTE,
        sourceId: String(created.id),
      });
      await projectService.touchProject(input.projectId);
      await projectService.persistPackageAfterMutation(
        input.projectId,
        "note:create",
      );
      return created;
    } catch (error) {
      logger.error("Failed to create note", error);
      if (error instanceof ServiceError) throw error;
      throw new ServiceError(
        ErrorCode.NOTE_CREATE_FAILED,
        "Failed to create note",
        { input },
        error,
      );
    }
  }

  async getNote(id: string) {
    const [found] = await db
      .getClient()
      .select()
      .from(note)
      .where(and(eq(note.id, id), isNull(note.deletedAt)))
      .limit(1);
    if (!found)
      throw new ServiceError(ErrorCode.NOTE_NOT_FOUND, "Note not found", {
        id,
      });
    return found;
  }

  async getAllNotes(projectId: string) {
    return db
      .getClient()
      .select()
      .from(note)
      .where(and(eq(note.projectId, projectId), isNull(note.deletedAt)))
      .orderBy(asc(note.updatedAt));
  }

  async updateNote(input: NoteUpdateInput) {
    try {
      const [current] = await db
        .getClient()
        .select({ id: note.id, projectId: note.projectId })
        .from(note)
        .where(and(eq(note.id, input.id), isNull(note.deletedAt)))
        .limit(1);
      if (!current)
        throw new ServiceError(ErrorCode.NOTE_NOT_FOUND, "Note not found", {
          id: input.id,
        });

      const patch: Partial<typeof note.$inferInsert> = {
        updatedAt: new Date().toISOString(),
      };
      if (input.chapterId !== undefined) patch.chapterId = input.chapterId;
      if (input.title !== undefined) patch.title = input.title;
      if (input.body !== undefined) patch.body = input.body;

      const [updated] = await db
        .getClient()
        .update(note)
        .set(patch)
        .where(eq(note.id, input.id))
        .returning();
      if (!updated)
        throw new ServiceError(ErrorCode.NOTE_NOT_FOUND, "Note not found", {
          id: input.id,
        });

      await dbMaintenanceService.rebuildMemoryChunks({
        projectId: String(updated.projectId),
        sourceType: MEMORY_TARGET_TYPES.NOTE,
        sourceId: String(updated.id),
      });
      await projectService.touchProject(String(updated.projectId));
      await projectService.persistPackageAfterMutation(
        String(updated.projectId),
        "note:update",
      );
      return updated;
    } catch (error) {
      logger.error("Failed to update note", error);
      if (error instanceof ServiceError) throw error;
      throw new ServiceError(
        ErrorCode.NOTE_UPDATE_FAILED,
        "Failed to update note",
        { input },
        error,
      );
    }
  }

  async deleteNote(id: string) {
    try {
      const [current] = await db
        .getClient()
        .select({ id: note.id, projectId: note.projectId })
        .from(note)
        .where(and(eq(note.id, id), isNull(note.deletedAt)))
        .limit(1);
      if (!current)
        throw new ServiceError(ErrorCode.NOTE_NOT_FOUND, "Note not found", {
          id,
        });

      const now = new Date().toISOString();
      await db
        .getClient()
        .update(note)
        .set({ deletedAt: now, updatedAt: now })
        .where(eq(note.id, id));
      await dbMaintenanceService.rebuildMemoryChunks({
        projectId: String(current.projectId),
        sourceType: MEMORY_TARGET_TYPES.NOTE,
        sourceId: id,
      });
      await projectService.touchProject(String(current.projectId));
      await projectService.persistPackageAfterMutation(
        String(current.projectId),
        "note:delete",
      );
      return { success: true };
    } catch (error) {
      logger.error("Failed to delete note", error);
      if (error instanceof ServiceError) throw error;
      throw new ServiceError(
        ErrorCode.NOTE_DELETE_FAILED,
        "Failed to delete note",
        { id },
        error,
      );
    }
  }
}

export const noteService = new NoteService();
