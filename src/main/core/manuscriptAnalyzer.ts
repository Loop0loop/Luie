import { createLogger } from "../../shared/logger/index.js";
import { keywordExtractor } from "./keywordExtractor.js";
import type { AnalysisContext } from "../../shared/types/analysis.js";
import type { Character, Term, Chapter } from "../../shared/types/index.js";

const logger = createLogger("ManuscriptAnalyzer");

class ManuscriptAnalyzer {
  extractNounPhrases(content: string): string[] {
    try {
      const nouns = keywordExtractor.extractNouns(content);
      const filtered = keywordExtractor.filterByFrequency(nouns, 1);
      return filtered;
    } catch (error) {
      logger.error("Failed to extract noun phrases", { error });
      return [];
    }
  }

  buildAnalysisContext(
    chapter: Pick<Chapter, "title" | "content">,
    characters: Array<Pick<Character, "name" | "description">>,
    terms: Array<Pick<Term, "term" | "definition" | "category">>,
  ): AnalysisContext {
    const nounPhrases = this.extractNounPhrases(chapter.content);

    return {
      characters: characters.map((char) => ({
        name: char.name,
        description: char.description ?? "",
      })),
      terms: terms.map((term) => ({
        term: term.term,
        definition: term.definition ?? "",
        category: term.category ?? "기타",
      })),
      manuscript: {
        title: chapter.title,
        content: chapter.content,
        nounPhrases,
      },
    };
  }
}

export const manuscriptAnalyzer = new ManuscriptAnalyzer();
