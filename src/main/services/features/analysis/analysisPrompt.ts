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
입력: "방패는 절대 깨지지 않는다고 믿었다. 하지만 다음 문장에서 그 방패가 바로 산산조각 났다."
출력: {
  "type": "suggestion",
  "content": "같은 본문 안에서 방패의 내구도 설정이 상충돼 독자가 설정을 헷갈릴 수 있습니다. 두 문장 사이의 조건이나 예외를 한 줄 보강하면 자연스러워집니다.",
  "quote": "방패는 절대 깨지지 않는다고 믿었다. 하지만 다음 문장에서 그 방패가 바로 산산조각 났다.",
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
2. 구체적인 텍스트 인용 필수 (quote 필드 활용, 원고 본문의 정확한 부분 문자열만 허용)
3. 예의 바르고 존중하는 어조 유지
4. 문제점만이 아닌 잘된 점도 언급
5. JSONL 형식으로만 응답 (각 줄마다 JSON 객체 1개, 코드블록 금지)
6. 제공된 원고 본문 외 정보 사용 금지 (외부 지식, 추측, 기억, 세계관 DB/캐릭터 DB 가정 금지)
7. 본문에 없는 인물/설정/사건을 새로 만들어서 언급 금지

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
- 근거가 부족하면 단정하지 말고, "본문 근거 부족"으로 명시
`.trim();

/**
 * Context Formatting Function
 * AnalysisContext를 Gemini Prompt로 변환
 */
export function formatAnalysisContext(context: AnalysisContext): string {
  const { manuscript } = context;

  let prompt = `# 원고 분석 요청\n\n`;

  // 1. 원고 정보
  prompt += `## 원고\n`;
  prompt += `**제목**: ${manuscript.title}\n\n`;
  prompt += `**내용**:\n${manuscript.content}\n\n`;

  // 2. 추출된 명사구 (원고 본문 기반 NLP 결과)
  if (manuscript.nounPhrases.length > 0) {
    prompt += `## 주요 명사구\n`;
    prompt += manuscript.nounPhrases.slice(0, 20).join(", ");
    prompt += `\n\n`;
  }

  // 3. 분석 요청
  prompt += `## 분석 요청\n`;
  prompt += `위 원고 본문만 근거로 독자 관점에서 분석해주세요.\n`;
  prompt += `- 독자가 느낄 감정, 몰입도\n`;
  prompt += `- 설정 모순, 캐릭터 일관성 문제\n`;
  prompt += `- 플롯 구멍, 개연성 문제\n`;
  prompt += `- 개선 제안\n\n`;
  prompt += `중요: 본문에 없는 사실을 추가하지 마세요.\n`;
  prompt += `reaction/suggestion의 quote는 반드시 본문에서 정확히 복사한 문장(또는 구절)이어야 합니다.\n`;
  prompt += `JSONL 형식으로만 응답하세요.\n`;
  prompt += `반드시 다음 구성으로 포함하세요 (각 줄 1개 JSON):\n`;
  prompt += `- intro 1개\n`;
  prompt += `- reaction 최소 1개 (quote 포함)\n`;
  prompt += `- suggestion 최소 2개 (quote 포함)\n`;
  prompt += `- outro 1개\n`;
  prompt += `코드블록(\`\`\`)과 배열 형식 출력 금지.\n`;

  return prompt;
}
