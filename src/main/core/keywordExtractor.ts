/**
 * Keyword extractor - 자동 키워드 추출
 */

import { createLogger } from "../../shared/logger/index.js";

const logger = createLogger("KeywordExtractor");

interface ExtractedKeyword {
  text: string;
  position: number;
  type: "character" | "term";
}

export class KeywordExtractor {
  private koreanRegex = /[가-힣]{2,}/g;
  private commonWords = new Set([
    "그",
    "저",
    "너",
    "우리",
    "이",
    "가",
    "을",
    "를",
    "의",
    "에",
    "와",
    "과",
    "은",
    "는",
    "도",
    "만",
    "까지",
    "부터",
    "에서",
    "으로",
    "로",
    "하고",
    "이다",
    "있다",
    "없다",
    "하다",
    "되다",
    "않다",
    "같다",
    "아니다",
    "이다",
  ]);

  private characterNames: Set<string> = new Set();
  private termNames: Set<string> = new Set();

  setKnownCharacters(names: string[]) {
    this.characterNames = new Set(names);
  }

  setKnownTerms(names: string[]) {
    this.termNames = new Set(names);
  }

  extractFromText(text: string): ExtractedKeyword[] {
    const keywords: ExtractedKeyword[] = [];
    const seen = new Set<string>();

    const matches = Array.from(text.matchAll(this.koreanRegex));

    for (const match of matches) {
      const word = match[0];
      const position = match.index ?? 0;

      if (this.shouldSkip(word) || seen.has(word)) {
        continue;
      }

      if (this.characterNames.has(word)) {
        keywords.push({
          text: word,
          position,
          type: "character",
        });
        seen.add(word);
      } else if (this.termNames.has(word)) {
        keywords.push({
          text: word,
          position,
          type: "term",
        });
        seen.add(word);
      }
    }

    logger.debug("Keywords extracted", {
      keywordCount: keywords.length,
      textLength: text.length,
    });

    return keywords;
  }

  extractNewKeywords(text: string): string[] {
    const keywords: string[] = [];
    const seen = new Set<string>();

    const matches = Array.from(text.matchAll(this.koreanRegex));

    for (const match of matches) {
      const word = match[0];

      if (this.shouldSkip(word) || seen.has(word)) {
        continue;
      }

      if (!this.characterNames.has(word) && !this.termNames.has(word)) {
        keywords.push(word);
        seen.add(word);
      }
    }

    logger.debug("New keywords extracted", {
      keywordCount: keywords.length,
    });

    return keywords;
  }

  private shouldSkip(word: string): boolean {
    if (word.length < 2) return true;
    if (this.commonWords.has(word)) return true;
    if (/^\d+$/.test(word)) return true;

    return false;
  }

  extractNouns(text: string): string[] {
    const keywords: string[] = [];
    const seen = new Set<string>();

    const matches = Array.from(text.matchAll(this.koreanRegex));

    for (const match of matches) {
      const word = match[0];

      if (this.shouldSkip(word) || seen.has(word)) {
        continue;
      }

      keywords.push(word);
      seen.add(word);
    }

    return keywords;
  }

  filterByFrequency(keywords: string[], minCount: number = 2): string[] {
    const frequency = new Map<string, number>();

    for (const keyword of keywords) {
      frequency.set(keyword, (frequency.get(keyword) ?? 0) + 1);
    }

    return keywords.filter((keyword) => {
      const count = frequency.get(keyword) ?? 0;
      return count >= minCount;
    });
  }

  reset() {
    this.characterNames.clear();
    this.termNames.clear();
  }
}

export const keywordExtractor = new KeywordExtractor();
