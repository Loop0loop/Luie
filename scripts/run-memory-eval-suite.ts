#!/usr/bin/env tsx

import { writeFile } from "node:fs/promises";
import { db } from "../src/main/database/main/databaseService.js";
import { buildLayer3Evidence } from "../src/main/services/features/rag/internal/contextAssembler.layer3.js";
import { buildRagGrounding } from "../src/main/services/features/rag/grounding.js";
import { runLiveMemoryEvalSuite } from "../src/main/services/features/memory/eval/memoryEvalRunner.js";

type CliOptions = {
  projectId: string;
  label: string;
  topK: number;
  out?: string;
};

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    projectId: "",
    label: "headless-rag-eval",
    topK: 5,
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
    }
  }
  if (!options.projectId.trim()) {
    throw new Error("--project-id is required");
  }
  return options;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  await db.initialize();
  try {
    const result = await runLiveMemoryEvalSuite({
      projectId: options.projectId,
      label: options.label,
      engineVersion: "headless-rag-context",
      topK: options.topK,
      answerer: async (evalCase) => {
        const layer3 = await buildLayer3Evidence(
          evalCase.projectId,
          evalCase.question,
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
    const json = JSON.stringify(result, null, 2);
    if (options.out) {
      await writeFile(options.out, `${json}\n`, "utf8");
    } else {
      // eslint-disable-next-line no-console -- CLI script output.
      console.log(json);
    }
  } finally {
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
