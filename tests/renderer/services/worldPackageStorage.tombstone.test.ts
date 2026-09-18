import { beforeEach, describe, expect, it, vi } from "vitest";

const setWindowApi = (worldStorage: object, readLuieEntry: unknown) => {
  Object.assign(globalThis, {
    window: {
      api: {
        fs: {
          readLuieEntry,
          writeProjectFile: vi.fn().mockResolvedValue({ success: true }),
        },
        logger: { warn: vi.fn().mockResolvedValue({ success: true }) },
        worldStorage,
      },
    },
  });
};

describe("worldPackageStorage tombstones", () => {
  beforeEach(() => {
    vi.resetModules();
    Reflect.deleteProperty(globalThis, "window");
  });

  it("does not revive a deleted plot from package fallback", async () => {
    const readLuieEntry = vi.fn().mockResolvedValue({
      success: true,
      data: JSON.stringify({
        columns: [{ id: "stale", title: "stale package", cards: [] }],
      }),
    });
    const worldStorage = {
      getDocument: vi.fn().mockResolvedValue({
        success: true,
        data: {
          found: false,
          payload: null,
          deletedAt: "2026-09-18T00:00:00.000Z",
        },
      }),
      setDocument: vi.fn().mockResolvedValue({ success: true }),
    };
    setWindowApi(worldStorage, readLuieEntry);

    const { worldPackageStorage, DEFAULT_WORLD_PLOT } =
      await import("../../../src/renderer/src/features/research/services/worldPackageStorage.js");

    await expect(
      worldPackageStorage.loadPlot("project-deleted", "/tmp/stale.luie"),
    ).resolves.toEqual(DEFAULT_WORLD_PLOT);
    expect(readLuieEntry).not.toHaveBeenCalled();
    expect(worldStorage.setDocument).not.toHaveBeenCalled();
  });

  it("does not revive deleted scrap memos from package fallback", async () => {
    const readLuieEntry = vi.fn().mockResolvedValue({
      success: true,
      data: JSON.stringify({ memos: [{ id: "stale" }] }),
    });
    const worldStorage = {
      getScrapMemos: vi.fn().mockResolvedValue({
        success: true,
        data: {
          found: false,
          data: null,
          deletedAt: "2026-09-18T00:00:00.000Z",
        },
      }),
      setScrapMemos: vi.fn().mockResolvedValue({ success: true }),
    };
    setWindowApi(worldStorage, readLuieEntry);

    const { worldPackageStorage, DEFAULT_WORLD_SCRAP_MEMOS } =
      await import("../../../src/renderer/src/features/research/services/worldPackageStorage.js");

    await expect(
      worldPackageStorage.loadScrapMemos(
        "project-deleted-scrap",
        "/tmp/stale.luie",
      ),
    ).resolves.toEqual(DEFAULT_WORLD_SCRAP_MEMOS);
    expect(readLuieEntry).not.toHaveBeenCalled();
    expect(worldStorage.setScrapMemos).not.toHaveBeenCalled();
  });
});
