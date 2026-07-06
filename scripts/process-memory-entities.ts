#!/usr/bin/env tsx

import "dotenv/config";
import { z } from "zod";
import { db } from "../src/main/database/main/databaseService.js";
import type { RuntimeRoutePlan } from "../src/shared/types/llmRuntime.js";
import { generateUtilityText } from "../src/main/utility/llm/textGeneration.js";
import {
  processMemoryEntityExtraction,
  type MemoryEntityExtractionChunk,
  type MemoryEntityExtractor,
  type MemoryEntityExtractorCandidate,
} from "../src/main/services/features/memory/entity/memoryEntityExtractionRunner.js";

type CliOptions = {
  projectId: string;
  provider: "auto" | "gemini" | "openai";
  geminiModel?: string;
  openAiModel?: string;
  limit: number;
};

const EntityMentionSchema = z.object({
  chunkId: z.string().min(1),
  quote: z.string().min(1),
  startOffset: z.number().int().nullable(),
  endOffset: z.number().int().nullable(),
  confidence: z.number().int().min(0).max(100).optional(),
});

const EntityCandidateSchema = z.object({
  entityType: z.string().min(1),
  canonicalName: z.string().min(1),
  aliases: z.array(z.string().min(1)).optional(),
  confidence: z.number().int().min(0).max(100).optional(),
  mentions: z.array(EntityMentionSchema).min(1),
});

const EntityExtractorResponseSchema = z.object({
  entities: z.array(EntityCandidateSchema),
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
      continue;
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
    throw new Error("Configured provider API key is required for entity extraction");
  }
  return {
    requestedProvider: "auto",
    fallbackPolicy: "fail-closed",
    order,
    candidates,
    skipped: [],
  };
}

function stripJsonFence(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced?.[1]?.trim() ?? trimmed;
}

function buildEntityPrompt(chunks: MemoryEntityExtractionChunk[]): string {
  const chunkLines = chunks.map((chunk) =>
    [
      `chunkId: ${chunk.id}`,
      `sourceType: ${chunk.sourceType}`,
      `chapterId: ${chunk.chapterId ?? "null"}`,
      `startOffset: ${chunk.startOffset ?? "null"}`,
      `endOffset: ${chunk.endOffset ?? "null"}`,
      "text:",
      chunk.content,
    ].join("\n"),
  );
  return [
    "너는 장편 웹소설의 canonical memory entity extractor다.",
    "명시적으로 등장하거나 언급된 인물, 조직, 장소, 사물, 개념만 추출하라.",
    "일반 명사, 대명사만 있는 항목, 근거 없는 추론은 금지한다.",
    "응답은 JSON 객체 하나만 출력한다. 코드블록, 설명, markdown은 금지한다.",
    "",
    "JSON schema:",
    `{"entities":[{"entityType":"character|group|place|object|concept|other","canonicalName":"string","aliases":["string"],"confidence":0-100,"mentions":[{"chunkId":"string","quote":"입력 chunk에서 정확히 복사한 근거 문장 또는 구절","startOffset":number|null,"endOffset":number|null,"confidence":0-100}]}]}`,
    "",
    "chunks:",
    chunkLines.join("\n\n---\n\n"),
  ].join("\n");
}

function parseEntityResponse(text: string): MemoryEntityExtractorCandidate[] {
  const parsed = EntityExtractorResponseSchema.parse(JSON.parse(stripJsonFence(text)));
  return parsed.entities;
}

function assertKnownMentionChunks(
  candidates: MemoryEntityExtractorCandidate[],
  chunks: MemoryEntityExtractionChunk[],
): void {
  const chunkIds = new Set(chunks.map((chunk) => chunk.id));
  for (const candidate of candidates) {
    for (const mention of candidate.mentions) {
      if (!chunkIds.has(mention.chunkId)) {
        throw new Error(`MEMORY_ENTITY_LLM_UNKNOWN_MENTION_CHUNK:${mention.chunkId}`);
      }
    }
  }
}

function createHeadlessEntityExtractor(options: CliOptions): MemoryEntityExtractor {
  const providerNames = new Set<string>();
  const extractor: MemoryEntityExtractor = async (input) => {
    const generated = await generateUtilityText({
      projectId: input.projectId,
      prompt: buildEntityPrompt(input.chunks),
      maxTokens: 1600,
      temperature: 0.1,
      runtimePlan: buildRuntimePlan(options),
    });
    providerNames.add(generated.providerName);
    const candidates = parseEntityResponse(generated.text);
    assertKnownMentionChunks(candidates, input.chunks);
    return candidates;
  };
  Object.defineProperty(extractor, "providerNames", {
    value: providerNames,
    enumerable: false,
  });
  return extractor;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const extractor = createHeadlessEntityExtractor(options);
  const providerNames = (extractor as MemoryEntityExtractor & {
    providerNames: Set<string>;
  }).providerNames;

  await db.initialize();
  try {
    const result = await processMemoryEntityExtraction({
      projectId: options.projectId,
      extractor,
      extractorVersion: "entity-v1",
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
  console.error(
    JSON.stringify(
      { error: error instanceof Error ? error.message : String(error) },
      null,
      2,
    ),
  );
  process.exit(1);
});
