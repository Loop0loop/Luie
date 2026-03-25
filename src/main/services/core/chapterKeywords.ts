import { createLogger } from "../../../shared/logger/index.js";
import { SEARCH_CONTEXT_RADIUS } from "../../../shared/constants/index.js";
import { db } from "../../database/index.js";
import { keywordExtractor } from "../../core/keywordExtractor.js";
import { projectService } from "./projectService.js";

const loadAppearanceCacheService = async () =>
  (await import("../world/appearanceCacheService.js")).appearanceCacheService;

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
  const character = await db.getClient().character.findUnique({
    where: { id: characterId },
    select: {
      projectId: true,
      firstAppearance: true,
      deletedAt: true,
    },
  });
  if (!character?.projectId || character.firstAppearance || character.deletedAt) return;

  await db.getClient().character.update({
    where: { id: characterId },
    data: { firstAppearance: chapterId },
  });
  await projectService.attemptImmediatePackageExport(
    String(character.projectId),
    "character:update-first-appearance",
  );
}

async function updateTermFirstAppearance(
  termId: string,
  chapterId: string,
): Promise<void> {
  const term = await db.getClient().term.findUnique({
    where: { id: termId },
    select: {
      projectId: true,
      firstAppearance: true,
      deletedAt: true,
    },
  });
  if (!term?.projectId || term.firstAppearance || term.deletedAt) return;

  await db.getClient().term.update({
    where: { id: termId },
    data: { firstAppearance: chapterId },
  });
  await projectService.attemptImmediatePackageExport(
    String(term.projectId),
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

  const [characters, terms] = await Promise.all([
    includeCharacters
      ? db.getClient().character.findMany({
          where: { projectId, deletedAt: null },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
    includeTerms
      ? db.getClient().term.findMany({
          where: { projectId, deletedAt: null },
          select: { id: true, term: true },
        })
      : Promise.resolve([]),
  ]);

  const typedCharacters = characters as Array<{ id: string; name: string }>;
  const typedTerms = terms as Array<{ id: string; term: string }>;

  keywordExtractor.setKnownCharacters(
    typedCharacters.map((character) => character.name),
  );
  keywordExtractor.setKnownTerms(typedTerms.map((term) => term.term));

  const keywords = keywordExtractor.extractFromText(content);

  if (includeCharacters) {
    const appearanceCacheService = await loadAppearanceCacheService();
    for (const keyword of keywords.filter(
      (entry) => entry.type === "character",
    )) {
      const character = typedCharacters.find(
        (entry) => entry.name === keyword.text,
      );
      if (!character) continue;

      await appearanceCacheService.recordCharacterAppearance({
        characterId: String(character.id),
        projectId,
        chapterId,
        position: keyword.position,
        context: extractContext(
          content,
          keyword.position,
          SEARCH_CONTEXT_RADIUS,
        ),
      });

      await updateCharacterFirstAppearance(String(character.id), chapterId);
    }
  }

  if (includeTerms) {
    const appearanceCacheService = await loadAppearanceCacheService();
    for (const keyword of keywords.filter((entry) => entry.type === "term")) {
      const term = typedTerms.find((entry) => entry.term === keyword.text);
      if (!term) continue;

      await appearanceCacheService.recordTermAppearance({
        termId: String(term.id),
        projectId,
        chapterId,
        position: keyword.position,
        context: extractContext(
          content,
          keyword.position,
          SEARCH_CONTEXT_RADIUS,
        ),
      });

      await updateTermFirstAppearance(String(term.id), chapterId);
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

    const chapters = (await db.getClient().chapter.findMany({
      where: {
        projectId,
        deletedAt: null,
      },
      select: {
        id: true,
        content: true,
      },
      orderBy: { order: "asc" },
    })) as Array<{ id: string; content: string }>;

    for (const chapter of chapters) {
      await trackKeywordAppearancesInternal(
        chapter.id,
        chapter.content,
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
