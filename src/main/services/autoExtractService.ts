import "dotenv/config";
import { createLogger } from "../../shared/logger/index.js";
import { db } from "../database/index.js";
import { keywordExtractor } from "../core/keywordExtractor.js";
import { characterService } from "./characterService.js";
import { termService } from "./termService.js";
import { z } from "zod";

const logger = createLogger("AutoExtractService");

const GeminiResultSchema = z.object({
  name: z.string(),
  entityType: z.enum([
    "character",
    "location",
    "organization",
    "item",
    "concept",
  ]),
  importance: z.enum(["main", "supporting", "minor", "unknown"]).default("unknown"),
  summary: z.string(),
  confidence: z.number().min(0).max(1).default(0.5),
  reasoning: z.string().optional(), // 분류 근거
});

type GeminiResult = z.infer<typeof GeminiResultSchema>;

// Few-shot examples for better classification
const FEW_SHOT_EXAMPLES = `
예시 1:
입력: "이준혁은 서울대학교 의과대학을 졸업한 뒤 강남세브란스병원에서 근무하고 있다."
출력: {
  "name": "이준혁",
  "entityType": "character",
  "importance": "main",
  "summary": "서울대 의대 출신으로 강남세브란스병원에 근무하는 의사",
  "confidence": 0.95,
  "reasoning": "인물의 학력과 직장이 구체적으로 서술됨"
}

예시 2:
입력: "그녀는 엘프의 숲 깊은 곳에 위치한 실버문 탑으로 향했다."
출력: {
  "name": "실버문 탑",
  "entityType": "location",
  "importance": "supporting",
  "summary": "엘프의 숲 깊은 곳에 위치한 장소",
  "confidence": 0.85,
  "reasoning": "구체적인 위치 정보가 제공됨"
}

예시 3:
입력: "검은달 조직은 음지에서 세계를 조종하는 비밀결사다."
출력: {
  "name": "검은달",
  "entityType": "organization",
  "importance": "main",
  "summary": "세계를 음지에서 조종하는 비밀결사 조직",
  "confidence": 0.9,
  "reasoning": "조직의 목적과 성격이 명확히 드러남"
}
`.trim();

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
    }, 1500);

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

  private async analyzeChapter(
    chapterId: string,
    projectId: string,
    content: string,
  ) {
    const dirtyParagraphs = this.getDirtyParagraphs(chapterId, content);
    if (dirtyParagraphs.length === 0) {
      return;
    }

    const [characters, terms] = await Promise.all([
      db.getClient().character.findMany({
        where: { projectId },
        select: { id: true, name: true, description: true },
      }),
      db.getClient().term.findMany({
        where: { projectId },
        select: { id: true, term: true, definition: true, category: true },
      }),
    ]);

    keywordExtractor.setKnownCharacters(
      characters.map((c: { name: string }) => c.name),
    );
    keywordExtractor.setKnownTerms(
      terms.map((t: { term: string }) => t.term),
    );

    const candidates = dirtyParagraphs.flatMap((p) =>
      keywordExtractor.extractNouns(p),
    );

    const filtered = keywordExtractor
      .filterByFrequency(candidates, 2)
      .filter((word) =>
        !characters.some((c: { name: string }) => c.name === word),
      )
      .filter((word) => !terms.some((t: { term: string }) => t.term === word));

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
      const contexts = dirtyParagraphs
        .filter((p) => p.includes(name))
        .slice(0, 3);

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

JSON 형식으로만 답하세요:
{
  "name": "${name}",
  "entityType": "character|location|organization|item|concept",
  "importance": "main|supporting|minor|unknown",
  "summary": "구체적이고 간결한 1-2문장 요약",
  "confidence": 0~1,
  "reasoning": "분류 근거를 간단히 설명"
}

주의사항:
1. 문맥에서 확인할 수 없는 정보는 추측하지 마세요
2. summary는 문맥 기반으로만 작성하세요
3. confidence는 문맥의 명확성에 따라 조정하세요`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-001:generateContent?key=${apiKey}`;
    
    const requestBody = {
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.1, // 더 결정론적인 응답
        topK: 1,
        topP: 0.95,
        maxOutputTokens: 512,
        response_mime_type: "application/json",
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_NONE",
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_NONE",
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_NONE",
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_NONE",
        },
      ],
    };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      logger.warn("Gemini response error", {
        status: response.status,
        statusText: response.statusText,
      });
      return null;
    }

    const json = await response.json();
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      logger.warn("Gemini empty response", { name });
      return null;
    }

    try {
      const parsed = GeminiResultSchema.safeParse(JSON.parse(text));
      if (!parsed.success) {
        logger.warn("Gemini response schema mismatch", {
          name,
          issues: parsed.error.issues,
        });
        return null;
      }
      return parsed.data;
    } catch (error) {
      logger.warn("Gemini JSON parse failed", { name, error });
      return null;
    }
  }
}

export const autoExtractService = new AutoExtractService();
