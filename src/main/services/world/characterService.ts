/**
 * Character service - 캐릭터 관리 비즈니스 로직
 */

import type { Prisma } from "@prisma/client";
import { db } from "../../database/index.js";
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

const loadAppearanceCacheService = async () =>
  (await import("./appearanceCacheService.js")).appearanceCacheService;

const logger = createLogger("CharacterService");

export const getWorldDbClient = () => db.getClient();

function isPrismaNotFoundError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2025"
  );
}

export class CharacterService {
  async createCharacter(input: CharacterCreateInput) {
    try {
      logger.info("Creating character", input);

      const character = await db.getClient().character.create({
        data: {
          projectId: input.projectId,
          name: input.name,
          description: input.description,
          firstAppearance: input.firstAppearance,
          attributes: input.attributes
            ? JSON.stringify(input.attributes)
            : null,
        },
      });

      logger.info("Character created successfully", {
        characterId: character.id,
      });
      await rebuildProjectKeywordAppearances(input.projectId, {
        includeCharacters: true,
        includeTerms: false,
      });
      await projectService.touchProject(input.projectId);
      await projectService.persistPackageAfterMutation(input.projectId, "character:create");
      return character;
    } catch (error) {
      logger.error("Failed to create character", error);
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
      const character = await db.getClient().character.findUnique({
        where: { id },
      });

      if (!character) {
        throw new ServiceError(
          ErrorCode.CHARACTER_NOT_FOUND,
          "Character not found",
          { id },
        );
      }
      if ("deletedAt" in character && character.deletedAt) {
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
        ...character,
        appearances,
      };
    } catch (error) {
      logger.error("Failed to get character", error);
      throw error;
    }
  }

  async getAllCharacters(projectId: string) {
    try {
      const characters = await db.getClient().character.findMany({
        where: { projectId, deletedAt: null },
        orderBy: { createdAt: "asc" },
      });

      return characters;
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
      const updateData: Record<string, unknown> = {};

      if (input.name !== undefined) updateData.name = input.name;
      if (input.description !== undefined)
        updateData.description = input.description;
      if (input.firstAppearance !== undefined)
        updateData.firstAppearance = input.firstAppearance;
      if (input.attributes !== undefined) {
        updateData.attributes = JSON.stringify(input.attributes);
      }

      const current = await db.getClient().character.findUnique({
        where: { id: input.id },
        select: { id: true, projectId: true, deletedAt: true },
      });
      if (!current || current.deletedAt) {
        throw new ServiceError(
          ErrorCode.CHARACTER_NOT_FOUND,
          "Character not found",
          { id: input.id },
        );
      }

      const character = await db.getClient().character.update({
        where: { id: input.id },
        data: updateData,
      });

      logger.info("Character updated successfully", {
        characterId: character.id,
      });
      if (input.name !== undefined) {
        await rebuildProjectKeywordAppearances(String(character.projectId), {
          includeCharacters: true,
          includeTerms: false,
        });
      }
      await projectService.touchProject(String(character.projectId));
      await projectService.persistPackageAfterMutation(String(character.projectId), "character:update");
      return character;
    } catch (error) {
      logger.error("Failed to update character", error);
      if (isPrismaNotFoundError(error)) {
        throw new ServiceError(
          ErrorCode.CHARACTER_NOT_FOUND,
          "Character not found",
          { id: input.id },
          error,
        );
      }
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
      const character = await db.getClient().character.findUnique({
        where: { id },
        select: { projectId: true, deletedAt: true },
      });

      const projectId = (character as { projectId?: unknown })?.projectId
        ? String((character as { projectId: unknown }).projectId)
        : null;
      const now = new Date();

      await db
        .getClient()
        .$transaction(async (tx: Prisma.TransactionClient) => {
          if (projectId) {
            await tx.entityRelation.deleteMany({
              where: {
                projectId,
                OR: [{ sourceId: id }, { targetId: id }],
              },
            });
          }
          await tx.character.updateMany({
            where: { id },
            data: {
              deletedAt: now,
              updatedAt: now,
            },
          });
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
      const characters = await db.getClient().character.findMany({
        where: { id: { in: characterIds }, deletedAt: null },
      });
      const characterById = new Map(
        characters.map((character) => [String(character.id), character]),
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
      const character = await db.getClient().character.findUnique({
        where: { id: characterId },
      });

      if (!character || character.deletedAt) {
        throw new ServiceError(
          ErrorCode.CHARACTER_NOT_FOUND,
          "Character not found",
          { characterId },
        );
      }

      if (!character.firstAppearance) {
        await db.getClient().character.update({
          where: { id: characterId },
          data: { firstAppearance: chapterId },
        });

        logger.info("First appearance updated", { characterId, chapterId });
        await projectService.touchProject(String(character.projectId));
        await projectService.persistPackageAfterMutation(String(character.projectId), "character:update-first-appearance");
      }
    } catch (error) {
      logger.error("Failed to update first appearance", error);
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
      const characters = await db.getClient().character.findMany({
        where: {
          projectId,
          OR: [
            { name: { contains: query } },
            { description: { contains: query } },
          ],
          deletedAt: null,
        },
        orderBy: { name: "asc" },
      });

      return characters;
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
