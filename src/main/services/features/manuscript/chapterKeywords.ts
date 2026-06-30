import { eq, and, isNull } from "drizzle-orm";
import { createLogger } from "../../../../shared/logger/index.js";
import { SEARCH_CONTEXT_RADIUS } from "../../../../shared/constants/index.js";
import { db } from "../../../infra/database/index.js";
import * as schema from "../../../infra/database/index.js";
import { keywordExtractor } from "../../../core/keywordExtractor.js";
import { projectService } from "../project/projectService.js";

const { character, term, chapter } = schema;

const loadAppearanceCacheService = async () =>
  (await import("../world/cache/appearanceCacheService.js")).appearanceCacheService;

const logger = createLogger("ChapterKeywords");

type TrackKeywordAppearanceOptions = {
  clearExisting?: boolean;
  includeCharacters?: boolean;
  includeTerms?: boolean;
};

async function updateCharacterFirstAppearance(
  characterId: string,
  chapterId: string,
): Promise<void> {
  const rows = await db.getClient()
    .select({
      projectId: character.projectId,
      firstAppearance: character.firstAppearance,
      deletedAt: character.deletedAt,
    })
    .from(character)
    .where(eq(character.id, characterId))
    .limit(1);

  if (rows.length === 0) return;
  const char = rows[0];
  if (!char.projectId || char.firstAppearance || char.deletedAt) return;

  await db.getClient()
    .update(character)
    .set({ firstAppearance: chapterId })
    .where(eq(character.id, characterId));
  await projectService.attemptImmediatePackageExport(
    String(char.projectId),
    "character:update-first-appearance",
  );
}

async function updateTermFirstAppearance(
  termId: string,
  chapterId: string,
): Promise<void> {
  const rows = await db.getClient()
    .select({
      projectId: term.projectId,
      firstAppearance: term.firstAppearance,
      deletedAt: term.deletedAt,
    })
    .from(term)
    .where(eq(term.id, termId))
    .limit(1);

  if (rows.length === 0) return;
  const t = rows[0];
  if (!t.projectId || t.firstAppearance || t.deletedAt) return;

  await db.getClient()
    .update(term)
    .set({ firstAppearance: chapterId })
    .where(eq(term.id, termId));
  await projectService.attemptImmediatePackageExport(
    String(t.projectId),
    "term:update-first-appearance",
  );
}

async function trackKeywordAppearancesInternal(
  chapterId: string,
  content: string,
  projectId: string,
  options?: TrackKeywordAppearanceOptions,
) {
  const includeCharacters = options?.includeCharacters ?? true;
  const includeTerms = options?.includeTerms ?? true;

  if (options?.clearExisting !== false) {
    const appearanceCacheService = await loadAppearanceCacheService();
    if (includeCharacters && includeTerms) {
      await appearanceCacheService.clearChapter(chapterId);
    } else if (includeCharacters) {
      await appearanceCacheService.clearCharacterChapter(chapterId);
    } else if (includeTerms) {
      await appearanceCacheService.clearTermChapter(chapterId);
    }
  }

  const store = db.getClient();
  const notDeleted = isNull(character.deletedAt);
  const termNotDeleted = isNull(term.deletedAt);

  const [characters, terms] = await Promise.all([
    includeCharacters
      ? store
          .select({ id: character.id, name: character.name })
          .from(character)
          .where(and(eq(character.projectId, projectId), notDeleted))
      : Promise.resolve([]),
    includeTerms
      ? store
          .select({ id: term.id, term: term.term })
          .from(term)
          .where(and(eq(term.projectId, projectId), termNotDeleted))
      : Promise.resolve([]),
  ]);

  keywordExtractor.setKnownCharacters(
    characters.map((c) => c.name),
  );
  keywordExtractor.setKnownTerms(terms.map((t) => t.term));

  const keywords = keywordExtractor.extractFromText(content);

  if (includeCharacters) {
    const appearanceCacheService = await loadAppearanceCacheService();
    for (const keyword of keywords.filter(
      (entry) => entry.type === "character",
    )) {
      const char = characters.find(
        (entry) => entry.name === keyword.text,
      );
      if (!char) continue;

      await appearanceCacheService.recordCharacterAppearance({
        characterId: String(char.id),
        projectId,
        chapterId,
        position: keyword.position,
        context: extractContext(
          content,
          keyword.position,
          SEARCH_CONTEXT_RADIUS,
        ),
      });

      await updateCharacterFirstAppearance(String(char.id), chapterId);
    }
  }

  if (includeTerms) {
    const appearanceCacheService = await loadAppearanceCacheService();
    for (const keyword of keywords.filter((entry) => entry.type === "term")) {
      const t = terms.find((entry) => entry.term === keyword.text);
      if (!t) continue;

      await appearanceCacheService.recordTermAppearance({
        termId: String(t.id),
        projectId,
        chapterId,
        position: keyword.position,
        context: extractContext(
          content,
          keyword.position,
          SEARCH_CONTEXT_RADIUS,
        ),
      });

      await updateTermFirstAppearance(String(t.id), chapterId);
    }
  }

  logger.info("Keyword tracking completed", {
    chapterId,
    characterCount: includeCharacters
      ? keywords.filter((entry) => entry.type === "character").length
      : 0,
    termCount: includeTerms
      ? keywords.filter((entry) => entry.type === "term").length
      : 0,
  });
}

export async function trackKeywordAppearances(
  chapterId: string,
  content: string,
  projectId: string,
) {
  try {
    await trackKeywordAppearancesInternal(chapterId, content, projectId, {
      clearExisting: true,
      includeCharacters: true,
      includeTerms: true,
    });
  } catch (error) {
    logger.error("Failed to track keyword appearances", error);
  }
}

export async function rebuildProjectKeywordAppearances(
  projectId: string,
  options?: {
    includeCharacters?: boolean;
    includeTerms?: boolean;
  },
) {
  const includeCharacters = options?.includeCharacters ?? true;
  const includeTerms = options?.includeTerms ?? true;

  try {
    const appearanceCacheService = await loadAppearanceCacheService();
    if (includeCharacters && includeTerms) {
      await appearanceCacheService.clearProject(projectId);
    } else if (includeCharacters) {
      await appearanceCacheService.clearCharacterProject(projectId);
    } else if (includeTerms) {
      await appearanceCacheService.clearTermProject(projectId);
    }

    const chapters = await db.getClient()
      .select({ id: chapter.id, content: chapter.content })
      .from(chapter)
      .where(and(eq(chapter.projectId, projectId), isNull(chapter.deletedAt)))
      .orderBy(chapter.order);

    for (const ch of chapters) {
      await trackKeywordAppearancesInternal(
        ch.id,
        ch.content,
        projectId,
        {
          clearExisting: false,
          includeCharacters,
          includeTerms,
        },
      );
    }
  } catch (error) {
    logger.error("Failed to rebuild project keyword appearances", {
      projectId,
      includeCharacters,
      includeTerms,
      error,
    });
  }
}

export function extractContext(
  text: string,
  position: number,
  length: number,
): string {
  const start = Math.max(0, position - length);
  const end = Math.min(text.length, position + length);
  return text.substring(start, end);
}
