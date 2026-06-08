import { z } from "zod";
import { utilityProcessBridge } from "../../utility/utilityProcessBridge.js";
import type {
  MemoryTemporalFactExtractionEntity,
  MemoryTemporalFactExtractionEvidence,
  MemoryTemporalFactExtractor,
  MemoryTemporalFactExtractorCandidate,
} from "./memoryTemporalFactExtractionRunner.js";

const RelationProjectionSchema = z.object({
  kind: z.literal("relation"),
  sourceEntityId: z.string().min(1),
  targetEntityId: z.string().min(1),
  relation: z.string().min(1),
});

const CharacterProjectionSchema = z.object({
  kind: z.literal("character"),
  entityId: z.string().min(1),
  stateType: z.string().min(1),
  stateValue: z.string().min(1),
});

const KnowledgeProjectionSchema = z.object({
  kind: z.literal("knowledge"),
  knowerEntityId: z.string().min(1),
  secretEntityId: z.string().min(1).nullable(),
  knowledgeKey: z.string().min(1),
  knowledgeValue: z.string().min(1),
});

const TemporalFactCandidateSchema = z.object({
  subjectEntityId: z.string().min(1),
  predicate: z.string().min(1),
  objectEntityId: z.string().min(1).nullable(),
  objectValue: z.string().min(1).nullable(),
  valueType: z.string().min(1),
  validFromChapterId: z.string().min(1),
  validFromChapterOrder: z.number().int(),
  validToChapterId: z.string().min(1).nullable(),
  validToChapterOrder: z.number().int().nullable(),
  observedAtChapterId: z.string().min(1),
  observedAtChapterOrder: z.number().int(),
  confidence: z.number().int().min(0).max(100),
  sourceContentHash: z.string().min(1),
  evidenceIds: z.array(z.string().min(1)).min(1),
  projection: z.discriminatedUnion("kind", [
    RelationProjectionSchema,
    CharacterProjectionSchema,
    KnowledgeProjectionSchema,
  ]),
});

const TemporalFactExtractorResponseSchema = z.object({
  facts: z.array(TemporalFactCandidateSchema),
});

function stripJsonFence(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced?.[1]?.trim() ?? trimmed;
}

function parseTemporalFactExtractorResponse(
  text: string,
): MemoryTemporalFactExtractorCandidate[] {
  const parsed = TemporalFactExtractorResponseSchema.parse(
    JSON.parse(stripJsonFence(text)),
  );
  return parsed.facts;
}

function buildTemporalFactExtractionPrompt(input: {
  evidence: MemoryTemporalFactExtractionEvidence[];
  entities: MemoryTemporalFactExtractionEntity[];
}): string {
  const entityLines = input.entities.map((entity) =>
    [
      `entityId: ${entity.id}`,
      `name: ${entity.canonicalName}`,
      `type: ${entity.entityType}`,
      `status: ${entity.status}`,
    ].join("\n"),
  );
  const evidenceLines = input.evidence.map((evidence) =>
    [
      `evidenceId: ${evidence.evidenceId}`,
      `episodeId: ${evidence.episodeId}`,
      `episodeType: ${evidence.episodeType}`,
      `chapterId: ${evidence.chapterId}`,
      `chapterOrder: ${evidence.chapterOrder}`,
      `sourceContentHash: ${evidence.sourceContentHash}`,
      `quote: ${evidence.quote}`,
    ].join("\n"),
  );

  return [
    "너는 장편 웹소설의 temporal memory fact extractor다.",
    "입력 evidence에 명시적으로 근거가 있는 관계/상태/지식 변화만 추출하라.",
    "반드시 제공된 entityId와 evidenceId만 사용하라.",
    "미래 정보나 추론으로 validity window를 만들지 말라.",
    "허용 predicate 예: allied_with, hostile_to, belongs_to, knows_secret, revealed_identity, betrayed, protects, seeks, located_at, alive_status.",
    "응답은 JSON 객체 하나만 출력한다. 코드블록, 설명, markdown은 금지한다.",
    "",
    "JSON schema:",
    `{"facts":[{"subjectEntityId":"string","predicate":"string","objectEntityId":"string|null","objectValue":"string|null","valueType":"entity|string|boolean|number","validFromChapterId":"string","validFromChapterOrder":number,"validToChapterId":"string|null","validToChapterOrder":number|null,"observedAtChapterId":"string","observedAtChapterOrder":number,"confidence":0-100,"sourceContentHash":"string","evidenceIds":["string"],"projection":{"kind":"relation|character|knowledge"}}]}`,
    "",
    "entities:",
    entityLines.join("\n\n---\n\n"),
    "",
    "evidence:",
    evidenceLines.join("\n\n---\n\n"),
  ].join("\n");
}

function assertKnownIds(
  candidates: MemoryTemporalFactExtractorCandidate[],
  evidence: MemoryTemporalFactExtractionEvidence[],
  entities: MemoryTemporalFactExtractionEntity[],
): void {
  const evidenceIds = new Set(evidence.map((item) => item.evidenceId));
  const entityIds = new Set(entities.map((entity) => entity.id));
  for (const candidate of candidates) {
    for (const evidenceId of candidate.evidenceIds) {
      if (!evidenceIds.has(evidenceId)) {
        throw new Error(
          `MEMORY_TEMPORAL_FACT_LLM_UNKNOWN_EVIDENCE:${evidenceId}`,
        );
      }
    }

    const referencedEntityIds = [
      candidate.subjectEntityId,
      candidate.objectEntityId,
      candidate.projection.kind === "relation"
        ? candidate.projection.sourceEntityId
        : candidate.projection.kind === "character"
          ? candidate.projection.entityId
          : candidate.projection.knowerEntityId,
      candidate.projection.kind === "relation"
        ? candidate.projection.targetEntityId
        : candidate.projection.kind === "knowledge"
          ? candidate.projection.secretEntityId
          : null,
    ].filter((value): value is string => typeof value === "string");

    for (const entityId of referencedEntityIds) {
      if (!entityIds.has(entityId)) {
        throw new Error(`MEMORY_TEMPORAL_FACT_LLM_UNKNOWN_ENTITY:${entityId}`);
      }
    }
  }
}

export function createLlmTemporalFactExtractor(): MemoryTemporalFactExtractor {
  return async (input) => {
    const generated = await utilityProcessBridge.generateText(
      input.projectId,
      buildTemporalFactExtractionPrompt(input),
      {
        maxTokens: 1200,
        temperature: 0.1,
      },
    );
    const candidates = parseTemporalFactExtractorResponse(generated.text);
    assertKnownIds(candidates, input.evidence, input.entities);
    return candidates;
  };
}

export const llmTemporalFactExtractor = createLlmTemporalFactExtractor();
