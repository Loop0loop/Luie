#!/usr/bin/env tsx

import "dotenv/config";
import type { RuntimeRoutePlan } from "../src/shared/types/llmRuntime.js";
import { db } from "../src/main/database/main/databaseService.js";
import { generateUtilityText } from "../src/main/utility/llm/textGeneration.js";
import {
  materializeChapterSummariesForNarrativeMemory,
  type ChapterSummaryMaterializer,
} from "../src/main/services/features/memory/summary/memoryChapterSummaryMaterialization.js";
import { generateProjectNarrativeSummaryHierarchy } from "../src/main/services/features/memory/summary/memoryNarrativeSummaryRunner.js";

type CliOptions = {
  projectId: string;
  provider: "auto" | "gemini" | "openai";
  geminiModel?: string;
  openAiModel?: string;
  limit: number;
};

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
      if (!Number.isFinite(parsed) || parsed < 1 || parsed > 100) {
        throw new Error("--limit must be an integer from 1 to 100");
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
    throw new Error("Configured provider API key is required for narrative summaries");
  }
  return { requestedProvider: "auto", fallbackPolicy: "fail-closed", order, candidates, skipped: [] };
}

function buildChapterSummaryPrompt(input: {
  chapterTitle: string;
  chapterNumber: number;
  content: string;
}): string {
  return [
    "다음 장편 소설 원고를 200자 이내 한국어로 요약하라.",
    "등장인물, 사건, 새로 드러난 정보, 감정 변화를 우선하라.",
    "설명이나 markdown 없이 요약문만 출력하라.",
    `chapterNumber: ${input.chapterNumber}`,
    `chapterTitle: ${input.chapterTitle}`,
    "",
    "text:",
    input.content.slice(0, 4000),
  ].join("\n");
}

function createHeadlessChapterSummarizer(options: CliOptions): ChapterSummaryMaterializer {
  const providerNames = new Set<string>();
  const summarizer: ChapterSummaryMaterializer = async (input) => {
    const generated = await generateUtilityText({
      projectId: input.projectId,
      prompt: buildChapterSummaryPrompt(input),
      maxTokens: 300,
      temperature: 0.2,
      runtimePlan: buildRuntimePlan(options),
    });
    providerNames.add(generated.providerName);
    return {
      summary: generated.text,
      model: generated.providerName,
    };
  };
  Object.defineProperty(summarizer, "providerNames", {
    value: providerNames,
    enumerable: false,
  });
  return summarizer;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const summarizer = createHeadlessChapterSummarizer(options);
  const providerNames = (summarizer as ChapterSummaryMaterializer & {
    providerNames: Set<string>;
  }).providerNames;
  await db.initialize();
  try {
    const chapterSummaryResult = await materializeChapterSummariesForNarrativeMemory({
      projectId: options.projectId,
      summarizer,
      limit: options.limit,
    });
    const projectSummaryResult = await generateProjectNarrativeSummaryHierarchy({
      projectId: options.projectId,
    });
    console.log(JSON.stringify({
      projectId: options.projectId,
      chapterSummary: chapterSummaryResult,
      projectNarrativeSummary: projectSummaryResult,
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
