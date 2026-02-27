import { createLogger } from "../../../shared/logger/index.js";
import { htmlToPlainText } from "../../../shared/utils/htmlText.js";
import type {
  WorldGraphMention,
  WorldGraphMentionsQuery,
  WorldEntitySourceType,
} from "../../../shared/types/index.js";
import { ServiceError } from "../../utils/serviceError.js";
import { ErrorCode } from "../../../shared/constants/index.js";
import { getWorldDbClient } from "./characterService.js";

const logger = createLogger("WorldMentionService");
const CONTEXT_RADIUS = 48;
const DEFAULT_LIMIT = 100;

type ChapterRow = {
  id: string;
  title: string;
  content: string;
  order: number;
};

type NamedRow = {
  name: string | null;
};

type TermRow = {
  term: string | null;
};

type AppearanceRow = {
  chapterId: string;
  position: number;
  context: string | null;
};

const buildContext = (text: string, position: number): string => {
  const start = Math.max(0, position - CONTEXT_RADIUS);
  const end = Math.min(text.length, position + CONTEXT_RADIUS);
  return text.slice(start, end);
};

const normalizeQuery = (value: string) => value.trim().toLowerCase();

const findPosition = (content: string, name: string): number | null => {
  const text = htmlToPlainText(content);
  const query = normalizeQuery(name);
  if (!query) return null;
  const index = normalizeQuery(text).indexOf(query);
  return index >= 0 ? index : null;
};

export class WorldMentionService {
  private async getEntityName(
    entityType: WorldEntitySourceType,
    entityId: string,
  ): Promise<string | null> {
    const client = getWorldDbClient();
    switch (entityType) {
      case "Character": {
        const row = (await client.character.findUnique({
          where: { id: entityId },
          select: { name: true },
        })) as NamedRow | null;
        return typeof row?.name === "string" ? row.name : null;
      }
      case "Faction": {
        const row = (await client.faction.findUnique({
          where: { id: entityId },
          select: { name: true },
        })) as NamedRow | null;
        return typeof row?.name === "string" ? row.name : null;
      }
      case "Event": {
        const row = (await client.event.findUnique({
          where: { id: entityId },
          select: { name: true },
        })) as NamedRow | null;
        return typeof row?.name === "string" ? row.name : null;
      }
      case "Term": {
        const row = (await client.term.findUnique({
          where: { id: entityId },
          select: { term: true },
        })) as TermRow | null;
        return typeof row?.term === "string" ? row.term : null;
      }
      case "Place":
      case "Concept":
      case "Rule":
      case "Item":
      case "WorldEntity": {
        const row = (await client.worldEntity.findUnique({
          where: { id: entityId },
          select: { name: true },
        })) as NamedRow | null;
        return typeof row?.name === "string" ? row.name : null;
      }
      default:
        return null;
    }
  }

  private async getAppearanceMentions(
    query: WorldGraphMentionsQuery,
  ): Promise<WorldGraphMention[]> {
    if (query.entityType !== "Character" && query.entityType !== "Term") {
      return [];
    }

    const client = getWorldDbClient();
    const appearanceRows = (query.entityType === "Character"
      ? await client.characterAppearance.findMany({
          where: { characterId: query.entityId },
          orderBy: { createdAt: "asc" },
          take: query.limit ?? DEFAULT_LIMIT,
        })
      : await client.termAppearance.findMany({
          where: { termId: query.entityId },
          orderBy: { createdAt: "asc" },
          take: query.limit ?? DEFAULT_LIMIT,
        })) as AppearanceRow[];

    if (appearanceRows.length === 0) {
      return [];
    }

    const chapterIds = Array.from(new Set(appearanceRows.map((row) => row.chapterId)));
    const chapters = (await client.chapter.findMany({
      where: {
        id: { in: chapterIds },
        projectId: query.projectId,
      },
      select: { id: true, title: true },
    })) as Array<{ id: string; title: string }>;

    const chapterById = new Map(chapters.map((chapter) => [chapter.id, chapter]));

    return appearanceRows
      .map((row): WorldGraphMention | null => {
        const chapter = chapterById.get(row.chapterId);
        if (!chapter) return null;
        return {
          chapterId: row.chapterId,
          chapterTitle: chapter.title,
          position: typeof row.position === "number" ? row.position : null,
          context: typeof row.context === "string" ? row.context : undefined,
          source: "appearance",
        };
      })
      .filter((row): row is WorldGraphMention => row !== null);
  }

  private async getFallbackMentions(
    query: WorldGraphMentionsQuery,
    entityName: string,
  ): Promise<WorldGraphMention[]> {
    const client = getWorldDbClient();
    const chapters = (await client.chapter.findMany({
      where: {
        projectId: query.projectId,
        deletedAt: null,
      },
      select: {
        id: true,
        title: true,
        content: true,
        order: true,
      },
      orderBy: { order: "asc" },
    })) as ChapterRow[];

    const mentions: WorldGraphMention[] = [];
    for (const chapter of chapters) {
      const position = findPosition(chapter.content, entityName);
      if (position === null) continue;
      const text = htmlToPlainText(chapter.content);
      mentions.push({
        chapterId: chapter.id,
        chapterTitle: chapter.title,
        position,
        context: buildContext(text, position),
        source: "content-match",
      });
      if (mentions.length >= (query.limit ?? DEFAULT_LIMIT)) {
        break;
      }
    }

    return mentions;
  }

  async getMentions(query: WorldGraphMentionsQuery): Promise<WorldGraphMention[]> {
    try {
      const appearanceMentions = await this.getAppearanceMentions(query);
      if (appearanceMentions.length > 0) {
        return appearanceMentions;
      }

      const entityName = await this.getEntityName(query.entityType, query.entityId);
      if (!entityName) {
        return [];
      }
      return this.getFallbackMentions(query, entityName);
    } catch (error) {
      logger.error("Failed to fetch world graph mentions", { query, error });
      throw new ServiceError(
        ErrorCode.DB_QUERY_FAILED,
        "Failed to fetch world graph mentions",
        { query },
        error,
      );
    }
  }
}

export const worldMentionService = new WorldMentionService();
