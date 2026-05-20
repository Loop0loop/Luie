import { and, asc, eq, isNull, or, sql } from "drizzle-orm";
import type { AnyColumn, SQLWrapper } from "drizzle-orm";
import { db } from "../../../database/index.js";
import {
  chapter,
  chapterSummary,
  character,
  event,
  faction,
  memoryChunk,
  plot,
  synopsis,
  term,
} from "../../../database/schema.js";
import { searchService } from "../searchService.js";
import type { RagQaEvidence } from "../../../../shared/types/index.js";
import { escapeLike } from "../../../utils/queryHelpers.js";
import { createLogger } from "../../../../shared/logger/index.js";
import { loadRagPromptConfig } from "./ragPromptConfig.js";

export type RagContextPacket = {
  systemPrompt: string;
  userPrompt: string;
  evidence: RagQaEvidence[];
};
const logger = createLogger("RagContextAssembler");

// Char limits tuned for 8192-token context (Korean: ~1 char ≈ 1 token).
// Layer1 is computed dynamically from contextBudget in assembleRagContext.
const LAYER0_CHAR_LIMIT = 2_000;
const LAYER2_CHAR_LIMIT = 1_500;

function trimByChars(input: string, limit: number): string {
  if (input.length <= limit) return input;
  return `${input.slice(0, Math.max(0, limit - 16))}\n...[truncated]`;
}

function formatLayer(name: string, body: string): string {
  return `## ${name}\n${body.trim()}\n`;
}

function isMissingTableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return /no such table/i.test(error.message);
}

function throwIfAborted(signal?: AbortSignal): void {
  signal?.throwIfAborted();
}

function likeWithEscape(columnSql: AnyColumn | SQLWrapper, pattern: string) {
  return sql`${columnSql} LIKE ${pattern} ESCAPE '\\'`;
}

async function buildLayer0ProjectSummary(projectId: string): Promise<string> {
  let synopses: Array<{ title: string; body: string }> = [];
  let plots: Array<{ title: string; body: string }> = [];

  try {
    [synopses, plots] = await Promise.all([
      db
        .getClient()
        .select({ title: synopsis.title, body: synopsis.body })
        .from(synopsis)
        .where(and(eq(synopsis.projectId, projectId), isNull(synopsis.deletedAt)))
        .orderBy(asc(synopsis.updatedAt))
        .limit(40),
      db
        .getClient()
        .select({ title: plot.title, body: plot.body })
        .from(plot)
        .where(and(eq(plot.projectId, projectId), isNull(plot.deletedAt)))
        .orderBy(asc(plot.updatedAt))
        .limit(40),
    ]);
  } catch (error) {
    if (!isMissingTableError(error)) {
      throw error;
    }
    logger.warn("Layer0 skipped due to missing table", { projectId, error });
  }

  const content = [
    "[PROJECT SYNOPSIS]",
    ...synopses.map((row) => `- ${row.title}\n${row.body}`),
    "[PROJECT PLOTS]",
    ...plots.map((row) => `- ${row.title}\n${row.body}`),
  ].join("\n");

  return trimByChars(content, LAYER0_CHAR_LIMIT);
}

async function buildLayer1ChapterSummaries(projectId: string, charLimit: number): Promise<string> {
  let rows: Array<{
    chapterId: string;
    chapterNumber: number;
    summary: string;
    chapterTitle: string | null;
  }> = [];
  try {
    rows = await db
      .getClient()
      .select({
        chapterId: chapterSummary.chapterId,
        chapterNumber: chapterSummary.chapterNumber,
        summary: chapterSummary.summary,
        chapterTitle: chapter.title,
      })
      .from(chapterSummary)
      .leftJoin(chapter, eq(chapter.id, chapterSummary.chapterId))
      .where(eq(chapterSummary.projectId, projectId))
      .orderBy(asc(chapterSummary.chapterNumber), asc(chapterSummary.updatedAt));
  } catch (error) {
    if (!isMissingTableError(error)) {
      throw error;
    }
    logger.warn("Layer1 skipped due to missing table", { projectId, error });
  }

  const content = rows
    .map((row) => `- [#${row.chapterNumber}] (${row.chapterId}) ${row.chapterTitle ?? "Untitled"}\n${row.summary}`)
    .join("\n");

  return trimByChars(content, charLimit);
}

