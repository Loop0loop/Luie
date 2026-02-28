import { beforeEach, describe, expect, it, vi } from "vitest";

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

    const { worldPackageStorage } = await import(
      "../../../src/renderer/src/features/research/services/worldPackageStorage.js"
    );

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

    const { worldPackageStorage } = await import(
      "../../../src/renderer/src/features/research/services/worldPackageStorage.js"
    );

    const firstSave = worldPackageStorage.savePlot("project-1", "/tmp/project-1.luie", {
      columns: [{ id: "col-1", title: "A", cards: [] }],
    });
    const secondSave = worldPackageStorage.saveDrawing("project-1", "/tmp/project-1.luie", {
      paths: [],
      tool: "pen",
      iconType: "mountain",
      color: "#000000",
      lineWidth: 2,
    });

    await vi.waitFor(() => {
      expect(writeProjectFile).toHaveBeenCalledTimes(1);
    });

    writeResolvers.shift()?.({ success: true, data: { path: "/tmp/project-1.luie" } });
    await vi.waitFor(() => {
      expect(writeProjectFile).toHaveBeenCalledTimes(2);
    });

    writeResolvers.shift()?.({ success: true, data: { path: "/tmp/project-1.luie" } });
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

    const { worldPackageStorage } = await import(
      "../../../src/renderer/src/features/research/services/worldPackageStorage.js"
    );

    const firstSave = worldPackageStorage.savePlot("project-1", "C:\\Workspace\\Novel.luie", {
      columns: [{ id: "col-1", title: "A", cards: [] }],
    });
    const secondSave = worldPackageStorage.saveDrawing("project-1", "c:/Workspace/Novel.luie", {
      paths: [],
      tool: "pen",
      iconType: "mountain",
      color: "#000000",
      lineWidth: 2,
    });

    await vi.waitFor(() => {
      expect(writeProjectFile).toHaveBeenCalledTimes(1);
    });

    writeResolvers.shift()?.({ success: true, data: { path: "C:\\Workspace\\Novel.luie" } });
    await vi.waitFor(() => {
      expect(writeProjectFile).toHaveBeenCalledTimes(2);
    });

    writeResolvers.shift()?.({ success: true, data: { path: "c:/Workspace/Novel.luie" } });
    await Promise.all([firstSave, secondSave]);
    expect(warn).not.toHaveBeenCalled();
  });
});
