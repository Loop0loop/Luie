import { eq } from "drizzle-orm";
import type { MainDrizzleClient } from "../../database/databaseTypes.js";
import { chapter } from "../../database/schema.js";

type LoadDb = () => Promise<{
  getClient: () => MainDrizzleClient;
}>;

type LegacyChapterLookupClient = {
  chapter?: {
    findUnique?: (input: {
      where: { id: string };
      select?: { projectId: boolean; deletedAt: boolean };
    }) => Promise<{ projectId: string; deletedAt: string | Date | null } | null>;
  };
};

export async function verifyChapterProject(input: {
  chapterId: string;
  projectId: string;
  loadDb: LoadDb;
}): Promise<boolean> {
  const db = await input.loadDb();
  const rawStore = db.getClient() as unknown as LegacyChapterLookupClient & {
    select?: unknown;
  };
  if (typeof rawStore.select !== "function" && rawStore.chapter?.findUnique) {
    const chapterData = await rawStore.chapter.findUnique({
      where: { id: input.chapterId },
      select: { projectId: true, deletedAt: true },
    });
    return Boolean(
      chapterData &&
        String(chapterData.projectId) === input.projectId &&
        !chapterData.deletedAt,
    );
  }

  const store = db.getClient();
  const chapters = await store
    .select({ projectId: chapter.projectId, deletedAt: chapter.deletedAt })
    .from(chapter)
    .where(eq(chapter.id, input.chapterId))
    .limit(1);
  const chapterData = chapters[0] ?? null;

  return Boolean(
    chapterData &&
      String(chapterData.projectId) === input.projectId &&
      !chapterData.deletedAt,
  );
}
