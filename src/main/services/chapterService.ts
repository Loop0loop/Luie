/**
 * Chapter service - 챕터/회차 관리 비즈니스 로직
 */

import { db } from "../database/index.js";
import { createLogger } from "../../shared/logger/index.js";
import { ErrorCode } from "../../shared/constants/index.js";
import type {
  ChapterCreateInput,
  ChapterUpdateInput,
} from "../../shared/types/index.js";
import { keywordExtractor } from "../core/keywordExtractor.js";
import { characterService } from "./characterService.js";
import { termService } from "./termService.js";

const logger = createLogger("ChapterService");

export class ChapterService {
  async createChapter(input: ChapterCreateInput) {
    try {
      logger.info("Creating chapter", input);

      const maxOrder = await db.getClient().chapter.findFirst({
        where: { projectId: input.projectId },
        orderBy: { order: "desc" },
        select: { order: true },
      });

      const nextOrder = input.order ?? (maxOrder?.order ?? 0) + 1;

      const chapter = await db.getClient().chapter.create({
        data: {
          projectId: input.projectId,
          title: input.title,
          synopsis: input.synopsis,
          order: nextOrder,
          content: "",
        },
      });

      logger.info("Chapter created successfully", { chapterId: chapter.id });
      return chapter;
    } catch (error) {
      logger.error("Failed to create chapter", error);
      throw new Error(ErrorCode.CHAPTER_CREATE_FAILED);
    }
  }

  async getChapter(id: string) {
    try {
      const chapter = await db.getClient().chapter.findUnique({
        where: { id },
      });

      if (!chapter) {
        throw new Error(ErrorCode.CHAPTER_NOT_FOUND);
      }

      return chapter;
    } catch (error) {
      logger.error("Failed to get chapter", error);
      throw error;
    }
  }

  async getAllChapters(projectId: string) {
    try {
      const chapters = await db.getClient().chapter.findMany({
        where: { projectId },
        orderBy: { order: "asc" },
      });

      return chapters;
    } catch (error) {
      logger.error("Failed to get all chapters", error);
      throw error;
    }
  }

  async updateChapter(input: ChapterUpdateInput) {
    try {
      const updateData: Record<string, unknown> = {};

      if (input.title !== undefined) updateData.title = input.title;
      if (input.content !== undefined) {
        updateData.content = input.content;
        updateData.wordCount = input.content.length;

        const chapter = await db.getClient().chapter.findUnique({
          where: { id: input.id },
          select: { projectId: true },
        });

        if (chapter) {
          await this.trackKeywordAppearances(
            input.id,
            input.content,
            chapter.projectId,
          );
        }
      }
      if (input.synopsis !== undefined) updateData.synopsis = input.synopsis;

      const updatedChapter = await db.getClient().chapter.update({
        where: { id: input.id },
        data: updateData,
      });

      logger.info("Chapter updated successfully", {
        chapterId: updatedChapter.id,
      });
      return updatedChapter;
    } catch (error) {
      logger.error("Failed to update chapter", error);
      throw new Error(ErrorCode.CHAPTER_UPDATE_FAILED);
    }
  }

  private async trackKeywordAppearances(
    chapterId: string,
    content: string,
    projectId: string,
  ) {
    try {
      const characters = await db.getClient().character.findMany({
        where: { projectId },
        select: { id: true, name: true },
      });

      const terms = await db.getClient().term.findMany({
        where: { projectId },
        select: { id: true, term: true },
      });

      const characterNames = characters.map((c) => c.name);
      const termNames = terms.map((t) => t.term);

      keywordExtractor.setKnownCharacters(characterNames);
      keywordExtractor.setKnownTerms(termNames);

      const keywords = keywordExtractor.extractFromText(content);

      for (const keyword of keywords.filter((k) => k.type === "character")) {
        const character = characters.find((c) => c.name === keyword.text);
        if (character) {
          await characterService.recordAppearance({
            characterId: character.id,
            chapterId,
            position: keyword.position,
            context: this.extractContext(content, keyword.position, 50),
          });

          await characterService.updateFirstAppearance(character.id, chapterId);
        }
      }

      for (const keyword of keywords.filter((k) => k.type === "term")) {
        const term = terms.find((t) => t.term === keyword.text);
        if (term) {
          await termService.recordAppearance({
            termId: term.id,
            chapterId,
            position: keyword.position,
            context: this.extractContext(content, keyword.position, 50),
          });

          await termService.updateFirstAppearance(term.id, chapterId);
        }
      }

      logger.info("Keyword tracking completed", {
        chapterId,
        characterCount: keywords.filter((k) => k.type === "character").length,
        termCount: keywords.filter((k) => k.type === "term").length,
      });
    } catch (error) {
      logger.error("Failed to track keyword appearances", error);
    }
  }

  private extractContext(
    text: string,
    position: number,
    length: number,
  ): string {
    const start = Math.max(0, position - length);
    const end = Math.min(text.length, position + length);
    return text.substring(start, end);
  }

  async deleteChapter(id: string) {
    try {
      await db.getClient().chapter.delete({
        where: { id },
      });

      logger.info("Chapter deleted successfully", { chapterId: id });
      return { success: true };
    } catch (error) {
      logger.error("Failed to delete chapter", error);
      throw new Error(ErrorCode.CHAPTER_DELETE_FAILED);
    }
  }

  async reorderChapters(projectId: string, chapterIds: string[]) {
    try {
      await db.getClient().$transaction(
        chapterIds.map((id, index) =>
          db.getClient().chapter.update({
            where: { id },
            data: { order: index + 1 },
          }),
        ),
      );

      logger.info("Chapters reordered successfully", { projectId });
      return { success: true };
    } catch (error) {
      logger.error("Failed to reorder chapters", error);
      throw error;
    }
  }
}

export const chapterService = new ChapterService();
