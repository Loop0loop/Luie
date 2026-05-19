import { and, asc, eq, isNull, like, or } from "drizzle-orm";
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
  assembledPrompt: string;
  evidence: RagQaEvidence[];
};
const logger = createLogger("RagContextAssembler");

// Default prompt budget is conservative to avoid context overflow on
// runtimes with smaller context windows.
const LAYER0_CHAR_LIMIT = 6_000;
const LAYER1_CHAR_LIMIT = 24_000;
const LAYER2_CHAR_LIMIT = 4_000;

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

async function buildLayer1ChapterSummaries(projectId: string): Promise<string> {
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

  return trimByChars(content, LAYER1_CHAR_LIMIT);
}

async function buildLayer2RelatedEntities(projectId: string, question: string): Promise<string> {
  const escaped = escapeLike(question.trim());
  if (!escaped) return "(none)";

  const prefix = `${escaped}%`;
  const contains = `%${escaped}%`;

  const [characterPrefix, factionPrefix, eventPrefix, termPrefix] = await Promise.all([
    db
      .getClient()
      .select({ name: character.name, description: character.description })
      .from(character)
      .where(and(eq(character.projectId, projectId), isNull(character.deletedAt), like(character.name, prefix)))
      .limit(20),
    db
      .getClient()
      .select({ name: faction.name, description: faction.description })
      .from(faction)
      .where(and(eq(faction.projectId, projectId), isNull(faction.deletedAt), like(faction.name, prefix)))
      .limit(20),
    db
      .getClient()
      .select({ name: event.name, description: event.description })
      .from(event)
      .where(and(eq(event.projectId, projectId), isNull(event.deletedAt), like(event.name, prefix)))
      .limit(20),
    db
      .getClient()
      .select({ term: term.term, definition: term.definition })
      .from(term)
      .where(and(eq(term.projectId, projectId), isNull(term.deletedAt), like(term.term, prefix)))
      .limit(20),
  ]);

  const [characterFallback, factionFallback, eventFallback, termFallback] = await Promise.all([
    characterPrefix.length > 0
      ? Promise.resolve([])
      : db
        .getClient()
        .select({ name: character.name, description: character.description })
        .from(character)
        .where(
          and(
            eq(character.projectId, projectId),
            isNull(character.deletedAt),
            or(like(character.name, contains), like(character.description, contains)),
          ),
        )
        .limit(20),
    factionPrefix.length > 0
      ? Promise.resolve([])
      : db
        .getClient()
        .select({ name: faction.name, description: faction.description })
        .from(faction)
        .where(
          and(
            eq(faction.projectId, projectId),
            isNull(faction.deletedAt),
            or(like(faction.name, contains), like(faction.description, contains)),
          ),
        )
        .limit(20),
    eventPrefix.length > 0
      ? Promise.resolve([])
      : db
        .getClient()
        .select({ name: event.name, description: event.description })
        .from(event)
        .where(
          and(
            eq(event.projectId, projectId),
            isNull(event.deletedAt),
            or(like(event.name, contains), like(event.description, contains)),
          ),
        )
        .limit(20),
    termPrefix.length > 0
      ? Promise.resolve([])
      : db
        .getClient()
        .select({ term: term.term, definition: term.definition })
        .from(term)
        .where(
          and(
            eq(term.projectId, projectId),
            isNull(term.deletedAt),
            or(like(term.term, contains), like(term.definition, contains)),
          ),
        )
        .limit(20),
  ]);

  const characters = characterPrefix.length > 0 ? characterPrefix : characterFallback;
  const factions = factionPrefix.length > 0 ? factionPrefix : factionFallback;
  const events = eventPrefix.length > 0 ? eventPrefix : eventFallback;
  const terms = termPrefix.length > 0 ? termPrefix : termFallback;

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
      .map((token) => like(memoryChunk.content, `%${token}%`));
    const lexicalPredicate =
      tokenPredicates.length > 0
        ? or(...tokenPredicates)
        : escaped
          ? like(memoryChunk.content, `%${escaped}%`)
          : undefined;
    if (lexicalPredicate) {
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
}): Promise<RagContextPacket> {
  const [layer0, layer1, layer2, layer3] = await Promise.all([
    buildLayer0ProjectSummary(input.projectId),
    buildLayer1ChapterSummaries(input.projectId),
    buildLayer2RelatedEntities(input.projectId, input.question),
    buildLayer3Evidence(input.projectId, input.question),
  ]);
  const promptConfig = await loadRagPromptConfig();

  const prompt = [
    promptConfig.systemInstruction,
    "반드시 근거(E1..En) 기반으로만 답변하세요.",
    "근거가 부족하면 '근거 부족'을 명시하세요.",
    formatLayer("Layer 0 — Project Summary", layer0),
    formatLayer("Layer 1 — Chapter Summaries", layer1),
    formatLayer("Layer 2 — Related Entities", layer2),
    formatLayer("Layer 3 — Retrieved Evidence", layer3.section),
    `## Focus Chapter\n${input.chapterId ?? "(not specified)"}`,
    `## User Question\n${input.question}`,
    "## Output Rules\n- 한국어\n- 자연스러운 대화형 답변\n- 사고 과정/중간 추론/자기 설명 출력 금지\n- 같은 문장 반복 출력 금지\n- 사용자가 명시적으로 요청한 경우에만 고정 포맷/목록 사용\n",
  ].join("\n\n");

  return {
    assembledPrompt: prompt,
    evidence: layer3.evidence,
  };
}
