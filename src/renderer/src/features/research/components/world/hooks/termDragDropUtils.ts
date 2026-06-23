import { arrayMove } from "@dnd-kit/sortable";

export type TermReorderUpdate = {
  id: string;
  order: number;
};

export type CommitTimeoutId = ReturnType<typeof setTimeout>;
export type TimeoutScheduler = (
  callback: () => void,
  timeoutMs: number,
) => CommitTimeoutId;
export type TimeoutCanceler = (timeoutId: CommitTimeoutId) => void;

export const reorderTermsByIds = <T extends { id: string }>(
  terms: T[],
  activeId: string,
  overId: string,
): T[] | null => {
  const oldIndex = terms.findIndex((item) => item.id === activeId);
  const newIndex = terms.findIndex((item) => item.id === overId);
  if (oldIndex < 0 || newIndex < 0) return null;
  return arrayMove(terms, oldIndex, newIndex);
};

export const buildTermOrderUpdates = <T extends { id: string; order?: number | null }>(
  terms: T[],
): TermReorderUpdate[] =>
  terms
    .map((item, index) => ({
      id: item.id,
      order: index,
      currentOrder: item.order ?? 0,
    }))
    .filter((entry) => entry.currentOrder !== entry.order)
    .map(({ id, order }) => ({ id, order }));

export const hasTermReorderFailures = (
  results: Array<
    PromiseSettledResult<{
      success?: boolean;
    }>
  >,
): boolean =>
  results.some((result) => {
    if (result.status === "rejected") return true;
    return result.value.success !== true;
  });

export const resolveNextTermOrder = <T extends { id: string }>(
  terms: T[],
  activeId: string,
  overId?: string,
): T[] | null => {
  if (!overId || activeId === overId) {
    return null;
  }
  return reorderTermsByIds(terms, activeId, overId);
};

export const startCommitTimeout = (
  scheduleTimeout: TimeoutScheduler,
  timeoutMs: number,
  onTimeout: () => void,
): CommitTimeoutId => scheduleTimeout(onTimeout, timeoutMs);

export const cancelCommitTimeout = (
  timeoutId: CommitTimeoutId | null,
  clearTimeoutFn: TimeoutCanceler,
): null => {
  if (timeoutId !== null) {
    clearTimeoutFn(timeoutId);
  }
  return null;
};
