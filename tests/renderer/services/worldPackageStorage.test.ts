import { beforeEach, describe, expect, it, vi } from "vitest";
import { STORAGE_KEY_UI } from "../../../src/shared/constants/index.js";
import type { WorldScrapMemosData } from "../../../src/shared/types/index.js";

type StorageLike = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
  clear: () => void;
  key: (index: number) => string | null;
  readonly length: number;
};

class MemoryStorage implements StorageLike {
  private data = new Map<string, string>();

  getItem(key: string): string | null {
    return this.data.has(key) ? this.data.get(key)! : null;
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }

  clear(): void {
    this.data.clear();
  }

  key(index: number): string | null {
    return Array.from(this.data.keys())[index] ?? null;
  }

  get length(): number {
    return this.data.size;
  }
}

const memoryStorage = new MemoryStorage();

type TestWindowApi = {
  fs: {
    readLuieEntry: ReturnType<typeof vi.fn>;
    writeProjectFile: ReturnType<typeof vi.fn>;
  };
  logger: {
    warn: ReturnType<typeof vi.fn>;
  };
};

const setWindowApi = (api: TestWindowApi) => {
  Object.assign(globalThis, {
    window: {
      api,
    },
  });
};

describe("worldPackageStorage", () => {
  beforeEach(() => {
    vi.resetModules();
    Reflect.deleteProperty(globalThis, "window");
    Object.defineProperty(globalThis, "localStorage", {
      value: memoryStorage,
      configurable: true,
      writable: true,
    });
    memoryStorage.clear();
  });

  it("logs warning when .luie world write returns ipc failure response", async () => {
    const writeProjectFile = vi.fn().mockResolvedValue({
      success: false,
      error: {
        code: "FS_PERMISSION_DENIED",
        message: "permission denied",
      },
    });
    const warn = vi.fn().mockResolvedValue({ success: true });

    setWindowApi({
      fs: {
        readLuieEntry: vi.fn().mockResolvedValue({ success: true, data: null }),
        writeProjectFile,
      },
      logger: { warn },
    });

    const { worldPackageStorage } =
      await import("../../../src/renderer/src/features/research/services/worldPackageStorage.js");

    await worldPackageStorage.saveSynopsis("project-1", "/tmp/project-1.luie", {
      synopsis: "hello",
      status: "draft",
    });

    expect(writeProjectFile).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledTimes(1);
    const loggedError = warn.mock.calls[0]?.[1];
    expect(loggedError).toBeInstanceOf(Error);
    expect((loggedError as Error).message).toContain("LUIE_WRITE_FAILED");
  });

  it("serializes concurrent writes for the same .luie package", async () => {
    const writeResolvers: Array<(value: unknown) => void> = [];
    const writeProjectFile = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          writeResolvers.push(resolve);
        }),
    );
    const warn = vi.fn().mockResolvedValue({ success: true });

    setWindowApi({
      fs: {
        readLuieEntry: vi.fn().mockResolvedValue({ success: true, data: null }),
        writeProjectFile,
      },
      logger: { warn },
    });

    const { worldPackageStorage } =
      await import("../../../src/renderer/src/features/research/services/worldPackageStorage.js");

    const firstSave = worldPackageStorage.savePlot(
      "project-1",
      "/tmp/project-1.luie",
      {
        columns: [{ id: "col-1", title: "A", cards: [] }],
      },
    );
    const secondSave = worldPackageStorage.saveDrawing(
      "project-1",
      "/tmp/project-1.luie",
      {
        paths: [],
        tool: "pen",
        iconType: "mountain",
        color: "#000000",
        lineWidth: 2,
      },
    );

    await vi.waitFor(() => {
      expect(writeProjectFile).toHaveBeenCalledTimes(1);
    });

    writeResolvers.shift()?.({
      success: true,
      data: { path: "/tmp/project-1.luie" },
    });
    await vi.waitFor(() => {
      expect(writeProjectFile).toHaveBeenCalledTimes(2);
    });

    writeResolvers.shift()?.({
      success: true,
      data: { path: "/tmp/project-1.luie" },
    });
    await Promise.all([firstSave, secondSave]);
    expect(warn).not.toHaveBeenCalled();
  });

  it("serializes writes when same .luie path uses mixed slash/case variants", async () => {
    const writeResolvers: Array<(value: unknown) => void> = [];
    const writeProjectFile = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          writeResolvers.push(resolve);
        }),
    );
    const warn = vi.fn().mockResolvedValue({ success: true });

    setWindowApi({
      fs: {
        readLuieEntry: vi.fn().mockResolvedValue({ success: true, data: null }),
        writeProjectFile,
      },
      logger: { warn },
    });

    const { worldPackageStorage } =
      await import("../../../src/renderer/src/features/research/services/worldPackageStorage.js");

    const firstSave = worldPackageStorage.savePlot(
      "project-1",
      "C:\\Workspace\\Novel.luie",
      {
        columns: [{ id: "col-1", title: "A", cards: [] }],
      },
    );
    const secondSave = worldPackageStorage.saveDrawing(
      "project-1",
      "c:/Workspace/Novel.luie",
      {
        paths: [],
        tool: "pen",
        iconType: "mountain",
        color: "#000000",
        lineWidth: 2,
      },
    );

    await vi.waitFor(() => {
      expect(writeProjectFile).toHaveBeenCalledTimes(1);
    });

    writeResolvers.shift()?.({
      success: true,
      data: { path: "C:\\Workspace\\Novel.luie" },
    });
    await vi.waitFor(() => {
      expect(writeProjectFile).toHaveBeenCalledTimes(2);
    });

    writeResolvers.shift()?.({
      success: true,
      data: { path: "c:/Workspace/Novel.luie" },
    });
    await Promise.all([firstSave, secondSave]);
    expect(warn).not.toHaveBeenCalled();
  });

  it("falls back when .luie scrap memo payload is invalid", async () => {
    const warn = vi.fn().mockResolvedValue({ success: true });

    setWindowApi({
      fs: {
        readLuieEntry: vi.fn().mockResolvedValue({
          success: true,
          data: JSON.stringify({
            memos: [
              {
                id: "memo-1",
                title: 123,
                content: "bad",
                tags: [],
                updatedAt: "2026-03-10T00:00:00.000Z",
              },
            ],
          }),
        }),
        writeProjectFile: vi.fn().mockResolvedValue({ success: true }),
      },
      logger: { warn },
    });

    const { worldPackageStorage, DEFAULT_WORLD_SCRAP_MEMOS } =
      await import("../../../src/renderer/src/features/research/services/worldPackageStorage.js");

    const result = await worldPackageStorage.loadScrapMemos(
      "project-1",
      "/tmp/project-1.luie",
    );

    expect(result).toEqual(DEFAULT_WORLD_SCRAP_MEMOS);
    expect(warn).toHaveBeenCalledWith(
      "Invalid scrap memos payload in .luie package",
      expect.any(Object),
    );
  });

  it("refuses to persist invalid scrap memo payloads", async () => {
    const writeProjectFile = vi.fn().mockResolvedValue({ success: true });
    const warn = vi.fn().mockResolvedValue({ success: true });

    setWindowApi({
      fs: {
        readLuieEntry: vi.fn().mockResolvedValue({ success: true, data: null }),
        writeProjectFile,
      },
      logger: { warn },
    });

    const { worldPackageStorage } =
      await import("../../../src/renderer/src/features/research/services/worldPackageStorage.js");

    const invalidPayload = {
      memos: [
        {
          id: "memo-1",
          title: 123,
          content: "bad",
          tags: [],
          updatedAt: "2026-03-10T00:00:00.000Z",
        },
      ],
    } as unknown as WorldScrapMemosData;

    await worldPackageStorage.saveScrapMemos(
      "project-1",
      "/tmp/project-1.luie",
      invalidPayload,
    );

    expect(writeProjectFile).not.toHaveBeenCalled();
    expect(memoryStorage.length).toBe(0);
    expect(warn).toHaveBeenCalledWith(
      "Refused to persist invalid scrap memos payload",
      expect.any(Object),
    );
  });
});
