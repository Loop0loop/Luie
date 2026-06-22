#!/usr/bin/env tsx

import "dotenv/config";
import { z } from "zod";
import { db } from "../src/main/database/main/databaseService.js";
import type { RuntimeRoutePlan } from "../src/shared/types/llmRuntime.js";
import { generateUtilityText } from "../src/main/utility/llm/textGeneration.js";
import {
  processPendingTemporalFactExtraction,
  type MemoryTemporalFactExtractionEntity,
  type MemoryTemporalFactExtractionEvidence,
  type MemoryTemporalFactExtractor,
  type MemoryTemporalFactExtractorCandidate,
} from "../src/main/services/features/memory/temporal/index.js";

type CliOptions = {
  projectId: string;
  provider: "auto" | "gemini" | "openai";
  geminiModel?: string;
  openAiModel?: string;
  limit: number;
};

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
  secretEntityId: z.preprocess(
    (value) => value === "null" ? null : value,
    z.string().min(1).nullable(),
  ),
  knowledgeKey: z.string().min(1),
  knowledgeValue: z.string().min(1),
});

const TemporalFactCandidateSchema = z.object({
  subjectEntityId: z.string().min(1),
  predicate: z.string().min(1),
  objectEntityId: z.preprocess(
    (value) => value === "null" ? null : value,
    z.string().min(1).nullable(),
  ),
  objectValue: z.preprocess(
    (value) => value === "null" ? null : value,
    z.string().min(1).nullable(),
  ),
  valueType: z.string().min(1),
  validFromChapterId: z.string().min(1),
  validFromChapterOrder: z.number().int(),
  validToChapterId: z.preprocess(
    (value) => value === "null" ? null : value,
    z.string().min(1).nullable(),
  ),
  validToChapterOrder: z.preprocess(
    (value) => value === "null" ? null : value,
    z.number().int().nullable(),
  ),
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

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    projectId: "",
    provider: "auto",
    limit: 20,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === "--project-id" && next) {
      options.projectId = next;
      index += 1;
      continue;
    }
    if (arg === "--provider" && next) {
      if (!["auto", "gemini", "openai"].includes(next)) {
        throw new Error("--provider must be one of: auto, gemini, openai");
      }
      options.provider = next as CliOptions["provider"];
      index += 1;
      continue;
    }
    if (arg === "--gemini-model" && next) {
      options.geminiModel = next;
      index += 1;
      continue;
    }
    if (arg === "--openai-model" && next) {
      options.openAiModel = next;
      index += 1;
      continue;
    }
    if (arg === "--limit" && next) {
      const parsed = Number.parseInt(next, 10);
      if (!Number.isFinite(parsed) || parsed < 1 || parsed > 50) {
        throw new Error("--limit must be an integer from 1 to 50");
      }
      options.limit = parsed;
      index += 1;
    }
  }
  if (!options.projectId.trim()) {
    throw new Error("--project-id is required");
  }
  return options;
}

