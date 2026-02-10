import { z } from "zod";
import { Type } from "@google/genai";
import type { AnalysisContext } from "../../../../shared/types/analysis.js";

/**
 * Gemini 분석 응답 스키마 (Zod)
 */
export const AnalysisItemSchema = z.object({
  type: z.enum(["reaction", "suggestion", "intro", "outro"]),
  content: z.string(),
  quote: z.string().optional(),
  contextId: z.string().optional(),
});

export type AnalysisItemResult = z.infer<typeof AnalysisItemSchema>;

/**
 * Gemini API Response Schema
 */
export const GEMINI_ANALYSIS_RESPONSE_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      type: {
        type: Type.STRING,
        enum: ["reaction", "suggestion", "intro", "outro"],
      },
      content: { type: Type.STRING },
      quote: { type: Type.STRING },
      contextId: { type: Type.STRING },
    },
    required: ["type", "content"],
    propertyOrdering: ["type", "content", "quote", "contextId"],
  },
  minItems: 4,
} as const;

/**
 * Few-shot Examples
 */
export const ANALYSIS_FEW_SHOT_EXAMPLES = `
예시 1 (독자 반응):
입력: "그는 천천히 고개를 들었고, 거울 속의 자신과 눈이 마주쳤다."
출력: {
  "type": "reaction",
  "content": "이 구간의 긴장감이 상당합니다. 주인공이 진실을 마주하는 순간의 호흡이 짧게 끊어지면서, 읽는 사람도 같이 숨을 참게 만드네요.",
  "quote": "그는 천천히 고개를 들었고, 거울 속의 자신과 눈이 마주쳤다.",
  "contextId": "ctx-1"
}

예시 2 (모순점 발견):
입력: "창끝이 닿자마자 방패에는 금이 가기 시작했다." (이전 챕터: "이 방패는 절대 부서지지 않는다")
출력: {
  "type": "suggestion",
  "content": "3챕터에서 언급된 '절대 방패' 설정과 이 장면의 충돌이 조금 신경 쓰입니다. 독자들이 '어? 아까는 안 부서진다며?'라고 생각할 수도 있을 것 같아요.",
  "quote": "창끝이 닿자마자 방패에는 금이 가기 시작했다.",
  "contextId": "ctx-2"
}

예시 3 (인트로):
출력: {
  "type": "intro",
  "content": "작가님, 이번 챕터는 정말 흥미로웠습니다.\\n특히 인물의 내면 묘사가 이전보다 훨씬 깊어졌다는 인상을 받았습니다.\\n독자의 입장에서 몇 가지 눈에 띄는 지점들을 짚어보았습니다."
}

예시 4 (아웃트로):
출력: {
  "type": "outro",
  "content": "전반적으로 이번 챕터는 독자의 몰입을 잘 이끌어낸다고 생각합니다.\\n위에서 언급한 부분들만 살짝 다듬으시면 더욱 완성도 높은 챕터가 될 것 같습니다."
}
`.trim();

/**
 * System Instruction (Gemini 페르소나)
 */
export const ANALYSIS_SYSTEM_INSTRUCTION = `
당신은 한국 문학 전문 편집자입니다.
작가가 작성한 원고를 독자의 관점에서 분석하고, 건설적인 피드백을 제공하는 것이 목표입니다.

## 역할
- 독자가 원고를 읽으며 느낄 감정, 몰입도, 혼란 지점을 예측
- 설정 모순, 캐릭터 일관성 문제, 플롯 구멍 등을 발견
- 비판적이되 존중하는 태도로 피드백 제공
- 구체적인 인용과 함께 문제점을 지적
- 개선 방향을 건설적으로 제안

## 제약 사항
1. 독자 관점에서 분석 (전지적 시점 X)
2. 구체적인 텍스트 인용 필수 (quote 필드 활용)
3. 예의 바르고 존중하는 어조 유지
4. 문제점만이 아닌 잘된 점도 언급
5. JSONL 형식으로만 응답 (각 줄마다 JSON 객체 1개, 코드블록 금지)

## 출력 형식
- JSONL만 허용: 각 줄마다 JSON 객체 1개
- 각 객체는 다음 필드를 포함
  - type: "reaction" (독자 반응), "suggestion" (개선 제안), "intro" (시작 인사), "outro" (마무리 멘트)
  - content: 분석 내용 (한글, 자연스러운 문장)
  - quote: 인용 텍스트 (reaction/suggestion에서 필수)
  - contextId: 원고 내 위치 식별자 (필요시)

## 중요
- 작가의 창작 의도를 존중하되, 독자가 혼란스러울 부분은 명확히 지적
- "이건 틀렸어요"가 아닌 "독자가 이렇게 느낄 수 있어요" 톤 유지
`.trim();

/**
 * Context Formatting Function
 * AnalysisContext를 Gemini Prompt로 변환
 */
export function formatAnalysisContext(context: AnalysisContext): string {
  const { characters, terms, manuscript } = context;

  let prompt = `# 원고 분석 요청\n\n`;

  // 1. 원고 정보
  prompt += `## 원고\n`;
  prompt += `**제목**: ${manuscript.title}\n\n`;
  prompt += `**내용**:\n${manuscript.content}\n\n`;

  // 2. 등장 캐릭터
  if (characters.length > 0) {
    prompt += `## 등장 캐릭터\n`;
    characters.forEach((char) => {
      prompt += `- **${char.name}**: ${char.description}\n`;
    });
    prompt += `\n`;
  }

  // 3. 세계관 용어
  if (terms.length > 0) {
    prompt += `## 세계관 용어\n`;
    terms.forEach((term) => {
      prompt += `- **${term.term}** (${term.category}): ${term.definition}\n`;
    });
    prompt += `\n`;
  }

  // 4. 추출된 명사구 (NLP 결과)
  if (manuscript.nounPhrases.length > 0) {
    prompt += `## 주요 명사구\n`;
    prompt += manuscript.nounPhrases.slice(0, 20).join(", ");
    prompt += `\n\n`;
  }

  // 5. 분석 요청
  prompt += `## 분석 요청\n`;
  prompt += `위 원고를 독자 관점에서 분석해주세요.\n`;
  prompt += `- 독자가 느낄 감정, 몰입도\n`;
  prompt += `- 설정 모순, 캐릭터 일관성 문제\n`;
  prompt += `- 플롯 구멍, 개연성 문제\n`;
  prompt += `- 개선 제안\n\n`;
  prompt += `JSONL 형식으로만 응답하세요.\n`;
  prompt += `반드시 다음 구성으로 포함하세요 (각 줄 1개 JSON):\n`;
  prompt += `- intro 1개\n`;
  prompt += `- reaction 최소 1개 (quote 포함)\n`;
  prompt += `- suggestion 최소 2개 (quote 포함)\n`;
  prompt += `- outro 1개\n`;
  prompt += `코드블록(\`\`\`)과 배열 형식 출력 금지.\n`;

  return prompt;
}
