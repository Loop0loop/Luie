import type { AnalysisContext } from "../../../../shared/types/analysis.js";
import type { AnalysisItemResult } from "./analysisPrompt.js";
import type { GeminiResult } from "../autoExtract/autoExtractPrompt.js";

const toCollapsedText = (value: string): string => value.replace(/\s+/g, " ").trim();

const pickQuote = (content: string, fallback = "본문 발췌"): string => {
  const collapsed = toCollapsedText(content);
  if (!collapsed) return fallback;
  return collapsed.slice(0, Math.min(120, collapsed.length));
};

const pickSecondQuote = (content: string, first: string): string => {
  const collapsed = toCollapsedText(content);
  if (!collapsed) return first;
  const start = Math.min(collapsed.length - 1, first.length + 1);
  if (start <= 0 || start >= collapsed.length) return first;
  const next = collapsed.slice(start, Math.min(collapsed.length, start + 120)).trim();
  return next.length > 0 ? next : first;
};

export const buildDeterministicAnalysisItems = (
  context: AnalysisContext,
): AnalysisItemResult[] => {
  const manuscript = context.manuscript.content;
  const quoteA = pickQuote(manuscript);
  const quoteB = pickSecondQuote(manuscript, quoteA);

  return [
    {
      type: "intro",
      content:
        "지금은 AI 연결이 불안정하여 로컬 분석 모드로 요약했습니다. 핵심 흐름과 독자 체감 기준으로 빠르게 점검해드릴게요.",
    },
    {
      type: "reaction",
      content:
        "이 구간은 장면 전환의 템포가 빠르게 이어져 몰입감이 유지됩니다. 특히 인용 구간이 분위기를 선명하게 잡아줍니다.",
      quote: quoteA,
      contextId: "local-fallback-reaction",
    },
    {
      type: "suggestion",
      content:
        "핵심 정보가 연속으로 배치되어 독자가 한 번에 받아들이기 어려울 수 있습니다. 문단 경계나 연결 문장을 짧게 보강해 보세요.",
      quote: quoteA,
      contextId: "local-fallback-suggestion-1",
    },
    {
      type: "suggestion",
      content:
        "다음 장면으로 넘어가기 전에 인물의 의도나 감정 변화를 한 줄 더 명시하면 흐름의 개연성이 더 또렷해집니다.",
      quote: quoteB,
      contextId: "local-fallback-suggestion-2",
    },
    {
      type: "outro",
      content:
        "로컬 분석 기준으로는 전체 흐름이 안정적입니다. 위 두 지점을 다듬으면 독자 체감 완성도가 더 올라갈 수 있습니다.",
    },
  ];
};

const inferEntityType = (name: string, contexts: string[]): GeminiResult["entityType"] => {
  const joined = `${name} ${contexts.join(" ")}`;
  if (/(길드|협회|조직|단체|학교|대학|회사|연맹)/.test(joined)) return "organization";
  if (/(성|탑|궁|마을|도시|숲|산|강|거리|던전)/.test(joined)) return "location";
  if (/(검|창|방패|반지|목걸이|무기|유물|artifact|아이템)/i.test(joined)) return "item";
  if (/(님|씨|군|양|왕|황제|공주|기사|마법사|선생|대장)/.test(joined)) return "character";
  return "concept";
};

export const buildDeterministicGeminiResult = (
  name: string,
  contexts: string[],
): GeminiResult => {
  const entityType = inferEntityType(name, contexts);
  const importance: GeminiResult["importance"] =
    contexts.length >= 3 ? "main" : contexts.length >= 2 ? "supporting" : "minor";
  return {
    name,
    entityType,
    importance,
    summary: `${name}와(과) 관련된 ${entityType} 요소로 추정됩니다. 문맥 기반 로컬 분류 결과입니다.`,
    confidence: contexts.length >= 2 ? 0.58 : 0.42,
    reasoning: "Edge/원격 모델 호출 실패로 로컬 규칙 기반 추정치를 사용했습니다.",
  };
};
