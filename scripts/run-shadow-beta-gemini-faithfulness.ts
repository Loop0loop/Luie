#!/usr/bin/env tsx

import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import type { RuntimeRoutePlan } from "../src/shared/types/llmRuntime.js";
import { generateUtilityText } from "../src/main/utility/llm/textGeneration.js";

type CliOptions = {
  input: string;
  out: string;
  projectId: string;
  limit: number;
  model?: string;
};

type EvalResult = {
  caseId: string;
  question: string;
  answer: string;
  retrievedEvidence: Array<{ chunkId: string }>;
};

type EvalRun = {
  results: EvalResult[];
};

type FaithfulnessRow = {
  caseId: string;
  question: string;
  generatedAnswer: string;
  verdict: "pass" | "fail" | "warn";
  unsupportedClaims: string[];
  overCertainty: boolean;
  futureLeakage: boolean;
  notes: string;
};

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    input: "",
    out: "",
    projectId: "shadow-beta-gemini-faithfulness",
    limit: 10,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === "--input" && next) {
      options.input = next;
      index += 1;
      continue;
    }
    if (arg === "--out" && next) {
      options.out = next;
      index += 1;
      continue;
    }
    if (arg === "--project-id" && next) {
      options.projectId = next;
      index += 1;
      continue;
    }
    if (arg === "--limit" && next) {
      const parsed = Number.parseInt(next, 10);
      if (!Number.isFinite(parsed) || parsed < 1 || parsed > 200) {
        throw new Error("--limit must be an integer from 1 to 200");
      }
      options.limit = parsed;
      index += 1;
      continue;
    }
    if (arg === "--model" && next) {
      options.model = next;
      index += 1;
    }
  }
  if (!options.input) throw new Error("--input is required");
  if (!options.out) throw new Error("--out is required");
  return options;
}

function buildRuntimePlan(options: CliOptions): RuntimeRoutePlan {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error("GEMINI_API_KEY is required");
  return {
    requestedProvider: "gemini",
    fallbackPolicy: "fail-closed",
    order: ["gemini"],
    candidates: [
      {
        kind: "gemini",
        backend: "remote-http",
        apiKey,
        model: (options.model?.trim() || process.env.GEMINI_MODEL?.trim() || "gemini-2.0-flash").replace(/^models\//, ""),
        alternativeModel: process.env.ALTERNATIVE_GEMINI_MODEL?.trim().replace(/^models\//, "") || undefined,
        embeddingModel: process.env.GEMINI_EMBEDDING_MODEL?.trim() || "text-embedding-004",
      },
    ],
    skipped: [],
  };
}

function compactEvidence(answer: string): string {
  return answer
    .split(/\n(?=\[E\d+\])/u)
    .map((section) => section.slice(0, 2400))
    .join("\n\n")
    .slice(0, 9000);
}

function buildAnswerPrompt(input: { question: string; evidence: string }): string {
  return [
    "너는 웹소설 작가의 설정 담당 편집자다.",
    "작가가 지금 당장 이어 써도 되는지 판단할 수 있게 한국어로 3문장 이내로 답하라.",
    "규칙:",
    "1. 아래 근거 밖의 사실을 만들지 마라.",
    "2. 확정되지 않은 정보는 확정되지 않았다고 말하라.",
    "3. 폐기/초안 설정을 정사처럼 말하지 마라.",
    "4. 질문의 회차 이후 정보가 섞이면 안 된다고 경고하라.",
    "5. 애매하면 단정하지 말고, 현재 안전한 집필 방향만 말하라.",
    "",
    `질문: ${input.question}`,
    "",
    "근거:",
    input.evidence,
  ].join("\n");
}

function buildJudgePrompt(input: {
  question: string;
  evidence: string;
  answer: string;
}): string {
  return [
    "다음 답변이 근거에 충실한지 평가하라.",
    "JSON만 출력하라. markdown 금지.",
    '형식: {"verdict":"pass|fail|warn","unsupportedClaims":[],"overCertainty":false,"futureLeakage":false,"notes":"짧은 이유"}',
    "fail은 근거 없는 확정, 폐기 설정 혼입, 미래정보 누수일 때 사용한다.",
    "warn은 답은 대체로 맞지만 표현이 과하거나 근거가 약할 때 사용한다.",
    "",
    `질문: ${input.question}`,
    "",
    "근거:",
    input.evidence,
    "",
    "답변:",
    input.answer,
  ].join("\n");
}

function parseJudgeJson(text: string): Omit<FaithfulnessRow, "caseId" | "question" | "generatedAnswer"> {
  const match = text.match(/\{[\s\S]*\}/u);
  if (!match) {
    return {
      verdict: "warn",
      unsupportedClaims: [],
      overCertainty: false,
      futureLeakage: false,
      notes: `judge returned non-json: ${text.slice(0, 120)}`,
    };
  }
  const parsed = JSON.parse(match[0]) as Partial<Omit<FaithfulnessRow, "caseId" | "question" | "generatedAnswer">>;
  return {
    verdict: parsed.verdict === "pass" || parsed.verdict === "fail" || parsed.verdict === "warn" ? parsed.verdict : "warn",
    unsupportedClaims: Array.isArray(parsed.unsupportedClaims) ? parsed.unsupportedClaims.map(String) : [],
    overCertainty: Boolean(parsed.overCertainty),
    futureLeakage: Boolean(parsed.futureLeakage),
    notes: typeof parsed.notes === "string" ? parsed.notes : "",
  };
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const run = JSON.parse(fs.readFileSync(options.input, "utf8")) as EvalRun;
  const runtimePlan = buildRuntimePlan(options);
  const rows: FaithfulnessRow[] = [];

  for (const result of run.results.slice(0, options.limit)) {
    const evidence = compactEvidence(result.answer);
    const generated = await generateUtilityText({
      projectId: options.projectId,
      runtimePlan,
      prompt: buildAnswerPrompt({ question: result.question, evidence }),
      maxTokens: 320,
      temperature: 0.1,
    });
    const judged = await generateUtilityText({
      projectId: options.projectId,
      runtimePlan,
      prompt: buildJudgePrompt({
        question: result.question,
        evidence,
        answer: generated.text,
      }),
      maxTokens: 220,
      temperature: 0,
    });
    rows.push({
      caseId: result.caseId,
      question: result.question,
      generatedAnswer: generated.text,
      ...parseJudgeJson(judged.text),
    });
  }

  const summary = {
    input: options.input,
    model: runtimePlan.candidates[0].model,
    cases: rows.length,
    pass: rows.filter((row) => row.verdict === "pass").length,
    warn: rows.filter((row) => row.verdict === "warn").length,
    fail: rows.filter((row) => row.verdict === "fail").length,
    rows,
  };
  fs.mkdirSync(path.dirname(options.out), { recursive: true });
  fs.writeFileSync(options.out, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(summary, null, 2));
}

await main().catch((error) => {
  console.error(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }, null, 2));
  process.exit(1);
});
