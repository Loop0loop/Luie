import { createLogger } from "../../shared/logger/index.js";
import { keywordExtractor } from "./keywordExtractor.js";
import type { AnalysisContext } from "../../shared/types/analysis.js";
import type { Character, Term, Chapter } from "../../shared/types/index.js";

const logger = createLogger("ManuscriptAnalyzer");

/**
 * 원고 분석 엔진
 * NLP + Gemini API를 활용한 원고 분석
 */
class ManuscriptAnalyzer {
  /**
   * 명사구 추출 (keywordExtractor 활용)
   */
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

  /**
   * 분석 컨텍스트 구성
   * 캐릭터, Term, 원고 내용을 통합
   */
  buildAnalysisContext(
    chapter: Chapter,
    characters: Character[],
    terms: Term[]
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
