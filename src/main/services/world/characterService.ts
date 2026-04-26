/**
 * Character service - 캐릭터 관리 비즈니스 로직
 */

import { eq, isNull, like, or, asc, and, inArray } from "drizzle-orm";
import { db } from "../../database/index.js";
import { character, entityRelation } from "../../database/schema.js";
import { createLogger } from "../../../shared/logger/index.js";
import { ErrorCode } from "../../../shared/constants/index.js";
import type {
  CharacterCreateInput,
  CharacterUpdateInput,
  CharacterAppearanceInput,
} from "../../../shared/types/index.js";
import { rebuildProjectKeywordAppearances } from "../core/chapterKeywords.js";
import { projectService } from "../core/projectService.js";
import { ServiceError } from "../../utils/serviceError.js";
import { escapeLike } from "../../utils/queryHelpers.js";

const loadAppearanceCacheService = async () =>
  (await import("./appearanceCacheService.js")).appearanceCacheService;

const logger = createLogger("CharacterService");

export const getWorldDbClient = () => db.getClient();

export class CharacterService {
  async createCharacter(input: CharacterCreateInput) {
    try {
      logger.info("Creating character", input);

      const now = new Date().toISOString();
      const [result] = await db.getClient().insert(character).values({
        id: crypto.randomUUID(),
        projectId: input.projectId,
        name: input.name,
        description: input.description ?? null,
        firstAppearance: input.firstAppearance ?? null,
        attributes: input.attributes
          ? JSON.stringify(input.attributes)
          : null,
        updatedAt: now,
      }).returning();

      if (!result) {
        throw new ServiceError(
          ErrorCode.CHARACTER_CREATE_FAILED,
          "Failed to create character",
          { input },
        );
      }

      logger.info("Character created successfully", {
        characterId: result.id,
      });
      await rebuildProjectKeywordAppearances(input.projectId, {
        includeCharacters: true,
        includeTerms: false,
      });
      await projectService.touchProject(input.projectId);
      await projectService.persistPackageAfterMutation(input.projectId, "character:create");
      return result;
    } catch (error) {
      logger.error("Failed to create character", error);
      if (error instanceof ServiceError) throw error;
      throw new ServiceError(
        ErrorCode.CHARACTER_CREATE_FAILED,
        "Failed to create character",
        { input },
        error,
      );
    }
  }

  async getCharacter(id: string) {
    try {
      const results = await db.getClient().select().from(character).where(eq(character.id, id)).limit(1);

      if (results.length === 0) {
        throw new ServiceError(
          ErrorCode.CHARACTER_NOT_FOUND,
          "Character not found",
          { id },
        );
      }
      const char = results[0];
      if (char.deletedAt) {
        throw new ServiceError(
          ErrorCode.CHARACTER_NOT_FOUND,
          "Character not found",
          { id },
        );
      }

      const appearanceCacheService = await loadAppearanceCacheService();
      const appearances =
        await appearanceCacheService.getCharacterAppearancesByEntity(id);
      return {
        ...char,
        appearances,
      };
    } catch (error) {
      logger.error("Failed to get character", error);
      if (error instanceof ServiceError) throw error;
      throw error;
    }
  }

  async getAllCharacters(projectId: string) {
    try {
      const results = await db.getClient().select().from(character).where(and(eq(character.projectId, projectId), isNull(character.deletedAt))).orderBy(asc(character.createdAt));

      return results;
    } catch (error) {
      logger.error("Failed to get all characters", error);
      throw new ServiceError(
        ErrorCode.DB_QUERY_FAILED,
        "Failed to get all characters",
        { projectId },
        error,
      );
    }
  }

  async updateCharacter(input: CharacterUpdateInput) {
    try {
      const updateData: Partial<typeof character.$inferInsert> = {};

      if (input.name !== undefined) updateData.name = input.name;
      if (input.description !== undefined)
        updateData.description = input.description;
      if (input.firstAppearance !== undefined)
        updateData.firstAppearance = input.firstAppearance;
      if (input.attributes !== undefined) {
        updateData.attributes = JSON.stringify(input.attributes);
      }

      const currentResults = await db.getClient().select({ id: character.id, projectId: character.projectId, deletedAt: character.deletedAt }).from(character).where(eq(character.id, input.id)).limit(1);
      const current = currentResults[0];
      if (!current || current.deletedAt) {
        throw new ServiceError(
          ErrorCode.CHARACTER_NOT_FOUND,
          "Character not found",
          { id: input.id },
        );
      }

      const [updated] = await db.getClient().update(character).set(updateData).where(eq(character.id, input.id)).returning();

      if (!updated) {
        throw new ServiceError(
          ErrorCode.CHARACTER_NOT_FOUND,
          "Character not found",
          { id: input.id },
        );
      }

      logger.info("Character updated successfully", {
        characterId: updated.id,
      });
      if (input.name !== undefined) {
        await rebuildProjectKeywordAppearances(String(updated.projectId), {
          includeCharacters: true,
          includeTerms: false,
        });
      }
      await projectService.touchProject(String(updated.projectId));
      await projectService.persistPackageAfterMutation(String(updated.projectId), "character:update");
      return updated;
    } catch (error) {
      logger.error("Failed to update character", error);
      if (error instanceof ServiceError) throw error;
      throw new ServiceError(
        ErrorCode.CHARACTER_UPDATE_FAILED,
        "Failed to update character",
        { input },
        error,
      );
    }
  }

