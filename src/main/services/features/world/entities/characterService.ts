/**
 * Character service - 캐릭터 관리 비즈니스 로직
 */

import { eq, isNull, like, or, asc, and, inArray } from "drizzle-orm";
import { db } from "../../../../infra/database/index.js";
import { character, entityRelation } from "../../../../infra/database/index.js";
import { createLogger } from "../../../../../shared/logger/index.js";
import { ErrorCode } from "../../../../../shared/constants/index.js";
import type {
  CharacterCreateInput,
  CharacterUpdateInput,
  CharacterAppearanceInput,
} from "../../../../../shared/types/index.js";
import { rebuildProjectKeywordAppearances } from "../../manuscript/chapterKeywords.js";
import { projectService } from "../../project/projectService.js";
import { ServiceError } from "../../../../utils/error/index.js";
import { escapeLike } from "../../../../utils/query/index.js";
import { bumpProjectRevision } from "../../../core/project/projectRevisionStore.js";
import { mergeStructuredAttributes } from "./worldEntityUpdateHelpers.js";

const loadAppearanceCacheService = async () =>
  (await import("../cache/appearanceCacheService.js")).appearanceCacheService;

const logger = createLogger("CharacterService");

export const getWorldDbClient = () => db.getClient();

export class CharacterService {
  async createCharacter(input: CharacterCreateInput) {
    try {
      logger.info("Creating character", input);

      const now = new Date().toISOString();
      const result = db.getClient().transaction((tx) => {
        const created = tx
          .insert(character)
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
            ErrorCode.CHARACTER_CREATE_FAILED,
            "Failed to create character",
            { input },
          );
        }
        bumpProjectRevision(tx, input.projectId, now);
        return created;
      });

      logger.info("Character created successfully", {
        characterId: result.id,
      });
      void rebuildProjectKeywordAppearances(input.projectId, {
        includeCharacters: true,
        includeTerms: false,
      }).catch((error) =>
        logger.warn("Failed to rebuild character appearances", error),
      );
      projectService.schedulePackageExport(
        input.projectId,
        "character:create",
      );
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
      const results = await db
        .getClient()
        .select()
        .from(character)
        .where(eq(character.id, id))
        .limit(1);

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
      const results = await db
        .getClient()
        .select()
        .from(character)
        .where(
          and(eq(character.projectId, projectId), isNull(character.deletedAt)),
        )
        .orderBy(asc(character.createdAt));

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
          .from(character)
          .where(eq(character.id, input.id))
          .get();
        if (!current || current.deletedAt) {
          throw new ServiceError(
            ErrorCode.CHARACTER_NOT_FOUND,
            "Character not found",
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
          .update(character)
          .set(updateData)
          .where(eq(character.id, input.id))
          .returning()
          .get();
        if (!next) {
          throw new ServiceError(
            ErrorCode.CHARACTER_NOT_FOUND,
            "Character not found",
            { id: input.id },
          );
        }
        bumpProjectRevision(tx, String(current.projectId), now);
        return next;
      });

      logger.info("Character updated successfully", {
        characterId: updated.id,
      });
      if (input.name !== undefined) {
        void rebuildProjectKeywordAppearances(String(updated.projectId), {
          includeCharacters: true,
          includeTerms: false,
        }).catch((error) => logger.warn("Failed to rebuild character appearances", error));
      }
      projectService.schedulePackageExport(
        String(updated.projectId),
        "character:update",
      );
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
      const now = new Date().toISOString();

      const projectId = db.getClient().transaction((tx) => {
        const current = tx
          .select()
          .from(character)
          .where(eq(character.id, id))
          .get();
        if (!current || current.deletedAt) {
          throw new ServiceError(
            ErrorCode.CHARACTER_NOT_FOUND,
            "Character not found",
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
          .update(character)
          .set({ deletedAt: now, updatedAt: now })
          .where(eq(character.id, id))
          .returning()
          .get();
        if (!deleted) {
          throw new ServiceError(
            ErrorCode.CHARACTER_NOT_FOUND,
            "Character not found",
            { id },
          );
        }
        bumpProjectRevision(tx, String(current.projectId), now);
        return String(current.projectId);
      });
      void loadAppearanceCacheService()
        .then((service) => service.clearCharacterEntity(id))
        .catch((error) =>
          logger.warn("Failed to clear character appearances", error),
        );

      logger.info("Character deleted successfully", { characterId: id });
      projectService.schedulePackageExport(projectId, "character:delete");
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
      const characters = await db
        .getClient()
        .select()
        .from(character)
        .where(
          and(inArray(character.id, characterIds), isNull(character.deletedAt)),
        );
      const characterById = new Map(characters.map((c) => [c.id, c]));

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
      const results = await db
        .getClient()
        .select()
        .from(character)
        .where(eq(character.id, characterId))
        .limit(1);
      const char = results[0];

      if (!char || char.deletedAt) {
        throw new ServiceError(
          ErrorCode.CHARACTER_NOT_FOUND,
          "Character not found",
          { characterId },
        );
      }

      if (!char.firstAppearance) {
        await db
          .getClient()
          .update(character)
          .set({ firstAppearance: chapterId })
          .where(eq(character.id, characterId));

        logger.info("First appearance updated", { characterId, chapterId });
        await projectService.touchProject(String(char.projectId));
        await projectService.persistPackageAfterMutation(
          String(char.projectId),
          "character:update-first-appearance",
        );
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
      const results = await db
        .getClient()
        .select()
        .from(character)
        .where(
          and(
            eq(character.projectId, projectId),
            or(
              like(character.name, searchPattern),
              like(character.description, searchPattern),
            ),
            isNull(character.deletedAt),
          ),
        )
        .orderBy(asc(character.name));

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
