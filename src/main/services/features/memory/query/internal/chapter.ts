import { and, eq, inArray } from "drizzle-orm";
import { db } from "../../../../../database/main/databaseService.js";
import { chapter } from "../../../../../database/schema/index.js";
import { parseChapterOrder } from "./plan.js";

type ResolveChapterInput = {
  question: string;
  projectId: string;
  chapterId?: string;
};

type ResolveChapterByIdInput = {
  projectId: string;
  chapterId?: string;
};

type ResolveChapterOrderMapInput = {
  projectId: string;
  chapterIds: string[];
};

export async function resolveChapterOrder(input: ResolveChapterInput): Promise<number | null> {
  const parsed = parseChapterOrder(input.question);
  if (parsed !== null) return parsed;
  if (!input.chapterId) return null;

  const rows = await db
    .getClient()
    .select({ order: chapter.order })
    .from(chapter)
    .where(
      and(
        eq(chapter.projectId, input.projectId),
        eq(chapter.id, input.chapterId),
      ),
    )
    .limit(1);
  return rows[0]?.order ?? null;
}

export async function resolveChapterOrderByChapterId(
  input: ResolveChapterByIdInput,
): Promise<number | null> {
  if (!input.chapterId) return null;

  const rows = await db
    .getClient()
    .select({ order: chapter.order })
    .from(chapter)
    .where(
      and(
        eq(chapter.projectId, input.projectId),
        eq(chapter.id, input.chapterId),
      ),
    )
    .limit(1);
  return rows[0]?.order ?? null;
}

export async function resolveChapterOrderMap(
  input: ResolveChapterOrderMapInput,
): Promise<Map<string, number>> {
  if (input.chapterIds.length === 0) return new Map();
  const rows = await db
    .getClient()
    .select({ id: chapter.id, order: chapter.order })
    .from(chapter)
    .where(
      and(
        eq(chapter.projectId, input.projectId),
        inArray(chapter.id, input.chapterIds),
      ),
    );
  return new Map(rows.map((row) => [row.id, row.order]));
}
