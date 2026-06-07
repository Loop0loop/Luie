import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "../../../../database/main/databaseService.js";
import { chapter, chapterSummary, plot, synopsis } from "../../../../database/schema/index.js";
import { createLogger } from "../../../../../shared/logger/index.js";
import { LAYER0_CHAR_LIMIT, isMissingTableError, trimByChars } from "./contextAssembler.constants.js";

const logger = createLogger("RagContextAssembler");

export async function buildLayer0ProjectSummary(
  projectId: string,
): Promise<string> {
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

export async function buildLayer1ChapterSummaries(
  projectId: string,
  charLimit: number,
): Promise<string> {
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
    .map(
      (row) =>
        `- [#${row.chapterNumber}] (${row.chapterId}) ${row.chapterTitle ?? "Untitled"}\n${row.summary}`,
    )
    .join("\n");

  return trimByChars(content, charLimit);
}
