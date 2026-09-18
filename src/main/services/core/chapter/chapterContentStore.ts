import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../../../infra/database/index.js";
import type { MainDrizzleClient } from "../../../infra/database/index.js";
import { chapter, chapterBody } from "../../../infra/database/index.js";

type ChapterBodyWriteStore = Pick<MainDrizzleClient, "insert">;

export const hashChapterContent = (content: string): string =>
  crypto.createHash("sha256").update(content).digest("hex");

export const upsertChapterBody = (input: {
  chapterId: string;
  content: string;
  contentHash?: string;
  now: string;
  tx?: ChapterBodyWriteStore;
}): void => {
  const store = input.tx ?? db.getClient();
  const contentHash = input.contentHash ?? hashChapterContent(input.content);
  store
    .insert(chapterBody)
    .values({
      chapterId: input.chapterId,
      content: input.content,
      contentHash,
      updatedAt: input.now,
    })
    .onConflictDoUpdate({
      target: [chapterBody.chapterId],
      set: {
        content: input.content,
        contentHash,
        updatedAt: input.now,
      },
    })
    .run();
};

export const readChapterContent = async (
  chapterId: string,
): Promise<string> => {
  const store = db.getClient();
  const bodyRows = await store
    .select({ content: chapterBody.content })
    .from(chapterBody)
    .where(eq(chapterBody.chapterId, chapterId))
    .limit(1);
  if (bodyRows.length > 0 && typeof bodyRows[0].content === "string") {
    return bodyRows[0].content;
  }
  const chapterRows = await store
    .select({ content: chapter.content })
    .from(chapter)
    .where(eq(chapter.id, chapterId))
    .limit(1);
  return chapterRows.length > 0 ? String(chapterRows[0].content ?? "") : "";
};
