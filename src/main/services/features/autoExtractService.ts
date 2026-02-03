import "dotenv/config";
import { createLogger } from "../../../shared/logger/index.js";
import { AUTO_EXTRACT_DEBOUNCE_MS } from "../../../shared/constants/index.js";
import { db } from "../../database/index.js";
import { keywordExtractor } from "../../core/keywordExtractor.js";
import { characterService } from "../world/characterService.js";
import { termService } from "../world/termService.js";
import { GoogleGenAI } from "@google/genai";
import {
  FEW_SHOT_EXAMPLES,
  GEMINI_RESPONSE_SCHEMA,
  GeminiResultSchema,
  type GeminiResult,
} from "./autoExtract/autoExtractPrompt.js";

const logger = createLogger("AutoExtractService");
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";

class AutoExtractService {
  private timers = new Map<string, NodeJS.Timeout>();
  private paragraphCache = new Map<string, string[]>();

  scheduleAnalysis(chapterId: string, projectId: string, content: string) {
    const key = `${projectId}:${chapterId}`;
    const existing = this.timers.get(key);
    if (existing) {
      clearTimeout(existing);
    }

    const timer = setTimeout(() => {
      this.analyzeChapter(chapterId, projectId, content).catch((error) => {
        logger.error("Auto extraction failed", { chapterId, projectId, error });
      });
    }, AUTO_EXTRACT_DEBOUNCE_MS);

    this.timers.set(key, timer);
  }

  private splitParagraphs(text: string): string[] {
    return text
      .split(/\n{2,}/g)
      .map((p) => p.trim())
      .filter(Boolean);
  }

  private getDirtyParagraphs(chapterId: string, content: string): string[] {
    const next = this.splitParagraphs(content);
    const prev = this.paragraphCache.get(chapterId) ?? [];

    this.paragraphCache.set(chapterId, next);

    if (prev.length === 0) {
      return next;
    }

    const dirty: string[] = [];
    const maxLen = Math.max(prev.length, next.length);
    for (let i = 0; i < maxLen; i += 1) {
      if (prev[i] !== next[i] && next[i]) {
        dirty.push(next[i]);
      }
    }

    return dirty;
  }

  private async analyzeChapter(chapterId: string, projectId: string, content: string) {
    const dirtyParagraphs = this.getDirtyParagraphs(chapterId, content);
    if (dirtyParagraphs.length === 0) {
      return;
    }

    const [characters, terms] = (await Promise.all([
      db.getClient().character.findMany({
        where: { projectId },
        select: { id: true, name: true, description: true },
      }),
      db.getClient().term.findMany({
        where: { projectId },
        select: { id: true, term: true, definition: true, category: true },
      }),
    ])) as [
      Array<{ id: string; name: string; description?: string | null }>,
      Array<{ id: string; term: string; definition?: string | null; category?: string | null }>,
    ];

    keywordExtractor.setKnownCharacters(characters.map((c) => c.name));
    keywordExtractor.setKnownTerms(terms.map((t) => t.term));

    const candidates = dirtyParagraphs.flatMap((p) => keywordExtractor.extractNouns(p));

    const filtered = keywordExtractor
      .filterByFrequency(candidates, 2)
      .filter((word) => !characters.some((c) => c.name === word))
      .filter((word) => !terms.some((t) => t.term === word));

    const uniqueCandidates = Array.from(new Set(filtered)).slice(0, 10);
    if (uniqueCandidates.length === 0) {
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      logger.warn("GEMINI_API_KEY not set; skipping auto extraction");
      return;
    }

    for (const name of uniqueCandidates) {
      const contexts = dirtyParagraphs.filter((p) => p.includes(name)).slice(0, 3);

      const result = await this.classifyWithGemini(name, contexts, apiKey);
      if (!result) {
        continue;
      }

      if (result.entityType === "character") {
        await characterService.createCharacter({
          projectId,
          name: result.name,
          description: result.summary,
          attributes: {
            importance: result.importance,
            confidence: result.confidence,
            source: "auto-extract",
          },
        });
      } else {
        await termService.createTerm({
          projectId,
          term: result.name,
          definition: result.summary,
          category: result.entityType,
        });
      }
    }

    logger.info("Auto extraction completed", {
      projectId,
      chapterId,
      candidateCount: uniqueCandidates.length,
    });
  }

  private async classifyWithGemini(
    name: string,
    contexts: string[],
    apiKey: string,
  ): Promise<GeminiResult | null> {
    const contextText = contexts.map((c, i) => `문맥 ${i + 1}: ${c}`).join("\n");

    const prompt = `당신은 웹소설/판타지 소설 전문 편집자입니다. 주어진 문맥에서 고유명사의 유형을 정확히 분류하고 요약하세요.

## 분류 기준
- character: 사람, 생명체, 의인화된 존재
- location: 지명, 건물, 장소
- organization: 조직, 단체, 길드, 학교
- item: 무기, 아이템, 마법 도구
- concept: 개념, 기술, 마법, 시스템

## 중요도 기준
- main: 스토리의 핵심 요소 (주인공, 주요 무대)
- supporting: 반복적으로 등장하거나 영향력이 있는 요소
- minor: 일시적으로 언급되는 요소
- unknown: 판단하기 어려운 경우

${FEW_SHOT_EXAMPLES}

---

이제 아래 문맥에서 "${name}"를 분석하세요.

${contextText}

[고유명사]: ${name}

JSON 형식으로만 답하세요:`;

    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: GEMINI_RESPONSE_SCHEMA,
        },
      });

      const text = response.text ?? "";
      const parsed = GeminiResultSchema.safeParse(JSON.parse(text));
      if (!parsed.success) {
        logger.warn("Gemini response parse failed", parsed.error);
        return null;
      }

      return parsed.data;
    } catch (error) {
      logger.error("Gemini classification failed", error);
      return null;
    }
  }
}

export const autoExtractService = new AutoExtractService();
