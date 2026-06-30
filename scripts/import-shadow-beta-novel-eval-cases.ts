#!/usr/bin/env tsx

import fs from "node:fs";
import path from "node:path";
import { and, eq, inArray, like } from "drizzle-orm";
import { db } from "../src/main/database/main/databaseService.js";
import {
  memoryEvalCase,
  memoryEvalEvidence,
  memoryEvalFeedback,
  project,
} from "../src/main/database/schema/index.js";

type CliOptions = {
  projectId: string;
  root: string;
  genre: string | null;
  replace: boolean;
  dryRun: boolean;
};

type WriterQuestion = {
  id: string;
  genre: string;
  taskType: string;
  questionClean: string;
  questionWriterLike: string;
  questionMessy: string;
  allowedUntilChapter: number;
};

type GoldAnswer = {
  id: string;
  expectedAnswer: string;
};

type GoldEvidence = {
  id: string;
  goldEvidence: Array<{
    chapter: number;
    file: string;
    quote: string;
  }>;
  mustNotUseAfterChapter: number;
};

type FeedbackSeed = {
  id: string;
  kind: string;
  questionId: string;
  question: string;
  answer: string;
  evidence: Array<{
    chapter: number;
    file: string;
    quote: string;
  }>;
  note?: string;
  status?: string;
};

type ImportRows = {
  cases: Array<typeof memoryEvalCase.$inferInsert>;
  evidence: Array<typeof memoryEvalEvidence.$inferInsert>;
  feedback: Array<typeof memoryEvalFeedback.$inferInsert>;
};

const TASK_TYPES = new Set([
  "setting_check",
  "relationship_check",
  "foreshadowing_status",
  "chapter_knowledge_state",
  "draft_canon_conflict",
]);

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    projectId: "",
    root: "novel",
    genre: null,
    replace: false,
    dryRun: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === "--project-id" && next) {
      options.projectId = next;
      index += 1;
      continue;
    }
    if (arg === "--root" && next) {
      options.root = next;
      index += 1;
      continue;
    }
    if (arg === "--genre" && next) {
      options.genre = next;
      index += 1;
      continue;
    }
    if (arg === "--replace") {
      options.replace = true;
      continue;
    }
    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }
  }
  if (!options.projectId.trim()) {
    throw new Error("--project-id is required");
  }
  return options;
}

function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, "utf8")) as T;
}

function readJsonl<T>(file: string): T[] {
  return fs
    .readFileSync(file, "utf8")
    .split(/\r?\n/u)
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as T);
}

function buildCaseType(taskType: string): "qa" | "relation" | "temporal_state" {
  if (taskType === "relationship_check") return "relation";
  if (taskType === "chapter_knowledge_state") return "temporal_state";
  return "qa";
}

function buildSupportedExpectedAnswer(input: {
  answer: GoldAnswer;
  evidence: GoldEvidence;
}): string {
  const quote = input.evidence.goldEvidence[0]?.quote.trim();
  if (!quote) return input.answer.expectedAnswer;
  return quote;
}

function chunkId(input: {
  projectId: string;
  genre: string;
  evidence: { chapter: number; file: string };
}): string {
  return `${input.projectId}:shadow-beta:${input.genre}:chapter-${input.evidence.chapter}:${input.evidence.file}`;
}

function loadGenreRows(input: {
  root: string;
  genre: string;
  projectId: string;
  nowIso: string;
}): ImportRows {
  const genreRoot = path.join(input.root, input.genre);
  const evalRoot = path.join(genreRoot, "eval");
  const manifest = readJson<{
    datasetKind?: string;
    realBetaConfirmed?: boolean;
    canFinalizeThresholds?: boolean;
  }>(path.join(evalRoot, "benchmark_manifest.json"));
  if (
    manifest.datasetKind !== "shadow_beta" ||
    manifest.realBetaConfirmed !== false ||
    manifest.canFinalizeThresholds !== false
  ) {
    throw new Error(`${input.genre}: invalid shadow beta manifest guard`);
  }

  const questions = readJsonl<WriterQuestion>(path.join(evalRoot, "writer_questions.jsonl"));
  const answers = new Map(
    readJsonl<GoldAnswer>(path.join(evalRoot, "gold_answers.jsonl")).map((row) => [
      row.id,
      row,
    ]),
  );
  const evidence = new Map(
    readJsonl<GoldEvidence>(path.join(evalRoot, "gold_evidence.jsonl")).map((row) => [
      row.id,
      row,
    ]),
  );
  const feedback = readJsonl<FeedbackSeed>(path.join(evalRoot, "feedback_seed.jsonl"));
  const rows: ImportRows = { cases: [], evidence: [], feedback: [] };

  for (const question of questions) {
    if (!TASK_TYPES.has(question.taskType)) {
      throw new Error(`${input.genre}: unknown taskType ${question.taskType}`);
    }
    const answer = answers.get(question.id);
    const goldEvidence = evidence.get(question.id);
    if (!answer || !goldEvidence) {
      throw new Error(`${input.genre}: missing answer/evidence for ${question.id}`);
    }
    const caseId = `shadow-beta:${input.genre}:${question.id}`;
    rows.cases.push({
      id: caseId,
      projectId: input.projectId,
      name: `shadow-beta:${input.genre}:${question.taskType}:${question.id}`,
      question: question.questionWriterLike || question.questionMessy || question.questionClean,
      caseType: buildCaseType(question.taskType),
      expectedAnswer: buildSupportedExpectedAnswer({ answer, evidence: goldEvidence }),
      temporalScopeStartChapterId: null,
      temporalScopeEndChapterId: null,
      queryChapterOrder: question.allowedUntilChapter ?? null,
      severity: "p0",
      updatedAt: input.nowIso,
    });
    rows.evidence.push(
      ...goldEvidence.goldEvidence.map((item, index) => ({
        id: `${caseId}:evidence:${index + 1}`,
        caseId,
        projectId: input.projectId,
        chapterId: null,
        expectedChunkId: chunkId({
          projectId: input.projectId,
          genre: input.genre,
          evidence: item,
        }),
        startOffset: null,
        endOffset: null,
        quote: item.quote,
        updatedAt: input.nowIso,
      })),
    );
  }

  for (const seed of feedback) {
    const caseId = `shadow-beta:${input.genre}:${seed.questionId}`;
    rows.feedback.push({
      id: `shadow-beta:${input.genre}:${seed.id}`,
      projectId: input.projectId,
      runId: null,
      caseId,
      resultId: null,
      feedbackKind: seed.kind,
      question: seed.question,
      answer: seed.answer,
      evidenceJson: JSON.stringify(
        seed.evidence.map((item) => ({
          ...item,
          chunkId: chunkId({
            projectId: input.projectId,
            genre: input.genre,
            evidence: item,
          }),
        })),
      ),
      note: seed.note ?? null,
      status: seed.status ?? "seed",
      updatedAt: input.nowIso,
    });
  }

  return rows;
}

