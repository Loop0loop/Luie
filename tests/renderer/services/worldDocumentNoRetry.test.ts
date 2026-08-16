import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  setDocument: vi.fn(),
  setScrapMemos: vi.fn(),
  error: vi.fn(async () => undefined),
  warn: vi.fn(async () => undefined),
}));

vi.mock("@shared/api", () => ({
  api: {
    worldStorage: {
      setDocument: mocked.setDocument,
      setScrapMemos: mocked.setScrapMemos,
    },
    logger: {
      error: mocked.error,
      warn: mocked.warn,
    },
  },
}));

import { saveReplicaScrapMemos } from "../../../src/renderer/src/features/research/services/worldPackageStorageHelpers/replicaStorage.js";
import { persistGraphDocument } from "../../../src/renderer/src/features/research/stores/worldBuilding/worldBuildingActions/runtime.js";

describe("world document export failures", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mocked.setDocument.mockReset().mockResolvedValue({
      success: true,
      data: { packageExportError: "graph export failed" },
    });
    mocked.setScrapMemos.mockReset().mockResolvedValue({
      success: true,
      data: { packageExportError: "scrap export failed" },
    });
    mocked.error.mockClear();
    mocked.warn.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not retry a graph document package export failure", async () => {
    await expect(
      persistGraphDocument("project-graph", { nodes: [], edges: [] }),
    ).rejects.toThrow("graph export failed");

    await vi.advanceTimersByTimeAsync(60_000);

    expect(mocked.setDocument).toHaveBeenCalledOnce();
    expect(mocked.setDocument).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: "project-graph", docType: "graph" }),
    );
  });

  it("does not retry a replica scrap package export failure", async () => {
    await expect(
      saveReplicaScrapMemos("project-scrap", {
        schemaVersion: 2,
        memos: [],
      }),
    ).resolves.toBe(false);

    await vi.advanceTimersByTimeAsync(60_000);

    expect(mocked.setScrapMemos).toHaveBeenCalledOnce();
  });
});
