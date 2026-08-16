import { describe, expect, it, vi } from "vitest";
import type {
  SyncRunResult,
  SyncStatus,
} from "../../../src/shared/types/index.js";

vi.mock("electron", () => ({
  BrowserWindow: { getAllWindows: vi.fn(() => []) },
}));

vi.mock("../../../src/main/domains/settings/index.js", () => ({
  settingsManager: {},
}));

import { SyncService } from "../../../src/main/services/features/sync/syncService.js";

const result: SyncRunResult = {
  success: true,
  message: "ok",
  pulled: 0,
  pushed: 0,
  conflicts: {
    chapters: 0,
    memos: 0,
    memoryCanonical: 0,
    total: 0,
    items: [],
  },
};

describe("SyncService shutdown", () => {
  it("drains the active run and rejects new work until resumed", async () => {
    const service = new SyncService();
    const internals = service as unknown as {
      status: SyncStatus;
      executeRun: (reason: string) => Promise<SyncRunResult>;
    };
    internals.status = {
      ...service.getStatus(),
      connected: true,
      autoSync: false,
    };

    let finishRun: ((value: SyncRunResult) => void) | undefined;
    vi.spyOn(internals, "executeRun").mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishRun = resolve;
        }),
    );

    const run = service.runNow("manual");
    const pause = service.pauseForShutdown();
    expect((await service.runNow("during-shutdown")).message).toBe(
      "SYNC_PAUSED_FOR_SHUTDOWN",
    );

    finishRun?.(result);
    await Promise.all([run, pause]);

    service.resumeAfterShutdownCancel();
    vi.mocked(internals.executeRun).mockResolvedValueOnce(result);
    expect((await service.runNow("after-cancel")).success).toBe(true);
  });
});
