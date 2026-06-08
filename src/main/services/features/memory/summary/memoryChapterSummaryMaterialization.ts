import crypto from "node:crypto";
import { and, asc, eq, ne } from "drizzle-orm";
import {
  chapter,
  chapterBody,
  chapterSummary,
  db,
} from "../../../../infra/database/index.js";

export type ChapterSummaryMaterializerInput = {
  projectId: string;
  chapterId: string;
  chapterTitle: string;
  chapterNumber: number;
  content: string;
};

export type ChapterSummaryMaterializer = (
  input: ChapterSummaryMaterializerInput,
) => Promise<{ summary: string; model: string }>;

export async function materializeChapterSummariesForNarrativeMemory(input: {
  projectId: string;
  summarizer: ChapterSummaryMaterializer;
  nowIso?: string;
  limit?: number;
}): Promise<{ inspected: number; generated: number; skipped: number }> {
  const nowIso = input.nowIso ?? new Date().toISOString();
  const limit = Math.max(1, input.limit ?? 20);
  const client = db.getClient();
  const rows = await client
    .select({
      chapterId: chapter.id,
      chapterTitle: chapter.title,
      chapterNumber: chapter.order,
      chapterContent: chapter.content,
      bodyContent: chapterBody.content,
      bodyHash: chapterBody.contentHash,
      existingContentHash: chapterSummary.contentHash,
      existingIsFallback: chapterSummary.isFallback,
    })
    .from(chapter)
    .leftJoin(chapterBody, eq(chapterBody.chapterId, chapter.id))
    .leftJoin(chapterSummary, eq(chapterSummary.chapterId, chapter.id))
    .where(and(eq(chapter.projectId, input.projectId), ne(chapter.content, "")))
    .orderBy(asc(chapter.order))
    .limit(limit);

  let generated = 0;
  let skipped = 0;

  for (const row of rows) {
    const content = String(row.bodyContent ?? row.chapterContent ?? "");
    const contentHash = row.bodyHash || sha256(content);
    if (
      row.existingContentHash === contentHash &&
      row.existingIsFallback === false
    ) {
      skipped += 1;
      continue;
    }
    const draft = await input.summarizer({
      projectId: input.projectId,
      chapterId: row.chapterId,
      chapterTitle: row.chapterTitle,
      chapterNumber: row.chapterNumber,
      content,
    });
    const summary = draft.summary.replace(/\s+/g, " ").trim();
    if (!summary) {
      throw new Error(`CHAPTER_SUMMARY_EMPTY:${row.chapterId}`);
    }
    await client
      .insert(chapterSummary)
      .values({
        id: crypto.randomUUID(),
        projectId: input.projectId,
        chapterId: row.chapterId,
        chapterNumber: row.chapterNumber,
        summary:
          summary.length <= 240 ? summary : `${summary.slice(0, 240)}...`,
        contentHash,
        isFallback: false,
        model: draft.model,
        generatedAt: nowIso,
        updatedAt: nowIso,
      })
      .onConflictDoUpdate({
        target: [chapterSummary.chapterId],
        set: {
          projectId: input.projectId,
          chapterNumber: row.chapterNumber,
          summary:
            summary.length <= 240 ? summary : `${summary.slice(0, 240)}...`,
          contentHash,
          isFallback: false,
          model: draft.model,
          generatedAt: nowIso,
          updatedAt: nowIso,
        },
      });
    generated += 1;
  }

  return { inspected: rows.length, generated, skipped };
}

function sha256(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}
