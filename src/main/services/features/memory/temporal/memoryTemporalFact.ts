export type MemoryFactTemporalStatus =
  | "suggested"
  | "confirmed"
  | "conflicting"
  | "rejected"
  | "deprecated";

export type MemoryFactTemporalLike = {
  id: string;
  status: string;
  validFromChapterOrder: number;
  validToChapterOrder: number | null;
  observedAtChapterOrder: number;
  invalidatedByFactId: string | null;
};

const ACTIVE_FACT_STATUSES = new Set(["suggested", "confirmed", "conflicting"]);

export function isMemoryFactValidAtChapter(
  fact: MemoryFactTemporalLike,
  chapterOrder: number,
): boolean {
  if (!ACTIVE_FACT_STATUSES.has(fact.status)) return false;
  if (fact.invalidatedByFactId !== null) return false;
  if (fact.observedAtChapterOrder > chapterOrder) return false;
  if (fact.validFromChapterOrder > chapterOrder) return false;
  if (
    fact.validToChapterOrder !== null &&
    fact.validToChapterOrder < chapterOrder
  )
    return false;
  return true;
}

export function filterFactsValidAtChapter<T extends MemoryFactTemporalLike>(
  facts: T[],
  chapterOrder: number,
): T[] {
  return facts.filter((fact) => isMemoryFactValidAtChapter(fact, chapterOrder));
}
