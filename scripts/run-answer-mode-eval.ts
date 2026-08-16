#!/usr/bin/env tsx

import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import type { RuntimeRoutePlan } from "../src/shared/types/llmRuntime.js";
import { generateUtilityText } from "../src/main/utility/llm/textGeneration.js";

type AnswerMode = "EVIDENCE" | "INSUFFICIENT" | "ADVISORY";

type CliOptions = {
  root: string;
  out: string;
  projectId: string;
  limit: number;
  model?: string;
};

type AnswerModeCase = {
  id: string;
  genre: string;
  answerMode: AnswerMode;
  expectedMode: AnswerMode;
  question: string;
  expectedBehavior: string;
  goldEvidence?: Array<{ chapter: number; file: string; quote: string }>;
};

type GeneratedAnswer = {
  mode?: string;
  scope?: string;
  answer?: string;
  evidence?: unknown;
  caution?: string;
};

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    root: "novel",
    out: "tests/.tmp/answer-mode-v1-run.json",
    projectId: "answer-mode-v1",
    limit: 32,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === "--root" && next) {
      options.root = next;
      index += 1;
    } else if (arg === "--out" && next) {
      options.out = next;
      index += 1;
    } else if (arg === "--project-id" && next) {
      options.projectId = next;
      index += 1;
    } else if (arg === "--limit" && next) {
      options.limit = Number.parseInt(next, 10);
      index += 1;
    } else if (arg === "--model" && next) {
      options.model = next;
      index += 1;
    }
  }
  if (!Number.isFinite(options.limit) || options.limit < 1 || options.limit > 200) {
    throw new Error("--limit must be an integer from 1 to 200");
  }
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
        model: (
          options.model?.trim() ||
          process.env.GEMINI_MODEL?.trim() ||
          "gemini-3.5-flash"
        ).replace(/^models\//u, ""),
        alternativeModel:
          process.env.ALTERNATIVE_GEMINI_MODEL?.trim().replace(/^models\//u, "") ||
          undefined,
        embeddingModel: process.env.GEMINI_EMBEDDING_MODEL?.trim() || "text-embedding-004",
      },
    ],
    skipped: [],
  };
}

function readJsonl<T>(file: string): T[] {
  return fs
    .readFileSync(file, "utf8")
    .split(/\r?\n/u)
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as T);
}

function listCases(root: string): AnswerModeCase[] {
  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => {
      const file = path.join(root, entry.name, "eval", "answer_mode_v1.jsonl");
      return fs.existsSync(file) ? readJsonl<AnswerModeCase>(file) : [];
    });
}

function evidenceText(input: { root: string; item: AnswerModeCase }): string {
  const evidence = input.item.goldEvidence ?? [];
  if (evidence.length === 0) return "(no evidence)";
  return evidence
    .map((item, index) => {
      const file = path.join(input.root, input.item.genre, item.file);
      if (!fs.existsSync(file) || !fs.readFileSync(file, "utf8").includes(item.quote)) {
        throw new Error(`${input.item.id}: missing evidence quote ${item.file}`);
      }
      return `[E${index + 1}] ${input.item.genre}/${item.file} chapter=${item.chapter}\n${item.quote}`;
    })
    .join("\n\n");
}

function buildPrompt(input: { question: string; evidence: string }): string {
  return [
    "너는 Luie Memory Engine의 답변 모드 분류기다.",
    "반드시 JSON 한 개만 출력한다. markdown 금지. 사고 과정 출력 금지.",
    '형식: {"mode":"EVIDENCE|INSUFFICIENT|ADVISORY","scope":"string","answer":"string","evidence":["E1"],"caution":"string"}',
    "",
    "규칙:",
    "1. 원고 사실/정사/회차/관계/떡밥 질문이고 근거가 있으면 EVIDENCE.",
    "2. 원고 사실/정사 질문인데 근거가 없으면 INSUFFICIENT. 추측하지 마라.",
    "3. 작법/브레인스토밍/표현 개선 질문이면 ADVISORY. 정사라고 말하지 마라.",
    "4. ADVISORY에서는 evidence를 빈 배열로 둔다.",
    "5. INSUFFICIENT에서는 evidence를 빈 배열로 둔다.",
    "6. answer는 120자 이내로 짧게 쓴다.",
    "",
    `질문: ${input.question}`,
    "",
    "근거:",
    input.evidence,
  ].join("\n");
}

function parseGenerated(text: string): GeneratedAnswer {
  const match = text.match(/\{[\s\S]*\}/u);
  if (!match) return {};
  return JSON.parse(match[0]) as GeneratedAnswer;
}

function inferMode(text: string): string | undefined {
  return (
    text.match(/"mode"\s*:\s*"(EVIDENCE|INSUFFICIENT|ADVISORY)"/u)?.[1] ??
    text.match(/Correct mode\?\s*(EVIDENCE|INSUFFICIENT|ADVISORY)/u)?.[1]
  );
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const root = path.resolve(process.cwd(), options.root);
  const runtimePlan = buildRuntimePlan(options);
  const cases = listCases(root).slice(0, options.limit);
  const rows = [];

  for (const item of cases) {
    const generated = await generateUtilityText({
      projectId: options.projectId,
      runtimePlan,
      prompt: buildPrompt({
        question: item.question,
        evidence: evidenceText({ root, item }),
      }),
      maxTokens: 2048,
      temperature: 0,
    });
    const parsed = parseGenerated(generated.text);
    const actualMode = parsed.mode ?? inferMode(generated.text);
    rows.push({
      id: item.id,
      genre: item.genre,
      expectedMode: item.expectedMode,
      actualMode,
      pass: actualMode === item.expectedMode,
      question: item.question,
      answer: parsed.answer ?? generated.text,
      raw: generated.text,
    });
  }

  const summary = {
    root: options.root,
    model: runtimePlan.candidates[0].model,
    cases: rows.length,
    pass: rows.filter((row) => row.pass).length,
    fail: rows.filter((row) => !row.pass).length,
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