async function buildLayer2RelatedEntities(projectId: string, question: string): Promise<string> {
  const normalizedQuestion = question.trim();
  const rawTokens = normalizedQuestion
    .replace(/[^0-9A-Za-z가-힣_\s]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2)
    .slice(0, 6);
  const escapedTokens = rawTokens
    .map((token) => escapeLike(token))
    .filter((token) => token.length > 0);
  if (escapedTokens.length === 0) return "(none)";
  const firstToken = escapedTokens[0];
  const prefix = `${firstToken}%`;

  const [charactersResult, factionsResult, eventsResult, termsResult] = await Promise.allSettled([
    db
      .getClient()
      .select({ name: character.name, description: character.description })
      .from(character)
      .where(
        and(
          eq(character.projectId, projectId),
          isNull(character.deletedAt),
          or(...escapedTokens.flatMap((token) => [
            likeWithEscape(character.name, `%${token}%`),
            likeWithEscape(character.description, `%${token}%`),
          ])),
        ),
      )
      .orderBy(
        sql`CASE WHEN ${character.name} LIKE ${prefix} ESCAPE '\\' THEN 0 ELSE 1 END`,
        asc(character.updatedAt),
      )
      .limit(20),
    db
      .getClient()
      .select({ name: faction.name, description: faction.description })
      .from(faction)
      .where(
        and(
          eq(faction.projectId, projectId),
          isNull(faction.deletedAt),
          or(...escapedTokens.flatMap((token) => [
            likeWithEscape(faction.name, `%${token}%`),
            likeWithEscape(faction.description, `%${token}%`),
          ])),
        ),
      )
      .orderBy(
        sql`CASE WHEN ${faction.name} LIKE ${prefix} ESCAPE '\\' THEN 0 ELSE 1 END`,
        asc(faction.updatedAt),
      )
      .limit(20),
    db
      .getClient()
      .select({ name: event.name, description: event.description })
      .from(event)
      .where(
        and(
          eq(event.projectId, projectId),
          isNull(event.deletedAt),
          or(...escapedTokens.flatMap((token) => [
            likeWithEscape(event.name, `%${token}%`),
            likeWithEscape(event.description, `%${token}%`),
          ])),
        ),
      )
      .orderBy(
        sql`CASE WHEN ${event.name} LIKE ${prefix} ESCAPE '\\' THEN 0 ELSE 1 END`,
        asc(event.updatedAt),
      )
      .limit(20),
    db
      .getClient()
      .select({ term: term.term, definition: term.definition })
      .from(term)
      .where(
        and(
          eq(term.projectId, projectId),
          isNull(term.deletedAt),
          or(...escapedTokens.flatMap((token) => [
            likeWithEscape(term.term, `%${token}%`),
            likeWithEscape(term.definition, `%${token}%`),
          ])),
        ),
      )
      .orderBy(
        sql`CASE WHEN ${term.term} LIKE ${prefix} ESCAPE '\\' THEN 0 ELSE 1 END`,
        asc(term.updatedAt),
      )
      .limit(20),
  ]);
  if (charactersResult.status === "rejected") {
    logger.warn("Layer2 character query failed", { projectId, error: charactersResult.reason });
  }
  if (factionsResult.status === "rejected") {
    logger.warn("Layer2 faction query failed", { projectId, error: factionsResult.reason });
  }
  if (eventsResult.status === "rejected") {
    logger.warn("Layer2 event query failed", { projectId, error: eventsResult.reason });
  }
  if (termsResult.status === "rejected") {
    logger.warn("Layer2 term query failed", { projectId, error: termsResult.reason });
  }
  const characters = charactersResult.status === "fulfilled" ? charactersResult.value : [];
  const factions = factionsResult.status === "fulfilled" ? factionsResult.value : [];
  const events = eventsResult.status === "fulfilled" ? eventsResult.value : [];
  const terms = termsResult.status === "fulfilled" ? termsResult.value : [];

  const content = [
    "[CHARACTERS]",
    ...characters.map((row) => `- ${row.name}: ${row.description ?? ""}`),
    "[FACTIONS]",
    ...factions.map((row) => `- ${row.name}: ${row.description ?? ""}`),
    "[EVENTS]",
    ...events.map((row) => `- ${row.name}: ${row.description ?? ""}`),
    "[TERMS]",
    ...terms.map((row) => `- ${row.term}: ${row.definition ?? ""}`),
  ].join("\n");

  return trimByChars(content, LAYER2_CHAR_LIMIT);
}

