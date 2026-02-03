import { z } from "zod";
import { Type } from "@google/genai";

export const GeminiResultSchema = z.object({
  name: z.string(),
  entityType: z.enum(["character", "location", "organization", "item", "concept"]),
  importance: z.enum(["main", "supporting", "minor", "unknown"]).default("unknown"),
  summary: z.string(),
  confidence: z.number().min(0).max(1).default(0.5),
  reasoning: z.string().optional(),
});

export type GeminiResult = z.infer<typeof GeminiResultSchema>;

export const FEW_SHOT_EXAMPLES = `
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

export const GEMINI_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    entityType: {
      type: Type.STRING,
      enum: ["character", "location", "organization", "item", "concept"],
    },
    importance: {
      type: Type.STRING,
      enum: ["main", "supporting", "minor", "unknown"],
    },
    summary: { type: Type.STRING },
    confidence: { type: Type.NUMBER },
    reasoning: { type: Type.STRING },
  },
  required: ["name", "entityType", "importance", "summary", "confidence"],
  propertyOrdering: [
    "name",
    "entityType",
    "importance",
    "summary",
    "confidence",
    "reasoning",
  ],
} as const;
