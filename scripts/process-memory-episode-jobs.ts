#!/usr/bin/env tsx

import "dotenv/config";
import { z } from "zod";
import { db } from "../src/main/database/main/databaseService.js";
import type { RuntimeRoutePlan } from "../src/shared/types/llmRuntime.js";
import { generateUtilityText } from "../src/main/utility/llm/textGeneration.js";
import {
  processPendingEpisodeExtractionJobs,
  type MemoryEpisodeExtractionChunk,
  type MemoryEpisodeExtractor,
  type MemoryEpisodeExtractorCandidate,
} from "../src/main/services/features/memory/episode/memoryEpisodeExtractionProcessor.js";

type CliOptions = {
  projectId: string;
  provider: "auto" | "gemini" | "openai";
  geminiModel?: string;
  openAiModel?: string;
  limit: number;
  maxPasses: number;
};

const EpisodeEvidenceSchema = z.object({
  chunkId: z.string().min(1),
  quote: z.string().min(1),
  startOffset: z.number().int().nullable(),
  endOffset: z.number().int().nullable(),
});

const EpisodeCandidateSchema = z.object({
  episodeType: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  evidence: z.array(EpisodeEvidenceSchema).min(1),
});

const EpisodeExtractorResponseSchema = z.object({
  episodes: z.array(EpisodeCandidateSchema),
});

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    projectId: "",
    provider: "auto",
    limit: 2,
    maxPasses: 10,
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
      if (!Number.isFinite(parsed) || parsed < 1 || parsed > 10) {
        throw new Error("--limit must be an integer from 1 to 10");
      }
      options.limit = parsed;
      index += 1;
      continue;
    }
    if (arg === "--max-passes" && next) {
      const parsed = Number.parseInt(next, 10);
      if (!Number.isFinite(parsed) || parsed < 1 || parsed > 50) {
        throw new Error("--max-passes must be an integer from 1 to 50");
      }
      options.maxPasses = parsed;
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
    const geminiModel = (
      options.geminiModel?.trim() ||
      process.env.GEMINI_MODEL?.trim() ||
      "gemini-2.0-flash"
    ).replace(/^models\//, "");
    order.push("gemini");
    candidates.push({
      kind: "gemini",
      backend: "remote-http",
      apiKey: geminiKey,
      model: geminiModel,
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
    throw new Error("Configured provider API key is required for episode extraction");
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

function buildEpisodePrompt(chunks: MemoryEpisodeExtractionChunk[]): string {
  const chunkLines = chunks.map((chunk) =>
    [
      `chunkId: ${chunk.chunkId}`,
      `startOffset: ${chunk.startOffset ?? "null"}`,
      `endOffset: ${chunk.endOffset ?? "null"}`,
      "text:",
      chunk.content,
    ].join("\n"),
  );
  return [
    "너는 장편 웹소설의 episode memory extractor다.",
    "입력 chunk에 명시적으로 근거가 있는 주요 서사 사건만 추출하라.",
    "근거 없는 추론, 미래 정보, 요약만으로 만든 사실은 금지한다.",
    "서사 사건이 없으면 episodes를 빈 배열로 반환하라.",
    "응답은 JSON 객체 하나만 출력한다. 코드블록, 설명, markdown은 금지한다.",
    "",
    "JSON schema:",
    `{"episodes":[{"episodeType":"character_learns_secret|relation_changes|major_event|promise_opened|promise_resolved|character_appears|other","title":"string","summary":"string","evidence":[{"chunkId":"string","quote":"입력 chunk에서 정확히 복사한 근거 문장 또는 구절","startOffset":number|null,"endOffset":number|null}]}]}`,
    "",
    "chunks:",
    chunkLines.join("\n\n---\n\n"),
  ].join("\n");
}

function parseEpisodeResponse(text: string): MemoryEpisodeExtractorCandidate[] {
  const parsed = EpisodeExtractorResponseSchema.parse(JSON.parse(stripJsonFence(text)));
  return parsed.episodes;
}

function assertKnownEvidenceChunks(
  candidates: MemoryEpisodeExtractorCandidate[],
  chunks: MemoryEpisodeExtractionChunk[],
): void {
  const chunkIds = new Set(chunks.map((chunk) => chunk.chunkId));
  for (const candidate of candidates) {
    for (const evidence of candidate.evidence) {
      if (!chunkIds.has(evidence.chunkId)) {
        throw new Error(`MEMORY_EPISODE_LLM_UNKNOWN_EVIDENCE_CHUNK:${evidence.chunkId}`);
      }
    }
  }
}

function createHeadlessEpisodeExtractor(options: CliOptions): MemoryEpisodeExtractor {
  const providerNames = new Set<string>();
  const extractor: MemoryEpisodeExtractor = async (input) => {
    const generated = await generateUtilityText({
      projectId: input.projectId,
      prompt: buildEpisodePrompt(input.chunks),
      maxTokens: 1200,
      temperature: 0.1,
      runtimePlan: buildRuntimePlan(options),
    });
    providerNames.add(generated.providerName);
    const candidates = parseEpisodeResponse(generated.text);
    assertKnownEvidenceChunks(candidates, input.chunks);
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
  const extractor = createHeadlessEpisodeExtractor(options);
  const providerNames = (extractor as MemoryEpisodeExtractor & {
    providerNames: Set<string>;
  }).providerNames;

  await db.initialize();
  try {
    let processed = 0;
    const passes: Array<{ pass: number; queued: number; processed: number }> = [];
    for (let pass = 1; pass <= options.maxPasses; pass += 1) {
      const result = await processPendingEpisodeExtractionJobs({
        projectId: options.projectId,
        extractor,
        limit: options.limit,
      });
      processed += result.processed;
      passes.push({ pass, queued: result.queued, processed: result.processed });
      if (result.queued === 0 || result.processed === 0) break;
    }
    console.log(JSON.stringify({
      projectId: options.projectId,
      processed,
      passes,
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