function listGenres(root: string, genre?: string | null): string[] {
  const genres = fs
    .readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => fs.existsSync(path.join(root, name, "eval", "benchmark_manifest.json")))
    .sort();
  if (!genre) return genres;
  if (!genres.includes(genre)) throw new Error(`Unknown genre: ${genre}`);
  return [genre];
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const root = path.resolve(process.cwd(), options.root);
  const nowIso = new Date().toISOString();
  const genres = listGenres(root, options.genre);
  const rows = genres.map((genre) =>
    loadGenreRows({ root, genre, projectId: options.projectId, nowIso }),
  );
  const combined: ImportRows = {
    cases: rows.flatMap((row) => row.cases),
    evidence: rows.flatMap((row) => row.evidence),
    feedback: rows.flatMap((row) => row.feedback),
  };

  if (options.dryRun) {
    console.log(
      JSON.stringify(
        {
          projectId: options.projectId,
          root: options.root,
          genre: options.genre,
          genres,
          dryRun: true,
          cases: combined.cases.length,
          evidence: combined.evidence.length,
          feedback: combined.feedback.length,
        },
        null,
        2,
      ),
    );
    return;
  }

  await db.initialize();
  try {
    const projectRows = await db
      .getClient()
      .select({ id: project.id })
      .from(project)
      .where(eq(project.id, options.projectId));
    if (projectRows.length === 0) {
      throw new Error(`Project not found: ${options.projectId}`);
    }

    db.getClient().transaction((tx) => {
      if (options.replace) {
        const caseIds = combined.cases.map((row) => row.id);
        const feedbackIds = combined.feedback.map((row) => row.id);
        const existingShadowCases = tx
          .select({ id: memoryEvalCase.id })
          .from(memoryEvalCase)
          .where(
            and(
              eq(memoryEvalCase.projectId, options.projectId),
              like(memoryEvalCase.name, "shadow-beta:%"),
            ),
          )
          .all()
          .map((row) => row.id);
        const existingShadowFeedback = tx
          .select({ id: memoryEvalFeedback.id })
          .from(memoryEvalFeedback)
          .where(
            and(
              eq(memoryEvalFeedback.projectId, options.projectId),
              like(memoryEvalFeedback.id, "shadow-beta:%"),
            ),
          )
          .all()
          .map((row) => row.id);
        const replaceCaseIds = Array.from(new Set([...caseIds, ...existingShadowCases]));
        const replaceFeedbackIds = Array.from(
          new Set([...feedbackIds, ...existingShadowFeedback]),
        );
        tx.delete(memoryEvalFeedback)
          .where(inArray(memoryEvalFeedback.id, replaceFeedbackIds))
          .run();
        tx.delete(memoryEvalEvidence)
          .where(inArray(memoryEvalEvidence.caseId, replaceCaseIds))
          .run();
        tx.delete(memoryEvalCase).where(inArray(memoryEvalCase.id, replaceCaseIds)).run();
      }
      tx.insert(memoryEvalCase).values(combined.cases).run();
      tx.insert(memoryEvalEvidence).values(combined.evidence).run();
      if (combined.feedback.length > 0) {
        tx.insert(memoryEvalFeedback).values(combined.feedback).run();
      }
    });

    console.log(
      JSON.stringify(
        {
          projectId: options.projectId,
          root: options.root,
          genre: options.genre,
          genres,
          replaced: options.replace,
          cases: combined.cases.length,
          evidence: combined.evidence.length,
          feedback: combined.feedback.length,
        },
        null,
        2,
      ),
    );
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
