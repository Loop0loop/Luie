#!/usr/bin/env tsx

import "dotenv/config";
import os from "node:os";
import path from "node:path";
import { existsSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { DB_NAME } from "../src/shared/constants/index.js";
import type { RuntimeRoutePlan } from "../src/shared/types/llmRuntime.js";
import { resolveSqliteDatasourceFromEnv } from "../src/main/database/runtime/index.js";
import { generateUtilityText } from "../src/main/utility/llm/textGeneration.js";
import {
  createDefaultMemoryEpisodeCalibrationCases,
  runMemoryEpisodeExtractorCalibration,
  type MemoryEpisodeExtractor,
} from "../src/main/services/features/memory/episode/memoryEpisodeExtractorCalibration.js";
import {
  createDefaultNarrativeMemoryIntentCalibrationCases,
  runNarrativeMemoryIntentClassifierCalibration,
  type NarrativeMemoryIntentClassifier,
} from "../src/main/services/features/memory/query/internal/memoryIntentClassifierCalibration.js";

type CliOptions = {
  projectId: string;
  phase: "all" | "phase4" | "phase4-live" | "phase6";
  provider: "auto" | "gemini" | "openai";
  geminiModel?: string;
  openAiModel?: string;
  dbPath?: string;
  limit: number;
};

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    projectId: "memory-production-calibration",
    phase: "all",
    provider: "auto",
    limit: 2,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === "--project-id" && next) {
      options.projectId = next;
      index += 1;
      continue;
    }
    if (arg === "--phase" && next) {
      if (!["all", "phase4", "phase4-live", "phase6"].includes(next)) {
        throw new Error("--phase must be one of: all, phase4, phase4-live, phase6");
      }
      options.phase = next as CliOptions["phase"];
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
    if (arg === "--db-path" && next) {
      options.dbPath = next;
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
  }

  return options;
}

function stripJsonFence(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced?.[1]?.trim() ?? trimmed;
}

