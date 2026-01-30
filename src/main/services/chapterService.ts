/**
 * Chapter service - 챕터/회차 관리 비즈니스 로직
 */

import { db } from "../database/index.js";
import { createLogger } from "../../shared/logger/index.js";
import { ErrorCode, SEARCH_CONTEXT_RADIUS } from "../../shared/constants/index.js";
import type {
  ChapterCreateInput,
  ChapterUpdateInput,
} from "../../shared/types/index.js";
import { keywordExtractor } from "../core/keywordExtractor.js";
import { characterService } from "./characterService.js";
import { termService } from "./termService.js";
import { autoExtractService } from "./autoExtractService.js";
import { projectService } from "./projectService.js";

const logger = createLogger("ChapterService");

function isPrismaNotFoundError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2025"
  );
}

export class ChapterService {
  async createChapter(input: ChapterCreateInput) {
    try {
      logger.info("Creating chapter", input);

      const maxOrder = await db.getClient().chapter.findFirst({
        where: { projectId: input.projectId },
        orderBy: { order: "desc" },
        select: { order: true },
      });

      const maxOrderValue =
        typeof (maxOrder as { order?: unknown })?.order === "number"
          ? (maxOrder as { order: number }).order
          : 0;
      const nextOrder = input.order ?? maxOrderValue + 1;

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
      projectService.schedulePackageExport(input.projectId, "chapter:create");
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
            String((chapter as { projectId: unknown }).projectId),
          );

          autoExtractService.scheduleAnalysis(
            input.id,
            String((chapter as { projectId: unknown }).projectId),
            input.content,
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
      projectService.schedulePackageExport(
        String((updatedChapter as { projectId: unknown }).projectId),
        "chapter:update",
      );
      return updatedChapter;
    } catch (error) {
      logger.error("Failed to update chapter", error);
      if (isPrismaNotFoundError(error)) {
        throw new Error(ErrorCode.CHAPTER_NOT_FOUND);
      }
      throw new Error(ErrorCode.CHAPTER_UPDATE_FAILED);
    }
  }

  private async trackKeywordAppearances(
    chapterId: string,
    content: string,
    projectId: string,
  ) {
    try {
      const characters = (await db.getClient().character.findMany({
        where: { projectId },
        select: { id: true, name: true },
      })) as Array<{ id: string; name: string }>;

      const terms = (await db.getClient().term.findMany({
        where: { projectId },
        select: { id: true, term: true },
      })) as Array<{ id: string; term: string }>;

      const characterNames = characters.map((c: { name: string }) => c.name);
      const termNames = terms.map((t: { term: string }) => t.term);

      keywordExtractor.setKnownCharacters(characterNames);
      keywordExtractor.setKnownTerms(termNames);

      const keywords = keywordExtractor.extractFromText(content);

      for (const keyword of keywords.filter((k) => k.type === "character")) {
        const character = characters.find((c) => c.name === keyword.text);
        if (character) {
          await characterService.recordAppearance({
            characterId: String(character.id),
            chapterId,
            position: keyword.position,
            context: this.extractContext(content, keyword.position, SEARCH_CONTEXT_RADIUS),
          });

          await characterService.updateFirstAppearance(String(character.id), chapterId);
        }
      }

      for (const keyword of keywords.filter((k) => k.type === "term")) {
        const term = terms.find((t) => t.term === keyword.text);
        if (term) {
          await termService.recordAppearance({
            termId: String(term.id),
            chapterId,
            position: keyword.position,
            context: this.extractContext(content, keyword.position, SEARCH_CONTEXT_RADIUS),
          });

          await termService.updateFirstAppearance(String(term.id), chapterId);
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
      const chapter = await db.getClient().chapter.findUnique({
        where: { id },
        select: { projectId: true },
      });

      await db.getClient().chapter.deleteMany({ where: { id } });

      logger.info("Chapter deleted successfully", { chapterId: id });
      if ((chapter as { projectId?: unknown })?.projectId) {
        projectService.schedulePackageExport(
          String((chapter as { projectId: unknown }).projectId),
          "chapter:delete",
        );
      }
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
      projectService.schedulePackageExport(projectId, "chapter:reorder");
      return { success: true };
    } catch (error) {
      logger.error("Failed to reorder chapters", error);
      throw error;
    }
  }
}

export const chapterService = new ChapterService();
