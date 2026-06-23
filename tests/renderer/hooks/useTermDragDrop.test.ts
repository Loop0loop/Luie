import { describe, expect, it, vi } from "vitest";
import type { Term } from "../../../src/shared/types";
import {
  buildTermOrderUpdates,
  cancelCommitTimeout,
  hasTermReorderFailures,
  reorderTermsByIds,
  resolveNextTermOrder,
  startCommitTimeout,
} from "../../../src/renderer/src/features/research/components/world/hooks/termDragDropUtils";

const createTerm = (id: string, order: number): Term => ({
  id,
  projectId: "project-1",
  term: `term-${id}`,
  definition: null,
  category: "general",
  order,
  firstAppearance: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
});

describe("useTermDragDrop utils", () => {
  it("reorders terms and builds changed updates", () => {
    const base = [createTerm("a", 0), createTerm("b", 1), createTerm("c", 2)];
    const reordered = reorderTermsByIds(base, "c", "a");

    expect(reordered?.map((item) => item.id)).toEqual(["c", "a", "b"]);
    expect(buildTermOrderUpdates(reordered ?? [])).toEqual([
      { id: "c", order: 0 },
      { id: "a", order: 1 },
      { id: "b", order: 2 },
    ]);
  });

  it("treats noop drag as cancel", () => {
    const base = [createTerm("a", 0), createTerm("b", 1)];
    expect(resolveNextTermOrder(base, "a", undefined)).toBeNull();
    expect(resolveNextTermOrder(base, "a", "a")).toBeNull();
  });

  it("detects settled update failures", () => {
    const successResults: Array<PromiseSettledResult<{ success?: boolean }>> = [
      { status: "fulfilled", value: { success: true } },
      { status: "fulfilled", value: { success: true } },
    ];
    const failedResults: Array<PromiseSettledResult<{ success?: boolean }>> = [
      { status: "fulfilled", value: { success: false } },
      { status: "rejected", reason: new Error("network") },
    ];

    expect(hasTermReorderFailures(successResults)).toBe(false);
    expect(hasTermReorderFailures(failedResults)).toBe(true);
  });

  it("clears commit timeout for unmount cleanup", () => {
    const scheduler = vi.fn((_callback: () => void, _timeoutMs: number) => 123);
    const clearer = vi.fn((_id: number) => {
      return;
    });

    const timeoutId = startCommitTimeout(scheduler, 8000, vi.fn());
    expect(timeoutId).toBe(123);
    expect(cancelCommitTimeout(timeoutId, clearer)).toBeNull();
    expect(clearer).toHaveBeenCalledWith(123);
  });
});