function buildCalibrationRuntimePlan(
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
    const alternativeGeminiModel = options.geminiModel
      ? undefined
      : process.env.ALTERNATIVE_GEMINI_MODEL?.trim().replace(/^models\//, "");
    order.push("gemini");
    candidates.push({
      kind: "gemini",
      backend: "remote-http",
      apiKey: geminiKey,
      model: geminiModel,
      alternativeModel: alternativeGeminiModel || undefined,
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
    throw new Error("Configured provider API key is required for production calibration");
  }

  return {
    requestedProvider: "auto",
    fallbackPolicy: "fail-closed",
    order,
    candidates,
    skipped: [],
  };
}

async function generateCalibrationText(input: {
  projectId: string;
  prompt: string;
  maxTokens: number;
  temperature: number;
  runtimeOptions: Pick<CliOptions, "provider" | "geminiModel" | "openAiModel">;
}): Promise<{ text: string; providerName: string }> {
  return await generateUtilityText({
    projectId: input.projectId,
    prompt: input.prompt,
    maxTokens: input.maxTokens,
    temperature: input.temperature,
    runtimePlan: buildCalibrationRuntimePlan(input.runtimeOptions),
  });
}

function buildEpisodePrompt(
  input: Parameters<MemoryEpisodeExtractor>[0],
): string {
  const chunkLines = input.chunks.map((chunk) =>
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
    "응답은 JSON 객체 하나만 출력한다. 코드블록, 설명, markdown은 금지한다.",
    "",
    "JSON schema:",
    `{"episodes":[{"episodeType":"character_learns_secret|relation_changes|major_event|promise_opened|promise_resolved|character_appears|other","title":"string","summary":"string","evidence":[{"chunkId":"string","quote":"입력 chunk에서 정확히 복사한 근거 문장 또는 구절","startOffset":number|null,"endOffset":number|null}]}]}`,
    "",
    "chunks:",
    chunkLines.join("\n\n---\n\n"),
  ].join("\n");
}

function buildIntentPrompt(question: string): string {
  return [
    "너는 Luie narrative memory query intent classifier다.",
    "질문을 하나의 intent와 필요한 memory sources로 분류하라.",
    "응답은 JSON 객체 하나만 출력한다. markdown과 설명은 금지한다.",
    "",
    "Allowed intents:",
    "evidence-trace, entity-profile, entity-state-at-chapter, relationship-at-chapter, event-causality, contradiction-check, unresolved-thread-check, global-summary",
    "",
    "Allowed sources:",
    "memory_chunk_evidence, memory_entity, memory_entity_mention, memory_relation_state, memory_character_state, memory_knowledge_state, memory_fact, memory_fact_evidence, memory_fact_invalidation, memory_episode, memory_state_change_candidate, chapter_summary, world_document",
    "",
    "Required source matrix. Return every source listed for the selected intent:",
    "evidence-trace => memory_chunk_evidence",
    "entity-profile => memory_entity, memory_entity_mention, memory_fact_evidence",
    "entity-state-at-chapter => memory_character_state, memory_knowledge_state, memory_fact_evidence",
    "relationship-at-chapter => memory_relation_state, memory_fact_evidence",
    "event-causality => memory_episode, memory_state_change_candidate",
    "contradiction-check => memory_fact_invalidation, memory_fact",
    "unresolved-thread-check => memory_episode, memory_fact",
    "global-summary => chapter_summary, world_document",
    "",
    "JSON schema:",
    `{"intent":"string","sources":["string"],"reason":"string"}`,
    "",
    `question: ${question}`,
  ].join("\n");
}

type LiveChunkRow = {
  chunkId: string;
  chapterId: string | null;
  sceneId: string | null;
  sourceType: string;
  sourceId: string;
  sourceContentHash: string;
  content: string;
  contentHash: string;
  startOffset: number | null;
  endOffset: number | null;
};

const RUNTIME_DB_ENV_KEY = "LUIE_RUNTIME_DATABASE_URL";

function resolveDefaultRuntimeDbPath(): string {
  const runtimeDatabaseUrl = process.env[RUNTIME_DB_ENV_KEY]?.trim();
  if (runtimeDatabaseUrl) {
    return resolveSqliteDatasourceFromEnv(runtimeDatabaseUrl).dbPath;
  }

  const userDataPath = process.env.LUIE_USER_DATA_PATH?.trim();
  if (userDataPath) {
    return path.resolve(userDataPath, DB_NAME);
  }

  const appSupportDbPath = path.join(
    os.homedir(),
    "Library",
    "Application Support",
    "Luie",
    DB_NAME,
  );
  if (existsSync(appSupportDbPath)) {
    return appSupportDbPath;
  }

  return path.resolve(process.cwd(), "drizzle", "app-dev.db");
}

function resolveDbPath(inputPath?: string): string {
  if (inputPath?.trim()) return path.resolve(inputPath.trim());
  return resolveDefaultRuntimeDbPath();
}

function loadLiveChunkGroups(input: {
  dbPath: string;
  projectId: string;
  limit: number;
}): Array<{
  sourceType: string;
  sourceId: string;
  sourceContentHash: string;
  chunks: LiveChunkRow[];
}> {
  if (!existsSync(input.dbPath)) {
    throw new Error(`LIVE_DB_NOT_FOUND:${input.dbPath}`);
  }

  const database = new DatabaseSync(input.dbPath, { readOnly: true });
  try {
    const rows = database
      .prepare(
        `SELECT
          "id" AS "chunkId",
          "chapterId",
          "sceneId",
          "sourceType",
          "sourceId",
          "sourceContentHash",
          "content",
          "contentHash",
          "startOffset",
          "endOffset"
        FROM "MemoryChunk"
        WHERE "projectId" = ?
          AND LENGTH(TRIM("content")) > 0
        ORDER BY "sourceType", "sourceId", "chunkIndex"
        LIMIT ?`,
      )
      .all(input.projectId, input.limit * 8) as LiveChunkRow[];

    const groups = new Map<string, LiveChunkRow[]>();
    for (const row of rows) {
      const key = `${row.sourceType}:${row.sourceId}:${row.sourceContentHash}`;
      const group = groups.get(key) ?? [];
      group.push(row);
      groups.set(key, group);
    }

    return [...groups.values()].slice(0, input.limit).map((chunks) => ({
      sourceType: chunks[0]?.sourceType ?? "unknown",
      sourceId: chunks[0]?.sourceId ?? "unknown",
      sourceContentHash: chunks[0]?.sourceContentHash ?? "",
      chunks,
    }));
  } finally {
    database.close();
  }
}

async function runLiveProjectEpisodeCalibration(input: {
  options: CliOptions;
  extractor: MemoryEpisodeExtractor;
}): Promise<{
  dbPath: string;
  sourceCount: number;
  candidateCount: number;
  evidenceCount: number;
  unknownEvidenceCount: number;
  failures: Array<{ sourceId: string; reason: string; detail?: string }>;
}> {
  const dbPath = resolveDbPath(input.options.dbPath);
  const groups = loadLiveChunkGroups({
    dbPath,
    projectId: input.options.projectId,
    limit: input.options.limit,
  });
  const failures: Array<{ sourceId: string; reason: string; detail?: string }> = [];
  let candidateCount = 0;
  let evidenceCount = 0;
  let unknownEvidenceCount = 0;

  for (const group of groups) {
    try {
      const knownChunkIds = new Set(group.chunks.map((chunk) => chunk.chunkId));
      const candidates = await input.extractor({
        projectId: input.options.projectId,
        sourceType: group.sourceType,
        sourceId: group.sourceId,
        sourceContentHash: group.sourceContentHash,
        extractorVersion: "episode-v1",
        chunks: group.chunks.map((chunk) => ({
          chunkId: chunk.chunkId,
          chapterId: chunk.chapterId,
          sceneId: chunk.sceneId,
          content: chunk.content,
          contentHash: chunk.contentHash,
          sourceContentHash: chunk.sourceContentHash,
          startOffset: chunk.startOffset,
          endOffset: chunk.endOffset,
        })),
      });
      candidateCount += candidates.length;
      for (const candidate of candidates) {
        evidenceCount += candidate.evidence.length;
        const unknown = candidate.evidence.filter(
          (evidence) => !knownChunkIds.has(evidence.chunkId),
        );
        unknownEvidenceCount += unknown.length;
      }
    } catch (error) {
      failures.push({
        sourceId: group.sourceId,
        reason: "EXTRACTOR_ERROR",
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    dbPath,
    sourceCount: groups.length,
    candidateCount,
    evidenceCount,
    unknownEvidenceCount,
    failures,
  };
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const providerNames = new Set<string>();
  const output: Record<string, unknown> = {
    projectId: options.projectId,
    phase: options.phase,
  };

  const episodeExtractor: MemoryEpisodeExtractor = async (input) => {
      const generated = await generateCalibrationText({
        projectId: input.projectId,
        prompt: buildEpisodePrompt(input),
        maxTokens: 1200,
        temperature: 0.1,
        runtimeOptions: options,
      });
      providerNames.add(generated.providerName);
      const parsed = JSON.parse(stripJsonFence(generated.text)) as {
        episodes?: Awaited<ReturnType<MemoryEpisodeExtractor>>;
      };
      return parsed.episodes ?? [];
    };
  if (options.phase === "all" || options.phase === "phase4") {
    output.phase4 = await runMemoryEpisodeExtractorCalibration({
      extractor: episodeExtractor,
      cases: createDefaultMemoryEpisodeCalibrationCases(options.projectId),
    });
  }

  if (options.phase === "all" || options.phase === "phase4-live") {
    output.phase4Live = await runLiveProjectEpisodeCalibration({
      options,
      extractor: episodeExtractor,
    });
  }

  if (options.phase === "all" || options.phase === "phase6") {
    const classifier: NarrativeMemoryIntentClassifier = async ({ projectId, question }) => {
      const generated = await generateCalibrationText({
        projectId,
        prompt: buildIntentPrompt(question),
        maxTokens: 500,
        temperature: 0,
        runtimeOptions: options,
      });
      providerNames.add(generated.providerName);
      const parsed = JSON.parse(stripJsonFence(generated.text)) as {
        intent: ReturnType<NarrativeMemoryIntentClassifier> extends Promise<infer Plan>
          ? Plan extends { intent: infer Intent }
            ? Intent
            : never
          : never;
        sources: string[];
        reason: string;
      };
      return {
        intent: parsed.intent,
        sources: parsed.sources as Awaited<ReturnType<NarrativeMemoryIntentClassifier>>["sources"],
        reason: parsed.reason,
      };
    };
    output.phase6 = await runNarrativeMemoryIntentClassifierCalibration({
      projectId: options.projectId,
      classifier,
      cases: createDefaultNarrativeMemoryIntentCalibrationCases(),
    });
  }

  output.providerName = [...providerNames].join(",") || null;
  console.log(JSON.stringify(output, null, 2));
}

await main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );
  process.exit(1);
});
