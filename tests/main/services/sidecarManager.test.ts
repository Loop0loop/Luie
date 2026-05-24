import { EventEmitter } from "node:events";
import { beforeEach, describe, expect, it, vi } from "vitest";

const spawnMock = vi.hoisted(() => vi.fn());
const createServerMock = vi.hoisted(() => vi.fn());

vi.mock("node:child_process", async () => {
  const actual = await vi.importActual<typeof import("node:child_process")>("node:child_process");
  return {
    ...actual,
    spawn: spawnMock,
  };
});

vi.mock("node:net", async () => {
  const actual = await vi.importActual<typeof import("node:net")>("node:net");
  return {
    ...actual,
    default: {
      ...actual.default,
      createServer: createServerMock,
    },
    createServer: createServerMock,
  };
});

class FakeChildProcess extends EventEmitter {
  stderr = new EventEmitter();
  kill = vi.fn((signal?: string) => {
    if (signal === "SIGTERM") {
      queueMicrotask(() => this.emit("exit", 0));
    }
    return true;
  });
}

import { SidecarManager } from "../../../src/main/services/llm/sidecarManager.js";

describe("SidecarManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn(async () => new Response("ok", { status: 200 })));
    createServerMock.mockImplementation(() => ({
      listen: (_port: number, _host: string, callback: () => void) => {
        callback();
      },
      address: () => ({ port: 32123 }),
      close: (callback: () => void) => {
        callback();
      },
      on: vi.fn(),
    }));
  });

  it("spawns llama-server with localhost HTTP args", async () => {
    const proc = new FakeChildProcess();
    spawnMock.mockReturnValue(proc);
    const manager = new SidecarManager();

    const baseUrl = await manager.ensureStarted("/tmp/bin/llama-server", "/tmp/model.gguf", {
      gpuLayers: -1,
      contextSize: 4096,
    });

    expect(baseUrl).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);
    expect(spawnMock).toHaveBeenCalledTimes(1);
    expect(spawnMock.mock.calls[0]?.[0]).toBe("/tmp/bin/llama-server");
    expect(spawnMock.mock.calls[0]?.[1]).toEqual(expect.arrayContaining([
      "--model",
      "/tmp/model.gguf",
      "--host",
      "127.0.0.1",
      "--ctx-size",
      "4096",
      "--n-gpu-layers",
      "-1",
    ]));

    await manager.stop();
    expect(proc.kill).toHaveBeenCalledWith("SIGTERM");
  });

  it("joins concurrent starts into a single spawned process", async () => {
    const proc = new FakeChildProcess();
    spawnMock.mockReturnValue(proc);
    const manager = new SidecarManager();

    const [first, second] = await Promise.all([
      manager.ensureStarted("/tmp/bin/llama-server", "/tmp/model.gguf"),
      manager.ensureStarted("/tmp/bin/llama-server", "/tmp/model.gguf"),
    ]);

    expect(first).toBe(second);
    expect(spawnMock).toHaveBeenCalledTimes(1);
    await manager.stop();
  });
});
