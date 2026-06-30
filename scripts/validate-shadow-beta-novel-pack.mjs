#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const rootArg = readArg("--root") ?? "novel";
const json = hasArg("--json");
const root = path.resolve(process.cwd(), rootArg);

const requiredTaskTypes = new Set([
  "setting_check",
  "relationship_check",
  "foreshadowing_status",
  "chapter_knowledge_state",
  "draft_canon_conflict",
]);

function hasArg(name) {
  return process.argv.includes(name);
}

function readArg(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function readJsonl(file) {
  return fs
    .readFileSync(file, "utf8")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        throw new Error(`${file}:${index + 1} JSON parse failed: ${error.message}`);
      }
    });
}

function fail(errors, message) {
  errors.push(message);
}

function quoteExists(genreRoot, evidence) {
  const target = path.join(genreRoot, evidence.file);
  if (!fs.existsSync(target)) return false;
  return fs.readFileSync(target, "utf8").includes(evidence.quote);
}

function validateGenre(genre) {
  const genreRoot = path.join(root, genre);
  const evalRoot = path.join(genreRoot, "eval");
  const errors = [];
  const warnings = [];

  const manifest = readJson(path.join(evalRoot, "benchmark_manifest.json"));
  if (manifest.datasetKind !== "shadow_beta") fail(errors, `${genre}: datasetKind must be shadow_beta`);
  if (manifest.realBetaConfirmed !== false) fail(errors, `${genre}: realBetaConfirmed must be false`);
  if (manifest.canFinalizeThresholds !== false) fail(errors, `${genre}: canFinalizeThresholds must be false`);

  const questions = readJsonl(path.join(evalRoot, "writer_questions.jsonl"));
  const answers = readJsonl(path.join(evalRoot, "gold_answers.jsonl"));
  const evidences = readJsonl(path.join(evalRoot, "gold_evidence.jsonl"));
  const feedback = readJsonl(path.join(evalRoot, "feedback_seed.jsonl"));
  const rawQuestions = readJsonl(path.join(evalRoot, "author_questions_raw.jsonl"));

  if (questions.length !== 50) fail(errors, `${genre}: writer_questions must have 50 rows`);
  if (answers.length !== 50) fail(errors, `${genre}: gold_answers must have 50 rows`);
  if (evidences.length !== 50) fail(errors, `${genre}: gold_evidence must have 50 rows`);
  if (feedback.length !== 10) fail(errors, `${genre}: feedback_seed must have 10 rows`);
  if (rawQuestions.length < 30) fail(errors, `${genre}: author_questions_raw must have at least 30 rows`);

  const questionIds = new Set(questions.map((row) => row.id));
  const answerIds = new Set(answers.map((row) => row.id));
  const evidenceIds = new Set(evidences.map((row) => row.id));
  const writerLike = new Set(questions.map((row) => row.questionWriterLike));
  const expectedAnswers = new Set(answers.map((row) => row.expectedAnswer));
  const taskTypes = new Set(questions.map((row) => row.taskType));

  if (questionIds.size !== questions.length) fail(errors, `${genre}: duplicate writer question ids`);
  if (answerIds.size !== answers.length) fail(errors, `${genre}: duplicate gold answer ids`);
  if (evidenceIds.size !== evidences.length) fail(errors, `${genre}: duplicate gold evidence ids`);
  if (writerLike.size !== questions.length) fail(errors, `${genre}: duplicate writer-like questions`);
  if (expectedAnswers.size !== answers.length) fail(errors, `${genre}: duplicate expected answers`);

  for (const taskType of requiredTaskTypes) {
    if (!taskTypes.has(taskType)) fail(errors, `${genre}: missing taskType ${taskType}`);
  }
  for (const taskType of taskTypes) {
    if (!requiredTaskTypes.has(taskType)) fail(errors, `${genre}: unknown taskType ${taskType}`);
  }
  for (const taskType of requiredTaskTypes) {
    const count = questions.filter((row) => row.taskType === taskType).length;
    if (count !== 10) fail(errors, `${genre}: taskType ${taskType} must have 10 rows, got ${count}`);
  }

  for (const id of questionIds) {
    if (!answerIds.has(id)) fail(errors, `${genre}: missing gold answer for ${id}`);
    if (!evidenceIds.has(id)) fail(errors, `${genre}: missing gold evidence for ${id}`);
  }

  const questionsById = new Map(questions.map((row) => [row.id, row]));
  const evidenceById = new Map(evidences.map((row) => [row.id, row]));

  for (const row of questions) {
    if (row.genre !== genre) fail(errors, `${genre}: ${row.id} has genre ${row.genre}`);
    if (!Number.isInteger(row.allowedUntilChapter) || row.allowedUntilChapter < 1 || row.allowedUntilChapter > 5) {
      fail(errors, `${genre}: ${row.id} has invalid allowedUntilChapter`);
    }
  }

  for (const row of evidences) {
    const question = questionsById.get(row.id);
    if (!question) continue;
    if (!Array.isArray(row.goldEvidence) || row.goldEvidence.length === 0) {
      fail(errors, `${genre}: ${row.id} has no goldEvidence`);
      continue;
    }
    for (const item of row.goldEvidence) {
      if (item.chapter > row.mustNotUseAfterChapter) {
        fail(errors, `${genre}: ${row.id} evidence chapter exceeds mustNotUseAfterChapter`);
      }
      if (item.chapter > question.allowedUntilChapter) {
        fail(errors, `${genre}: ${row.id} evidence chapter exceeds allowedUntilChapter`);
      }
      if (!quoteExists(genreRoot, item)) {
        fail(errors, `${genre}: ${row.id} quote not found in ${item.file}`);
      }
    }
  }

  const feedbackKinds = new Map();
  for (const row of feedback) {
    if (!questionIds.has(row.questionId)) {
      fail(errors, `${genre}: feedback ${row.id} references unknown questionId ${row.questionId}`);
    }
    feedbackKinds.set(row.kind, (feedbackKinds.get(row.kind) ?? 0) + 1);
    if (!Array.isArray(row.evidence) || row.evidence.length === 0) {
      fail(errors, `${genre}: feedback ${row.id} has no evidence`);
      continue;
    }
    for (const item of row.evidence) {
      if (!quoteExists(genreRoot, item)) {
        fail(errors, `${genre}: feedback ${row.id} quote not found in ${item.file}`);
      }
    }
    if (row.kind === "evidence_helpful") {
      const goldQuotes = new Set((evidenceById.get(row.questionId)?.goldEvidence ?? []).map((item) => item.quote));
      for (const item of row.evidence) {
        if (!goldQuotes.has(item.quote)) {
          fail(errors, `${genre}: helpful feedback ${row.id} does not cite gold evidence for ${row.questionId}`);
        }
      }
    }
  }
  if ((feedbackKinds.get("answer_wrong") ?? 0) < 6) fail(errors, `${genre}: needs at least 6 answer_wrong feedback rows`);
  if ((feedbackKinds.get("evidence_helpful") ?? 0) < 4) fail(errors, `${genre}: needs at least 4 evidence_helpful feedback rows`);

  const expectedEvidenceIds = rawQuestions.flatMap((row) => row.expectedEvidenceIds ?? []);
  const unresolvedRawLinks = expectedEvidenceIds.filter((id) => !questionIds.has(id));
  if (unresolvedRawLinks.length > 0) {
    warnings.push(`${genre}: ${unresolvedRawLinks.length} raw expectedEvidenceIds do not map to writer_questions ids`);
  }

  const uniqueEvidenceQuotes = new Set(
    evidences.flatMap((row) => row.goldEvidence.map((item) => `${item.file}:${item.quote}`)),
  );

  return {
    genre,
    status: errors.length === 0 ? "ok" : "fail",
    counts: {
      questions: questions.length,
      answers: answers.length,
      evidences: evidences.length,
      feedback: feedback.length,
      rawQuestions: rawQuestions.length,
      uniqueWriterLike: writerLike.size,
      uniqueExpectedAnswers: expectedAnswers.size,
      uniqueGoldEvidenceQuotes: uniqueEvidenceQuotes.size,
    },
    taskTypes: [...taskTypes].sort(),
    errors,
    warnings,
  };
}

if (!fs.existsSync(root)) {
  console.error(`Shadow beta root does not exist: ${root}`);
  process.exit(1);
}

const genres = fs
  .readdirSync(root, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .filter((name) => fs.existsSync(path.join(root, name, "eval", "benchmark_manifest.json")))
  .sort();

const results = genres.map(validateGenre);
const ok = results.every((result) => result.status === "ok");

if (json) {
  console.log(JSON.stringify({ status: ok ? "ok" : "fail", root: rootArg, results }, null, 2));
} else {
  console.log(`Shadow beta novel pack validation: ${ok ? "OK" : "FAIL"}`);
  for (const result of results) {
    console.log(
      `- ${result.genre}: ${result.status} | q=${result.counts.questions}, feedback=${result.counts.feedback}, uniqueEvidence=${result.counts.uniqueGoldEvidenceQuotes}`,
    );
    for (const error of result.errors) console.log(`  error: ${error}`);
    for (const warning of result.warnings) console.log(`  warning: ${warning}`);
  }
}

process.exit(ok ? 0 : 1);
