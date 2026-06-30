// TEST_LEVEL: UNIT_MOCKED
// PROVES: project package IPC paths pass through approved FS boundary before service calls
// DOES_NOT_PROVE: Electron ipcMain registration

import { beforeEach, describe, expect, it, vi } from "vitest";
import { IPC_CHANNELS } from "../../../src/shared/ipc/channels.js";

const mocked = vi.hoisted(() => {
  const handlers: Array<{
    channel: string;
    handler: (...args: unknown[]) => unknown;
  }> = [];
  const assertAllowedFsPath = vi.fn(async (value: string) => `/safe${value}`);
  return {
    assertAllowedFsPath,
    handlers,
    registerIpcHandlers: vi.fn((_logger, nextHandlers) => {
      handlers.push(...nextHandlers);
    }),
  };
});

vi.mock("../../../src/main/handler/core/ipcRegistrar.js", () => ({
  registerIpcHandlers: mocked.registerIpcHandlers,
}));

vi.mock("../../../src/main/handler/system/fs/fsPathApproval.js", () => ({
  assertAllowedFsPath: mocked.assertAllowedFsPath,
}));

describe("project IPC package path approval", () => {
  beforeEach(() => {
    mocked.handlers.length = 0;
    vi.clearAllMocks();
  });

  it("checks .luie open paths before calling the project service", async () => {
    const { registerProjectIPCHandlers } = await import(
      "../../../src/main/handler/project/ipcProjectHandlers.js"
    );
    const projectService = {
      createProject: vi.fn(),
      openLuieProject: vi.fn(async () => ({ ok: true })),
      attachProjectPackage: vi.fn(),
      materializeProjectPackage: vi.fn(),
      getProject: vi.fn(),
      getAllProjects: vi.fn(),
      updateProject: vi.fn(),
      deleteProject: vi.fn(),
      removeProjectFromList: vi.fn(),
      markProjectOpened: vi.fn(),
    };

    registerProjectIPCHandlers({ error: vi.fn(), warn: vi.fn() }, projectService);
    const openHandler = mocked.handlers.find(
      (handler) => handler.channel === IPC_CHANNELS.PROJECT_OPEN_LUIE,
    );

    await openHandler?.handler("/tmp/project.luie");

    expect(mocked.assertAllowedFsPath).toHaveBeenCalledWith(
      "/tmp/project.luie",
      {
        fieldName: "packagePath",
        mode: "read",
        permission: "package",
      },
    );
    expect(projectService.openLuieProject).toHaveBeenCalledWith(
      "/safe/tmp/project.luie",
    );
  });
});
