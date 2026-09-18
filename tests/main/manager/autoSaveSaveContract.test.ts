// TEST_LEVEL: UNIT_MOCKED
// TEST_DESIGN: ISTQB specification-based testing with controlled async interleaving
// PROVES: 최신 pending 세대 보존, flush 후속 세대 배출, DB 실패 전파 계약
// TEST_SPEC: docs/quality/database/db-01-02-autosave-save-contract-test-report.md

import { describe, expect, it, vi } from "vitest";
import {
  flushAllPendingSaves,
  performAutoSave,
} from "../../../src/main/manager/autoSave/helpers.js";
import type {
  AutoSaveRuntimeCounters,
  PendingSave,
} from "../../../src/main/manager/autoSave/autoSaveTypes.js";

const createStats = (): AutoSaveRuntimeCounters => ({
  triggered: 0,
  skippedDisabled: 0,
  skippedMissingChapter: 0,
  duplicateTriggers: 0,
  scheduled: 0,
  rescheduled: 0,
  saveStarted: 0,
  saveSucceeded: 0,
  saveFailed: 0,
  validationBlocked: 0,
  queueDelayTotalMs: 0,
  queueDelaySamples: 0,
  saveDurationTotalMs: 0,
  saveDurationSamples: 0,
  lastQueueDelayMs: 0,
  lastSaveDurationMs: 0,
});

const createPending = (content: string, timestamp: number): PendingSave => ({
  chapterId: "chapter-1",
  projectId: "project-1",
  content,
  timestamp,
});

const createPerformInput = (
  pendingSaves: Map<string, PendingSave>,
  updateChapter: (
    input: { id: string; content: string },
    options?: { revisionReason?: "autosave" | "manual_save" },
  ) => Promise<unknown>,
) => {
  const saveTimers = new Map<string, NodeJS.Timeout>();
  const emitSaved = vi.fn();
  const emitError = vi.fn();
  const queueMirrorWrite = vi.fn();
  const maybeEnqueueSnapshot = vi.fn();
  const stats = createStats();

  return {
    input: {
      chapterId: "chapter-1",
      revisionReason: "autosave" as const,
      pendingSaves,
      saveTimers,
      lastSaveAt: new Map([["chapter-1", 1]]),
      firstQueuedAt: new Map([["chapter-1", 1]]),
      stats,
      loadChapterService: async () => ({ updateChapter }),
      queueMirrorWrite,
      maybeEnqueueSnapshot,
      emitSaved,
      emitError,
      canEmitError: () => true,
      logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      },
    },
    emitSaved,
    emitError,
    queueMirrorWrite,
    maybeEnqueueSnapshot,
    stats,
  };
};

describe("Auto-save save contract", () => {
  it("TC-DB-01-A keeps a newer pending body when an older save completes", async () => {
    const oldPending = createPending("old body", 1);
    const newPending = createPending("new body", 2);
    const pendingSaves = new Map([["chapter-1", oldPending]]);
    let releaseOldSave: (() => void) | undefined;
    const updateChapter = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            releaseOldSave = resolve;
          }),
      )
      .mockResolvedValueOnce(undefined);
    const contract = createPerformInput(pendingSaves, updateChapter);

    const oldSave = performAutoSave(contract.input);
    await vi.waitFor(() => expect(updateChapter).toHaveBeenCalledTimes(1));
    pendingSaves.set("chapter-1", newPending);
    releaseOldSave?.();
    await oldSave;

    expect(pendingSaves.get("chapter-1")).toBe(newPending);
    expect(contract.emitSaved).not.toHaveBeenCalled();
    expect(contract.queueMirrorWrite).not.toHaveBeenCalled();
    expect(contract.maybeEnqueueSnapshot).not.toHaveBeenCalled();

    await performAutoSave(contract.input);

    expect(updateChapter).toHaveBeenNthCalledWith(
      2,
      {
        id: "chapter-1",
        content: "new body",
      },
      { revisionReason: "autosave" },
    );
    expect(pendingSaves.has("chapter-1")).toBe(false);
    expect(contract.emitSaved).toHaveBeenCalledTimes(1);
    expect(contract.queueMirrorWrite).toHaveBeenCalledWith(newPending);
  });

  it("TC-DB-01-B drains a successor generation during flush", async () => {
    const pendingSaves = new Map([["chapter-1", createPending("old body", 1)]]);
    const performSave = vi.fn(async () => {
      const current = pendingSaves.get("chapter-1");
      if (current?.content === "old body") {
        pendingSaves.set("chapter-1", createPending("new body", 2));
        return;
      }
      pendingSaves.delete("chapter-1");
    });

    await flushAllPendingSaves(
      pendingSaves,
      async (_projectId, task) => task(),
      performSave,
    );

    expect(performSave).toHaveBeenCalledTimes(2);
    expect(pendingSaves.size).toBe(0);
  });

  it("TC-DB-02-A preserves pending and rejects when the DB write fails", async () => {
    const pending = createPending("latest body", 1);
    const pendingSaves = new Map([["chapter-1", pending]]);
    const failure = new Error("database unavailable");
    const contract = createPerformInput(pendingSaves, async () => {
      throw failure;
    });

    await expect(performAutoSave(contract.input)).rejects.toBe(failure);

    expect(pendingSaves.get("chapter-1")).toBe(pending);
    expect(contract.emitError).toHaveBeenCalledWith("chapter-1", failure);
    expect(contract.emitSaved).not.toHaveBeenCalled();
    expect(contract.queueMirrorWrite).not.toHaveBeenCalled();
    expect(contract.stats.saveFailed).toBe(1);
    expect(contract.stats.saveSucceeded).toBe(0);
  });
});
