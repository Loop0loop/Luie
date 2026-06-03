import { beforeEach, describe, expect, it, vi } from "vitest";

const startSidecarMock = vi.hoisted(() => vi.fn());
const stopSidecarMock = vi.hoisted(() => vi.fn());
const rmMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock("../../../src/main/services/features/utility/utilityProcessBridge.js", () => {
  return {
    utilityProcessBridge: {
      startSidecar: startSidecarMock,
      stopSidecar: stopSidecarMock,
    },
  };
});

vi.mock("node:fs/promises", async () => {
  const actual = await vi.importActual("node:fs/promises") as Record<string, unknown>;
  return {
    ...actual,
    rm: rmMock,
  };
});

const setLocalLlmSettingsMock = vi.fn();
const getLocalLlmSettingsMock = vi.fn().mockReturnValue({
  enabled: true,
  binaryPath: "/tmp/bin/llama-server",
});

vi.mock("../../../src/main/manager/settings/index.js", () => {
  return {
    settingsManager: {
      getLocalLlmSettings: getLocalLlmSettingsMock,
      setLocalLlmSettings: setLocalLlmSettingsMock,
    },
  };
});

vi.mock("../../manager/settings/index.js", () => {
  return {
    settingsManager: {
      getLocalLlmSettings: getLocalLlmSettingsMock,
      setLocalLlmSettings: setLocalLlmSettingsMock,
    },
  };
});

import { SidecarManager } from "../../../src/main/services/llm/sidecarManager.js";

describe("SidecarManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    startSidecarMock.mockResolvedValue("http://127.0.0.1:32123");
    stopSidecarMock.mockResolvedValue(undefined);
  });

  it("spawns llama-server via utilityProcessBridge proxy", async () => {
    const manager = new SidecarManager();

    const baseUrl = await manager.ensureStarted("/tmp/bin/llama-server", "/tmp/model.gguf", {
      gpuLayers: -1,
      contextSize: 4096,
    });

    expect(baseUrl).toBe("http://127.0.0.1:32123");
    expect(startSidecarMock).toHaveBeenCalledTimes(1);
    expect(startSidecarMock).toHaveBeenCalledWith("/tmp/bin/llama-server", "/tmp/model.gguf", expect.objectContaining({
      gpuLayers: -1,
      contextSize: 4096,
    }));

    await manager.stop();
    expect(stopSidecarMock).toHaveBeenCalledTimes(1);
  });

  it("joins concurrent starts into a single proxy call", async () => {
    const manager = new SidecarManager();

    const [first, second] = await Promise.all([
      manager.ensureStarted("/tmp/bin/llama-server", "/tmp/model.gguf"),
      manager.ensureStarted("/tmp/bin/llama-server", "/tmp/model.gguf"),
    ]);

    expect(first).toBe(second);
    expect(first).toBe("http://127.0.0.1:32123");
    expect(startSidecarMock).toHaveBeenCalledTimes(1);
    await manager.stop();
  });

  it("handles spawn failure gracefully by clearing configuration and deleting binaries", async () => {
    const spawnError = new Error("spawn ENOENT");
    (spawnError as unknown as { code: string }).code = "ENOENT";
    startSidecarMock.mockRejectedValue(spawnError);

    const manager = new SidecarManager();
    vi.spyOn(manager, "getBinDir").mockReturnValue("/tmp/corrupted-bin");

    await expect(manager.ensureStarted("/tmp/bin/llama-server", "/tmp/model.gguf")).rejects.toThrow("spawn ENOENT");

    expect(setLocalLlmSettingsMock).toHaveBeenCalledWith(expect.objectContaining({
      enabled: false,
      binaryPath: undefined,
    }));
    
    expect(rmMock).toHaveBeenCalledWith("/tmp/corrupted-bin", { recursive: true, force: true });
  });
});
