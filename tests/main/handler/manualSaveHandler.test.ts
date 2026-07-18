// TEST_LEVEL: UNIT_MOCKED
// PROVES: manual save drains main autosaves before forcing the project checkpoint

import { beforeEach, describe, expect, it, vi } from "vitest";
import { IPC_CHANNELS } from "../../../src/shared/ipc/channels.js";

const mocked = vi.hoisted(() => ({
  handlers: [] as Array<{
    channel: string;
    handler: (...args: string[]) => unknown;
  }>,
  registerIpcHandlers: vi.fn((_logger, handlers) => {
    mocked.handlers.push(...handlers);
  }),
}));

vi.mock("../../../src/main/handler/core/ipcRegistrar.js", () => ({
  registerIpcHandlers: mocked.registerIpcHandlers,
}));

import { registerAutoSaveIPCHandlers } from "../../../src/main/handler/writing/ipcAutoSaveHandlers.js";

describe("MANUAL_SAVE handler", () => {
  beforeEach(() => {
    mocked.handlers.length = 0;
    vi.clearAllMocks();
  });

  it("flushes autosaves before exporting the requested project", async () => {
    const calls: string[] = [];
    const autoSaveManager = {
      triggerSave: vi.fn(async () => undefined),
      flushAll: vi.fn(async () => {
        calls.push("autosave");
      }),
    };
    const projectService = {
      exportProjectPackageNow: vi.fn(async () => {
        calls.push("checkpoint");
        return true;
      }),
    };
    registerAutoSaveIPCHandlers(
      { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
      autoSaveManager,
      projectService,
    );
    const handler = mocked.handlers.find(
      (candidate) => candidate.channel === IPC_CHANNELS.MANUAL_SAVE,
    );

    await expect(handler?.handler("project-1")).resolves.toEqual({
      success: true,
      exported: true,
    });

    expect(calls).toEqual(["autosave", "checkpoint"]);
    expect(projectService.exportProjectPackageNow).toHaveBeenCalledWith(
      "project-1",
      "manual-save",
    );
  });

  it("rejects when the project checkpoint returns false", async () => {
    const autoSaveManager = {
      triggerSave: vi.fn(async () => undefined),
      flushAll: vi.fn(async () => undefined),
    };
    const projectService = {
      exportProjectPackageNow: vi.fn(async () => false),
    };
    registerAutoSaveIPCHandlers(
      { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
      autoSaveManager,
      projectService,
    );
    const handler = mocked.handlers.find(
      (candidate) => candidate.channel === IPC_CHANNELS.MANUAL_SAVE,
    );

    await expect(handler?.handler("project-1")).rejects.toThrow(
      "Failed to export project package",
    );
  });

  it("preserves a thrown project checkpoint failure", async () => {
    const failure = new Error("checkpoint failed");
    const autoSaveManager = {
      triggerSave: vi.fn(async () => undefined),
      flushAll: vi.fn(async () => undefined),
    };
    const projectService = {
      exportProjectPackageNow: vi.fn(async () => {
        throw failure;
      }),
    };
    registerAutoSaveIPCHandlers(
      { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
      autoSaveManager,
      projectService,
    );
    const handler = mocked.handlers.find(
      (candidate) => candidate.channel === IPC_CHANNELS.MANUAL_SAVE,
    );

    await expect(handler?.handler("project-1")).rejects.toBe(failure);
  });
});
