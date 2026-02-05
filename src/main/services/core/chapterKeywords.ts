import { createLogger } from "../../../shared/logger/index.js";
import { SEARCH_CONTEXT_RADIUS } from "../../../shared/constants/index.js";
import { db } from "../../database/index.js";
import { keywordExtractor } from "../../core/keywordExtractor.js";
import { characterService } from "../world/characterService.js";
import { termService } from "../world/termService.js";

const logger = createLogger("ChapterKeywords");

export async function trackKeywordAppearances(
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
          context: extractContext(content, keyword.position, SEARCH_CONTEXT_RADIUS),
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
          context: extractContext(content, keyword.position, SEARCH_CONTEXT_RADIUS),
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

export function extractContext(text: string, position: number, length: number): string {
  const start = Math.max(0, position - length);
  const end = Math.min(text.length, position + length);
  return text.substring(start, end);
}
