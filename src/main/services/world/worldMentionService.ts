import { eq, isNull, inArray, asc, and } from "drizzle-orm";
import { createLogger } from "../../../shared/logger/index.js";
import { htmlToPlainText } from "../../../shared/utils/htmlText.js";
import type {
  WorldGraphMention,
  WorldGraphMentionsQuery,
  WorldEntitySourceType,
} from "../../../shared/types/index.js";
import { ServiceError } from "../../utils/error/index.js";
import { ErrorCode } from "../../../shared/constants/index.js";
import { getWorldDbClient } from "./characterService.js";
import { character, faction, event, term, worldEntity, chapter } from "../../infra/database/index.js";

const loadAppearanceCacheService = async () =>
  (await import("./appearanceCacheService.js")).appearanceCacheService;

const logger = createLogger("WorldMentionService");
const CONTEXT_RADIUS = 48;
const DEFAULT_LIMIT = 100;

type NamedRow = {
  name: string | null;
  deletedAt?: string | null;
};

type TermRow = {
  term: string | null;
  deletedAt?: string | null;
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
        const results = await client.select({ name: character.name, deletedAt: character.deletedAt }).from(character).where(eq(character.id, entityId)).limit(1);
        const row = results[0] as NamedRow | undefined;
        return row && !row.deletedAt
          ? (typeof row.name === "string" ? row.name : null)
          : null;
      }
      case "Faction": {
        const results = await client.select({ name: faction.name, deletedAt: faction.deletedAt }).from(faction).where(eq(faction.id, entityId)).limit(1);
        const row = results[0] as NamedRow | undefined;
        return row && !row.deletedAt
          ? (typeof row.name === "string" ? row.name : null)
          : null;
      }
      case "Event": {
        const results = await client.select({ name: event.name, deletedAt: event.deletedAt }).from(event).where(eq(event.id, entityId)).limit(1);
        const row = results[0] as NamedRow | undefined;
        return row && !row.deletedAt
          ? (typeof row.name === "string" ? row.name : null)
          : null;
      }
      case "Term": {
        const results = await client.select({ term: term.term, deletedAt: term.deletedAt }).from(term).where(eq(term.id, entityId)).limit(1);
        const row = results[0] as TermRow | undefined;
        return row && !row.deletedAt
          ? (typeof row.term === "string" ? row.term : null)
          : null;
      }
      case "Place":
      case "Concept":
      case "Rule":
      case "Item":
      case "WorldEntity": {
        const results = await client.select({ name: worldEntity.name }).from(worldEntity).where(eq(worldEntity.id, entityId)).limit(1);
        const row = results[0] as NamedRow | undefined;
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
    const appearanceCacheService = await loadAppearanceCacheService();
    const appearanceRows = (
      query.entityType === "Character"
        ? await appearanceCacheService.getCharacterAppearancesByEntity(
            query.entityId,
            query.limit ?? DEFAULT_LIMIT,
          )
        : await appearanceCacheService.getTermAppearancesByEntity(
            query.entityId,
            query.limit ?? DEFAULT_LIMIT,
          )
    ) as AppearanceRow[];

    if (appearanceRows.length === 0) {
      return [];
    }

    const chapterIds = Array.from(
      new Set(appearanceRows.map((row) => row.chapterId)),
    );
      const chapters = await client.select({ id: chapter.id, title: chapter.title }).from(chapter).where(and(inArray(chapter.id, chapterIds), eq(chapter.projectId, query.projectId), isNull(chapter.deletedAt)));

    const chapterById = new Map(
      chapters.map((ch) => [ch.id, ch]),
    );

    return appearanceRows
      .map((row): WorldGraphMention | null => {
        const ch = chapterById.get(row.chapterId);
        if (!ch) return null;
        return {
          chapterId: row.chapterId,
          chapterTitle: ch.title,
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
    const chapters = await client.select({
        id: chapter.id,
        title: chapter.title,
        content: chapter.content,
        order: chapter.order,
      }).from(chapter).where(and(eq(chapter.projectId, query.projectId), isNull(chapter.deletedAt))).orderBy(asc(chapter.order));

    const mentions: WorldGraphMention[] = [];
    for (const ch of chapters) {
      const position = findPosition(ch.content, entityName);
      if (position === null) continue;
      const text = htmlToPlainText(ch.content);
      mentions.push({
        chapterId: ch.id,
        chapterTitle: ch.title,
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

  async getMentions(
    query: WorldGraphMentionsQuery,
  ): Promise<WorldGraphMention[]> {
    try {
      const appearanceMentions = await this.getAppearanceMentions(query);
      if (appearanceMentions.length > 0) {
        return appearanceMentions;
      }

      const entityName = await this.getEntityName(
        query.entityType,
        query.entityId,
      );
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