async function buildLayer3Evidence(projectId: string, question: string): Promise<{
  section: string;
  evidence: RagQaEvidence[];
}> {
  let rows = await searchService.searchChunks({ projectId, query: question, limit: 10 });
  if (rows.length === 0) {
    const normalizedQuestion = question.trim();
    const escaped = escapeLike(normalizedQuestion);
    const rawTokens = normalizedQuestion
      .replace(/[^0-9A-Za-z가-힣_\s]/g, " ")
      .split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => token.length >= 2)
      .slice(0, 8);
    const tokenPredicates = rawTokens
      .map((token) => escapeLike(token))
      .filter((token): token is string => token.length > 0)
      .map((token) => likeWithEscape(memoryChunk.content, `%${token}%`));
    const lexicalPredicate =
      tokenPredicates.length > 0
        ? or(...tokenPredicates)
        : escaped
          ? likeWithEscape(memoryChunk.content, `%${escaped}%`)
          : undefined;
    if (lexicalPredicate) {
      try {
        const lexicalRows = await db
          .getClient()
          .select({
            chunkId: memoryChunk.id,
            chapterId: memoryChunk.chapterId,
            content: memoryChunk.content,
            startOffset: memoryChunk.startOffset,
          })
          .from(memoryChunk)
          .where(
            and(
              eq(memoryChunk.projectId, projectId),
              lexicalPredicate,
            ),
          )
          .orderBy(asc(memoryChunk.updatedAt))
          .limit(10);
        rows = lexicalRows.map((row) => ({
          chunkId: row.chunkId,
          chapterId: row.chapterId,
          content: row.content,
          startOffset: row.startOffset,
          endOffset: null,
          score: 0,
        }));
      } catch (error) {
        logger.warn("Layer3 lexical fallback failed; using empty lexical rows", {
          projectId,
          error,
        });
      }
    }
  }
  const evidence: RagQaEvidence[] = rows.map((row) => ({
    chunkId: row.chunkId,
    chapterId: row.chapterId,
    offset: row.startOffset ?? 0,
    quote: trimByChars(row.content, 320),
  }));

  const section = evidence.length
    ? evidence
      .map((item, index) => {
        const n = index + 1;
        return `[E${n}] chunk=${item.chunkId} chapter=${item.chapterId ?? "null"} offset=${item.offset}\n${item.quote}`;
      })
      .join("\n\n")
    : "(no evidence found)";

  return { section, evidence };
}

export async function assembleRagContext(input: {
  projectId: string;
  question: string;
  chapterId?: string;
  signal?: AbortSignal;
  contextBudget?: number;
}): Promise<RagContextPacket> {
  throwIfAborted(input.signal);
  const budget = input.contextBudget ?? 8_192;
  const layer1Limit = Math.max(1_500, budget - LAYER0_CHAR_LIMIT - LAYER2_CHAR_LIMIT - 2_000);
  const [layer0, layer1, layer2, layer3, promptConfig] = await Promise.all([
    buildLayer0ProjectSummary(input.projectId),
    buildLayer1ChapterSummaries(input.projectId, layer1Limit),
    buildLayer2RelatedEntities(input.projectId, input.question),
    buildLayer3Evidence(input.projectId, input.question),
    loadRagPromptConfig(),
  ]);
  throwIfAborted(input.signal);

  const systemPrompt = [
    promptConfig.systemInstruction,
    "반드시 근거(E1..En) 기반으로만 답변하세요.",
    "근거가 부족하면 '근거 부족'을 명시하세요.",
    "사고 과정/중간 추론/자기 설명 출력 금지",
    "같은 문장 반복 출력 금지",
    "사용자가 명시적으로 요청한 경우에만 고정 포맷/목록 사용",
  ].join("\n");

  const userPrompt = [
    formatLayer("Layer 0 — Project Summary", layer0),
    formatLayer("Layer 1 — Chapter Summaries", layer1),
    formatLayer("Layer 2 — Related Entities", layer2),
    formatLayer("Layer 3 — Retrieved Evidence", layer3.section),
    `## Focus Chapter\n${input.chapterId ?? "(not specified)"}`,
    `## User Question\n${input.question}`,
    "## Output Rules\n- 한국어\n- 자연스러운 대화형 답변\n",
  ].join("\n\n");

  return {
    systemPrompt,
    userPrompt,
    evidence: layer3.evidence,
  };
}
