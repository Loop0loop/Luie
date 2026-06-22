import {
  WRITER_PAIN_POINT_TAXONOMY,
  type WriterPainPointTaxonomyKey,
} from "./memoryEvalPainPoints.js";
import type {
  MemoryEvalCaseType,
  MemoryEvalSeverity,
} from "../../../../../shared/types/memoryEval.js";

export type ChunkEvalSeedRow = {
  chunkId: string;
  projectId: string;
  chapterId: string | null;
  startOffset: number | null;
  endOffset: number | null;
  contextLabel: string | null;
  content: string;
};

export type TemporalChunkEvalSeedRow = ChunkEvalSeedRow & {
  chapterOrder: number;
  chapterTitle: string;
};

export type WriterPainPointTemplate = {
  key: WriterPainPointTaxonomyKey;
  caseType: MemoryEvalCaseType;
  severity: MemoryEvalSeverity;
  question: (input: { contextLabel: string; excerpt: string }) => string;
};

const QUESTION_BUILDERS: Record<
  WriterPainPointTaxonomyKey,
  (input: { contextLabel: string; excerpt: string }) => string
> = {
  "alias-confusion": ({ contextLabel, excerpt }) =>
    `${contextLabel} 기준으로, 이 대목의 인물/별칭/호칭이 같은 대상을 가리키는지 원문 근거로 확인해줘: ${excerpt}`,
  "knowledge-state": ({ contextLabel, excerpt }) =>
    `${contextLabel} 기준으로, 특정 캐릭터가 이 사실을 알고 있다고 써도 되는지 원문 근거로 판단해줘: ${excerpt}`,
  "future-leakage": ({ contextLabel, excerpt }) =>
    `${contextLabel} 시점까지만 보고, 이후 회차 정보를 섞지 않아도 이 설정을 확정해도 되는지 확인해줘: ${excerpt}`,
  "draft-contamination": ({ contextLabel, excerpt }) =>
    `초안/폐기 설정을 정사로 섞지 말고, ${contextLabel} 원문에 실제 근거가 있는지 확인해줘: ${excerpt}`,
  "relation-direction": ({ contextLabel, excerpt }) =>
    `${contextLabel}에서 관계 방향을 뒤집지 않게, 누가 누구에게 행동/감정을 갖는지 원문 근거로 확인해줘: ${excerpt}`,
  "unresolved-thread": ({ contextLabel, excerpt }) =>
    `${contextLabel}의 이 대목이 아직 미회수 떡밥인지, 이미 회수된 사실인지 근거 문장으로 확인해줘: ${excerpt}`,
  "continuity-state": ({ contextLabel, excerpt }) =>
    `${contextLabel}의 생존/부상/위치/소속/능력/소유물 상태가 이전 기억과 충돌할 수 있는지 근거부터 확인해줘: ${excerpt}`,
  "motivation-drift": ({ contextLabel, excerpt }) =>
    `${contextLabel}에서 이 감정선이나 행동 동기가 앞선 원문 근거로 뒷받침되는지 확인해줘: ${excerpt}`,
  "world-rule-conflict": ({ contextLabel, excerpt }) =>
    `${contextLabel}의 세계관 규칙, 능력 조건, 조직 규칙이 이전 원문 설정과 충돌하지 않는지 확인해줘: ${excerpt}`,
};

export const WRITER_PAIN_POINT_TEMPLATES: readonly WriterPainPointTemplate[] =
  WRITER_PAIN_POINT_TAXONOMY.map((item) => ({
    key: item.key,
    caseType: item.caseType,
    severity: item.severity,
    question: QUESTION_BUILDERS[item.key],
  }));

export function excerptFromContent(content: string): string {
  const normalized = content.replace(/\s+/g, " ").trim();
  if (normalized.length <= 90) return normalized;
  return `${normalized.slice(0, 90)}...`;
}

export function buildEvidenceRecallQuestion(input: {
  title: string;
  quote: string;
}): string {
  return `${input.title}의 원문 근거를 찾아라: ${excerptFromContent(input.quote)}`;
}

export function buildWriterPainPointCaseName(input: {
  templateKey: string;
  chunkId: string;
}): string {
  return `writer-pain:${input.templateKey}:${input.chunkId}`;
}

export function buildTemporalChapterCaseName(input: {
  chapterOrder: number;
  chunkId: string;
}): string {
  return `temporal-chapter:${input.chapterOrder}:${input.chunkId}`;
}
