/**
 * Character service - 캐릭터 관리 비즈니스 로직
 */

import { db } from "../../database/index.js";
import { createLogger } from "../../../shared/logger/index.js";
import { ErrorCode } from "../../../shared/constants/index.js";
import type {
  CharacterCreateInput,
  CharacterUpdateInput,
  CharacterAppearanceInput,
} from "../../../shared/types/index.js";
import { projectService } from "../core/projectService.js";
import { ServiceError } from "../../utils/serviceError.js";

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
          attributes: input.attributes ? JSON.stringify(input.attributes) : null,
        },
      });

      logger.info("Character created successfully", {
        characterId: character.id,
      });
      projectService.schedulePackageExport(input.projectId, "character:create");
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
        include: {
          appearances: {
            orderBy: { createdAt: "asc" },
          },
        },
      });

      if (!character) {
        throw new ServiceError(
          ErrorCode.CHARACTER_NOT_FOUND,
          "Character not found",
          { id },
        );
      }

      return character;
    } catch (error) {
      logger.error("Failed to get character", error);
      throw error;
    }
  }

  async getAllCharacters(projectId: string) {
    try {
      const characters = await db.getClient().character.findMany({
        where: { projectId },
        orderBy: { createdAt: "asc" },
        include: {
          _count: {
            select: {
              appearances: true,
            },
          },
        },
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
      if (input.description !== undefined) updateData.description = input.description;
      if (input.firstAppearance !== undefined)
        updateData.firstAppearance = input.firstAppearance;
      if (input.attributes !== undefined) {
        updateData.attributes = JSON.stringify(input.attributes);
      }

      const character = await db.getClient().character.update({
        where: { id: input.id },
        data: updateData,
      });

      logger.info("Character updated successfully", {
        characterId: character.id,
      });
      projectService.schedulePackageExport(String(character.projectId), "character:update");
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
        select: { projectId: true },
      });

      await db.getClient().character.deleteMany({ where: { id } });

      logger.info("Character deleted successfully", { characterId: id });
      if ((character as { projectId?: unknown })?.projectId) {
        projectService.schedulePackageExport(
          String((character as { projectId: unknown }).projectId),
          "character:delete",
        );
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
      const appearance = await db.getClient().characterAppearance.create({
        data: {
          characterId: input.characterId,
          chapterId: input.chapterId,
          position: input.position,
          context: input.context,
        },
      });

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
      const appearances = await db.getClient().characterAppearance.findMany({
        where: { chapterId },
        include: {
          character: true,
        },
        orderBy: { position: "asc" },
      });

      return appearances;
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

      if (!character) {
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
          OR: [{ name: { contains: query } }, { description: { contains: query } }],
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