function buildRuntimePlan(
  options: Pick<CliOptions, "provider" | "geminiModel" | "openAiModel">,
): RuntimeRoutePlan {
  const candidates: RuntimeRoutePlan["candidates"] = [];
  const order: RuntimeRoutePlan["order"] = [];
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  if (geminiKey && options.provider !== "openai") {
    order.push("gemini");
    candidates.push({
      kind: "gemini",
      backend: "remote-http",
      apiKey: geminiKey,
      model: (options.geminiModel?.trim() || process.env.GEMINI_MODEL?.trim() || "gemini-2.0-flash").replace(/^models\//, ""),
      alternativeModel: process.env.ALTERNATIVE_GEMINI_MODEL?.trim().replace(/^models\//, "") || undefined,
      embeddingModel: process.env.GEMINI_EMBEDDING_MODEL?.trim() || "text-embedding-004",
    });
  }
  const openAiKey = process.env.OPENAI_API_KEY?.trim();
  if (openAiKey && options.provider !== "gemini") {
    order.push("openai");
    candidates.push({
      kind: "openai",
      backend: "remote-http",
      baseUrl: "https://api.openai.com/v1",
      apiKey: openAiKey,
      model: options.openAiModel?.trim() || process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini",
      embeddingModel: process.env.OPENAI_EMBEDDING_MODEL?.trim() || undefined,
    });
  }
  if (order.length === 0) {
    throw new Error("Configured provider API key is required for temporal fact extraction");
  }
  return { requestedProvider: "auto", fallbackPolicy: "fail-closed", order, candidates, skipped: [] };
}

function stripJsonFence(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced?.[1]?.trim() ?? trimmed;
}

function buildTemporalPrompt(input: {
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
      `episodeTitle: ${evidence.episodeTitle}`,
      `episodeSummary: ${evidence.episodeSummary}`,
      `chapterId: ${evidence.chapterId}`,
      `chapterOrder: ${evidence.chapterOrder}`,
      `sourceContentHash: ${evidence.sourceContentHash}`,
      `quote: ${evidence.quote}`,
    ].join("\n"),
  );
  return [
    "너는 장편 웹소설의 temporal memory fact extractor다.",
    "입력 evidence에 명시적으로 근거가 있는 관계/상태/지식 변화만 추출하라.",
    "반드시 제공된 entityId와 evidenceId만 사용하라. 맞는 entity가 없으면 facts를 빈 배열로 반환하라.",
    "미래 정보나 추론으로 validity window를 만들지 말라.",
    "허용 predicate 예: allied_with, hostile_to, belongs_to, knows_secret, revealed_identity, betrayed, protects, seeks, located_at, alive_status.",
    "응답은 JSON 객체 하나만 출력한다. 코드블록, 설명, markdown은 금지한다.",
    "",
    "JSON schema:",
    `{"facts":[{"subjectEntityId":"string","predicate":"string","objectEntityId":"string|null","objectValue":"string|null","valueType":"entity|string|boolean|number","validFromChapterId":"string","validFromChapterOrder":number,"validToChapterId":"string|null","validToChapterOrder":number|null,"observedAtChapterId":"string","observedAtChapterOrder":number,"confidence":0-100,"sourceContentHash":"string","evidenceIds":["string"],"projection":{"kind":"relation","sourceEntityId":"string","targetEntityId":"string","relation":"string"}}]}`,
    `For character-state facts use projection exactly: {"kind":"character","entityId":"string","stateType":"string","stateValue":"string"}`,
    `For knowledge facts use projection exactly: {"kind":"knowledge","knowerEntityId":"string","secretEntityId":"string|null","knowledgeKey":"string","knowledgeValue":"string"}`,
    "Do not return a projection object with only kind.",
    "",
    "entities:",
    entityLines.join("\n\n---\n\n"),
    "",
    "evidence:",
    evidenceLines.join("\n\n---\n\n"),
  ].join("\n");
}

function parseTemporalResponse(text: string): MemoryTemporalFactExtractorCandidate[] {
  const parsed = TemporalFactExtractorResponseSchema.parse(JSON.parse(stripJsonFence(text)));
  return parsed.facts;
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
        throw new Error(`MEMORY_TEMPORAL_FACT_LLM_UNKNOWN_EVIDENCE:${evidenceId}`);
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

function createHeadlessTemporalExtractor(options: CliOptions): MemoryTemporalFactExtractor {
  const providerNames = new Set<string>();
  const extractor: MemoryTemporalFactExtractor = async (input) => {
    const generated = await generateUtilityText({
      projectId: input.projectId,
      prompt: buildTemporalPrompt(input),
      maxTokens: 1400,
      temperature: 0.1,
      runtimePlan: buildRuntimePlan(options),
    });
    providerNames.add(generated.providerName);
    const candidates = parseTemporalResponse(generated.text);
    assertKnownIds(candidates, input.evidence, input.entities);
    return candidates;
  };
  Object.defineProperty(extractor, "providerNames", { value: providerNames, enumerable: false });
  return extractor;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const extractor = createHeadlessTemporalExtractor(options);
  const providerNames = (extractor as MemoryTemporalFactExtractor & {
    providerNames: Set<string>;
  }).providerNames;
  await db.initialize();
  try {
    const result = await processPendingTemporalFactExtraction({
      projectId: options.projectId,
      extractor,
      extractorVersion: "fact-v1",
      limit: options.limit,
    });
    console.log(JSON.stringify({
      projectId: options.projectId,
      ...result,
      providerName: [...providerNames].join(",") || null,
    }, null, 2));
  } finally {
    await db.disconnect();
  }
}

await main().catch((error) => {
  console.error(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }, null, 2));
  process.exit(1);
});