  async deleteCharacter(id: string) {
    try {
      const currentResults = await db.getClient().select({ projectId: character.projectId, deletedAt: character.deletedAt }).from(character).where(eq(character.id, id)).limit(1);
      const current = currentResults[0];

      const projectId = current?.projectId ?? null;
      const now = new Date().toISOString();

      await db.getClient().transaction(async (tx) => {
        if (projectId) {
          await tx.delete(entityRelation).where(or(eq(entityRelation.sourceId, id), eq(entityRelation.targetId, id)));
        }
        const [result] = await tx.update(character).set({ deletedAt: now, updatedAt: now }).where(eq(character.id, id)).returning({ id: character.id });
        if (!result) {
          throw new ServiceError(
            ErrorCode.CHARACTER_NOT_FOUND,
            "Character not found",
            { id },
          );
        }
      });
      const appearanceCacheService = await loadAppearanceCacheService();
      await appearanceCacheService.clearCharacterEntity(id);

      logger.info("Character deleted successfully", { characterId: id });
      if (projectId) {
        await projectService.touchProject(projectId);
        await projectService.persistPackageAfterMutation(projectId, "character:delete");
      }
      return { success: true };
    } catch (error) {
      logger.error("Failed to delete character", error);
      throw new ServiceError(
        ErrorCode.CHARACTER_DELETE_FAILED,
        "Failed to delete character",
        { id },
        error,
      );
    }
  }

  async recordAppearance(input: CharacterAppearanceInput) {
    try {
      const appearanceCacheService = await loadAppearanceCacheService();
      const appearance =
        await appearanceCacheService.recordCharacterAppearance(input);

      logger.info("Character appearance recorded", {
        characterId: input.characterId,
        chapterId: input.chapterId,
      });

      return appearance;
    } catch (error) {
      logger.error("Failed to record character appearance", error);
      throw new ServiceError(
        ErrorCode.DB_QUERY_FAILED,
        "Failed to record character appearance",
        { input },
        error,
      );
    }
  }

  async getAppearancesByChapter(chapterId: string) {
    try {
      const appearanceCacheService = await loadAppearanceCacheService();
      const appearances =
        await appearanceCacheService.getCharacterAppearancesByChapter(
          chapterId,
        );
      const characterIds = Array.from(
        new Set(appearances.map((appearance) => appearance.characterId)),
      );
      const characters = await db.getClient().select().from(character).where(and(inArray(character.id, characterIds), isNull(character.deletedAt)));
      const characterById = new Map(
        characters.map((c) => [c.id, c]),
      );

      return appearances.map((appearance) => ({
        ...appearance,
        character: characterById.get(appearance.characterId) ?? null,
      }));
    } catch (error) {
      logger.error("Failed to get appearances by chapter", error);
      throw new ServiceError(
        ErrorCode.DB_QUERY_FAILED,
        "Failed to get character appearances",
        { chapterId },
        error,
      );
    }
  }

  async updateFirstAppearance(characterId: string, chapterId: string) {
    try {
      const results = await db.getClient().select().from(character).where(eq(character.id, characterId)).limit(1);
      const char = results[0];

      if (!char || char.deletedAt) {
        throw new ServiceError(
          ErrorCode.CHARACTER_NOT_FOUND,
          "Character not found",
          { characterId },
        );
      }

      if (!char.firstAppearance) {
        await db.getClient().update(character).set({ firstAppearance: chapterId }).where(eq(character.id, characterId));

        logger.info("First appearance updated", { characterId, chapterId });
        await projectService.touchProject(String(char.projectId));
        await projectService.persistPackageAfterMutation(String(char.projectId), "character:update-first-appearance");
      }
    } catch (error) {
      logger.error("Failed to update first appearance", error);
      if (error instanceof ServiceError) throw error;
      throw new ServiceError(
        ErrorCode.CHARACTER_UPDATE_FAILED,
        "Failed to update first appearance",
        { characterId, chapterId },
        error,
      );
    }
  }

  async searchCharacters(projectId: string, query: string) {
    try {
      const searchPattern = `%${escapeLike(query)}%`;
      const results = await db.getClient().select().from(character).where(and(eq(character.projectId, projectId), or(like(character.name, searchPattern), like(character.description, searchPattern)), isNull(character.deletedAt))).orderBy(asc(character.name));

      return results;
    } catch (error) {
      logger.error("Failed to search characters", error);
      throw new ServiceError(
        ErrorCode.SEARCH_QUERY_FAILED,
        "Failed to search characters",
        { projectId, query },
        error,
      );
    }
  }
}

export const characterService = new CharacterService();
