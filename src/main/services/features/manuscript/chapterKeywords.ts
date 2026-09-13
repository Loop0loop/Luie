import { eq, and, isNull } from "drizzle-orm";
import { createLogger } from "../../../../shared/logger/index.js";
import { SEARCH_CONTEXT_RADIUS } from "../../../../shared/constants/index.js";
import { db } from "../../../infra/database/index.js";
import * as schema from "../../../infra/database/index.js";
import { KeywordExtractor } from "../../../core/keywordExtractor.js";
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

async function trackKeywordAppearancesInternal(
  chapterId: string,
  content: string,
  projectId: string,
  options?: TrackKeywordAppearanceOptions,
) {
  const includeCharacters = options?.includeCharacters ?? true;
  const includeTerms = options?.includeTerms ?? true;

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

  const keywordExtractor = new KeywordExtractor();
  keywordExtractor.setKnownCharacters(
    characters.map((c) => c.name),
  );
  keywordExtractor.setKnownTerms(terms.map((t) => t.term));

  const keywords = keywordExtractor.extractFromText(content);
  const charactersByName = new Map(
    characters.map((entry) => [entry.name, String(entry.id)]),
  );
  const termsByName = new Map(
    terms.map((entry) => [entry.term, String(entry.id)]),
  );
  const characterAppearances = keywords.flatMap((keyword) => {
    if (keyword.type !== "character") return [];
    const characterId = charactersByName.get(keyword.text);
    if (!characterId) return [];
    return [{
      characterId,
      projectId,
      position: keyword.position,
      context: extractContext(content, keyword.position, SEARCH_CONTEXT_RADIUS),
    }];
  });
  const termAppearances = keywords.flatMap((keyword) => {
    if (keyword.type !== "term") return [];
    const termId = termsByName.get(keyword.text);
    if (!termId) return [];
    return [{
      termId,
      projectId,
      position: keyword.position,
      context: extractContext(content, keyword.position, SEARCH_CONTEXT_RADIUS),
    }];
  });
  const appearanceCacheService = await loadAppearanceCacheService();
  await appearanceCacheService.replaceChapterAppearances({
    chapterId,
    characterAppearances,
    termAppearances,
    clearCharacters:
      includeCharacters && options?.clearExisting !== false,
    clearTerms: includeTerms && options?.clearExisting !== false,
  });

  const changedFirstAppearanceCount = store.transaction((tx) => {
    let changes = 0;
    for (const characterId of new Set(
      characterAppearances.map((entry) => entry.characterId),
    )) {
      changes += tx
        .update(character)
        .set({ firstAppearance: chapterId })
        .where(
          and(
            eq(character.id, characterId),
            eq(character.projectId, projectId),
            isNull(character.firstAppearance),
            isNull(character.deletedAt),
          ),
        )
        .run().changes;
    }
    for (const termId of new Set(
      termAppearances.map((entry) => entry.termId),
    )) {
      changes += tx
        .update(term)
        .set({ firstAppearance: chapterId })
        .where(
          and(
            eq(term.id, termId),
            eq(term.projectId, projectId),
            isNull(term.firstAppearance),
            isNull(term.deletedAt),
          ),
        )
        .run().changes;
    }
    return changes;
  });
  if (changedFirstAppearanceCount > 0) {
    projectService.schedulePackageExport(
      projectId,
      "keyword:update-first-appearance",
    );
  }

  logger.info("Keyword tracking completed", {
    chapterId,
    characterCount: characterAppearances.length,
    termCount: termAppearances.length,
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

    /* eslint-disable no-await-in-loop -- project rebuild applies chapters in manuscript order. */
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
    /* eslint-enable no-await-in-loop */
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
