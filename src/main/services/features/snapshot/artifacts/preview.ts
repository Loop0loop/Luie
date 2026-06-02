import type { FullSnapshotData } from "./types.js";

const RESTORE_EXCERPT_MAX_LENGTH = 160;

const toExcerpt = (value: string | null | undefined): string | undefined => {
  if (typeof value !== "string") return undefined;
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length === 0) return undefined;
  if (normalized.length <= RESTORE_EXCERPT_MAX_LENGTH) {
    return normalized;
  }
  return `${normalized.slice(0, RESTORE_EXCERPT_MAX_LENGTH).trimEnd()}...`;
};

export const resolveRestorePreview = (payload: FullSnapshotData) => {
  const focusChapterId = payload.data.focus?.chapterId ?? null;
  const orderedChapters = [...payload.data.chapters].sort(
    (left, right) =>
      new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
  );
  const chapter =
    orderedChapters.find((entry) => entry.id === focusChapterId) ??
    orderedChapters[0];
  const excerpt = toExcerpt(payload.data.focus?.content ?? chapter?.content);

  return {
    chapterTitle: chapter?.title,
    excerpt,
  };
};
