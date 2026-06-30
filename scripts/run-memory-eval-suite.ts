#!/usr/bin/env tsx

import { writeFile } from "node:fs/promises";
import { db } from "../src/main/database/main/databaseService.js";
import { buildLayer3Evidence } from "../src/main/services/features/rag/internal/contextAssembler.layer3.js";
import { buildRagGrounding } from "../src/main/services/features/rag/grounding.js";
import {
  runLiveMemoryEvalSuite,
  summarizeMemoryEvalOptimizationFailures,
} from "../src/main/services/features/memory/eval/index.js";
import {
  MEMORY_WRITER_TASK_REAL_BETA_LABEL_PREFIX,
  buildMemoryWriterTaskBenchmarkRealBetaRunLabel,
} from "../src/main/services/features/memory/benchmark/index.js";
import {
  resolveSearchOptimizationPolicy,
  type SearchOptimizationMode,
} from "../src/main/services/features/search/searchOptimizationPolicy.js";

type CliOptions = {
  projectId: string;
  label: string;
  topK: number;
  optimizationMode?: SearchOptimizationMode;
  out?: string;
  realBetaRunId?: string;
  shadowBetaGenreScope: boolean;
  assertOptimizedRecall: boolean;
  minRecall: number;
  maxP0Failures: number;
};

function isSearchOptimizationMode(value: string): value is SearchOptimizationMode {
  return (
    value === "low-end" ||
    value === "standard" ||
    value === "high-end" ||
    value === "quality"
  );
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    projectId: "",
    label: "headless-rag-eval",
    topK: 5,
    shadowBetaGenreScope: false,
    assertOptimizedRecall: false,
    minRecall: 0.98,
    maxP0Failures: 0,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === "--project-id" && next) {
      options.projectId = next;
      index += 1;
      continue;
    }
    if (arg === "--label" && next) {
      options.label = next;
      index += 1;
      continue;
    }
    if (arg === "--real-beta-run-id" && next) {
      options.realBetaRunId = next;
      index += 1;
      continue;
    }
    if (arg === "--top-k" && next) {
      const parsed = Number.parseInt(next, 10);
      if (!Number.isFinite(parsed) || parsed < 1 || parsed > 20) {
        throw new Error("--top-k must be an integer from 1 to 20");
      }
      options.topK = parsed;
      index += 1;
      continue;
    }
    if (arg === "--out" && next) {
      options.out = next;
      index += 1;
      continue;
    }
    if (arg === "--shadow-beta-genre-scope") {
      options.shadowBetaGenreScope = true;
      continue;
    }
    if (arg === "--optimization-mode" && next) {
      if (!isSearchOptimizationMode(next)) {
        throw new Error(`Unknown search optimization mode: ${next}`);
      }
      options.optimizationMode = next;
      index += 1;
      continue;
    }
    if (arg === "--assert-optimized-recall") {
      options.assertOptimizedRecall = true;
      continue;
    }
    if (arg === "--min-recall" && next) {
      const parsed = Number.parseFloat(next);
      if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) {
        throw new Error("--min-recall must be a number from 0 to 1");
      }
      options.minRecall = parsed;
      index += 1;
      continue;
    }
    if (arg === "--max-p0-failures" && next) {
      const parsed = Number.parseInt(next, 10);
      if (!Number.isFinite(parsed) || parsed < 0) {
        throw new Error("--max-p0-failures must be a non-negative integer");
      }
      options.maxP0Failures = parsed;
      index += 1;
    }
  }
  if (!options.projectId.trim()) {
    throw new Error("--project-id is required");
  }
  return options;
}

function extractShadowBetaGenre(caseKey: string | undefined): string | null {
  return caseKey?.match(/^shadow-beta:([^:]+):/u)?.[1] ?? null;
}

function buildShadowBetaChunkIdPrefix(input: {
  projectId: string;
  caseKey: string;
}): string | undefined {
  const genre = extractShadowBetaGenre(input.caseKey);
  return genre ? `${input.projectId}:shadow-beta:${genre}:` : undefined;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const runLabel = options.realBetaRunId
    ? buildMemoryWriterTaskBenchmarkRealBetaRunLabel(options.realBetaRunId)
    : options.label;
  const optimizationPolicy = resolveSearchOptimizationPolicy({
    mode: options.optimizationMode,
    requestedLimit: options.topK,
  });
  const previousOptimizationMode = process.env.LUIE_SEARCH_OPTIMIZATION_MODE;
  process.env.LUIE_SEARCH_OPTIMIZATION_MODE = optimizationPolicy.mode;
  await db.initialize();
  try {
    const result = await runLiveMemoryEvalSuite({
      projectId: options.projectId,
      label: runLabel,
      engineVersion: "headless-rag-context",
      topK: options.topK,
      answerer: async (evalCase) => {
        const layer3 = await buildLayer3Evidence(
          evalCase.projectId,
          evalCase.question,
          undefined,
          options.shadowBetaGenreScope
            ? {
                chunkIdPrefix: buildShadowBetaChunkIdPrefix({
                  projectId: evalCase.projectId,
                  caseKey: evalCase.caseId,
                }),
              }
            : undefined,
        );
        const grounding = buildRagGrounding({
          evidence: layer3.evidence,
        });
        return {
          answer: layer3.section,
          groundingStatus: grounding.status,
          evidence: layer3.evidence,
        };
      },
    });
    const output = {
      ...result,
      label: runLabel,
      realBetaLabelPrefix: options.realBetaRunId
        ? MEMORY_WRITER_TASK_REAL_BETA_LABEL_PREFIX
        : null,
      optimizationPolicy,
    };
    const json = JSON.stringify(output, null, 2);
    if (options.out) {
      await writeFile(options.out, `${json}\n`, "utf8");
    } else {
      // eslint-disable-next-line no-console -- CLI script output.
      console.log(json);
    }
    if (options.assertOptimizedRecall) {
      const failures = summarizeMemoryEvalOptimizationFailures({
        label: runLabel,
        averageContextRecallAtK: result.averageContextRecallAtK,
        totalP0FailureCount: result.totalP0FailureCount,
        minAverageContextRecallAtK: options.minRecall,
        maxTotalP0FailureCount: options.maxP0Failures,
      });
      if (failures.length > 0) {
        throw new Error(
          `Memory eval optimization guard failed:\n${failures.join("\n")}`,
        );
      }
      // eslint-disable-next-line no-console -- CLI script assertion output.
      console.log("Memory eval optimization guard passed");
    }
  } finally {
    if (previousOptimizationMode === undefined) {
      delete process.env.LUIE_SEARCH_OPTIMIZATION_MODE;
    } else {
      process.env.LUIE_SEARCH_OPTIMIZATION_MODE = previousOptimizationMode;
    }
    await db.disconnect();
  }
}

await main().catch((error) => {
  // eslint-disable-next-line no-console -- CLI script error output.
  console.error(
    JSON.stringify(
      { error: error instanceof Error ? error.message : String(error) },
      null,
      2,
    ),
  );
  process.exit(1);
});
