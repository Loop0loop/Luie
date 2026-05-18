import { and, asc, eq, isNull, like, or } from "drizzle-orm";
import { db } from "../../../database/index.js";
import {
  chapter,
  chapterSummary,
  character,
  event,
  faction,
  plot,
  synopsis,
  term,
} from "../../../database/schema.js";
import { searchService } from "../searchService.js";
import type { RagQaEvidence } from "../../../../shared/types/index.js";
import { escapeLike } from "../../../utils/queryHelpers.js";

export type RagContextPacket = {
  assembledPrompt: string;
  evidence: RagQaEvidence[];
};

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

async function buildLayer0ProjectSummary(projectId: string): Promise<string> {
  const [synopses, plots] = await Promise.all([
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

  const content = [
    "[PROJECT SYNOPSIS]",
    ...synopses.map((row) => `- ${row.title}\n${row.body}`),
    "[PROJECT PLOTS]",
    ...plots.map((row) => `- ${row.title}\n${row.body}`),
  ].join("\n");

  return trimByChars(content, LAYER0_CHAR_LIMIT);
}

async function buildLayer1ChapterSummaries(projectId: string): Promise<string> {
  const rows = await db
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

  const content = rows
    .map((row) => `- [#${row.chapterNumber}] (${row.chapterId}) ${row.chapterTitle ?? "Untitled"}\n${row.summary}`)
    .join("\n");

  return trimByChars(content, LAYER1_CHAR_LIMIT);
}

async function buildLayer2RelatedEntities(projectId: string, question: string): Promise<string> {
  const escaped = escapeLike(question.trim());
  if (!escaped) return "(none)";

  const [characters, factions, events, terms] = await Promise.all([
    db
      .getClient()
      .select({ name: character.name, description: character.description })
      .from(character)
      .where(
        and(
          eq(character.projectId, projectId),
          isNull(character.deletedAt),
          or(like(character.name, `%${escaped}%`), like(character.description, `%${escaped}%`)),
        ),
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
          or(like(faction.name, `%${escaped}%`), like(faction.description, `%${escaped}%`)),
        ),
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
          or(like(event.name, `%${escaped}%`), like(event.description, `%${escaped}%`)),
        ),
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
          or(like(term.term, `%${escaped}%`), like(term.definition, `%${escaped}%`)),
        ),
      )
      .limit(20),
  ]);

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
  const rows = await searchService.searchChunks({ projectId, query: question, limit: 10 });
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

  const prompt = [
    "당신은 웹소설 집필 어시스턴트입니다.",
    "반드시 근거(E1..En) 기반으로만 답변하세요.",
    "근거가 부족하면 '근거 부족'을 명시하세요.",
    formatLayer("Layer 0 — Project Summary", layer0),
    formatLayer("Layer 1 — Chapter Summaries", layer1),
    formatLayer("Layer 2 — Related Entities", layer2),
    formatLayer("Layer 3 — Retrieved Evidence", layer3.section),
    `## Focus Chapter\n${input.chapterId ?? "(not specified)"}`,
    `## User Question\n${input.question}`,
    "## Output Rules\n- 한국어\n- 핵심 답변 후 근거 번호(E1..En) 명시\n- 모순 판단이면 모순 지점과 화수를 분리\n",
  ].join("\n\n");

  return {
    assembledPrompt: prompt,
    evidence: layer3.evidence,
  };
}
