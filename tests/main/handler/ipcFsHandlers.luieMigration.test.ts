import os from "node:os";
import path from "node:path";
import * as fsp from "node:fs/promises";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IPC_CHANNELS } from "../../../src/shared/ipc/channels.js";
import { ErrorCode } from "../../../src/shared/constants/errorCode.js";

const mocked = vi.hoisted(() => {
  const handlerMap = new Map<
    string,
    (event: unknown, ...args: unknown[]) => Promise<unknown>
  >();

  return {
    handlerMap,
    openDialogPath: "",
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    },
  };
});

vi.mock("electron", () => ({
  app: {
    getPath: vi.fn(() => process.cwd()),
  },
  dialog: {
    showOpenDialog: vi.fn(async () => ({
      canceled: false,
      filePaths: mocked.openDialogPath ? [mocked.openDialogPath] : [],
    })),
    showSaveDialog: vi.fn(async () => ({
      canceled: true,
      filePath: undefined,
    })),
  },
  ipcMain: {
    handle: vi.fn(
      (
        channel: string,
        handler: (event: unknown, ...args: unknown[]) => Promise<unknown>,
      ) => {
        mocked.handlerMap.set(channel, handler);
      },
    ),
  },
}));

describe("ipcFsHandlers legacy .luie migration", () => {
  let tempRoot = "";

  beforeEach(() => {
    mocked.handlerMap.clear();
    mocked.openDialogPath = "";
  });

  afterEach(async () => {
    if (tempRoot) {
      await fsp.rm(tempRoot, { recursive: true, force: true });
      tempRoot = "";
    }
  });

  it("skips symlink entries when migrating directory package to zip", async () => {
    const { registerFsIPCHandlers } = await import(
      "../../../src/main/handler/system/ipcFsHandlers.js"
    );
    registerFsIPCHandlers(mocked.logger);

    tempRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "luie-fs-migration-"));
    const workspaceDir = path.join(tempRoot, "workspace");
    await fsp.mkdir(workspaceDir, { recursive: true });
    mocked.openDialogPath = workspaceDir;

    const packageDir = path.join(workspaceDir, "legacy-package.luie");
    const manuscriptDir = path.join(packageDir, "manuscript");
    await fsp.mkdir(manuscriptDir, { recursive: true });
    await fsp.writeFile(path.join(manuscriptDir, "chapter-1.md"), "# kept", "utf-8");

    const outsideFile = path.join(tempRoot, "outside-secret.md");
    await fsp.writeFile(outsideFile, "SECRET_OUTSIDE", "utf-8");

    const symlinkPath = path.join(manuscriptDir, "link.md");
    try {
      await fsp.symlink(outsideFile, symlinkPath);
    } catch (error) {
      const fsError = error as NodeJS.ErrnoException;
      if (fsError?.code === "EPERM" || fsError?.code === "EACCES") {
        return;
      }
      throw error;
    }

    const selectDirectoryHandler = mocked.handlerMap.get(IPC_CHANNELS.FS_SELECT_DIRECTORY);
    expect(selectDirectoryHandler).toBeDefined();
    const selectResponse = (await selectDirectoryHandler?.({})) as { success: boolean };
    expect(selectResponse.success).toBe(true);

    const writeProjectFileHandler = mocked.handlerMap.get(IPC_CHANNELS.FS_WRITE_PROJECT_FILE);
    expect(writeProjectFileHandler).toBeDefined();
    const writeResponse = (await writeProjectFileHandler?.(
      {},
      packageDir,
      "world/synopsis.json",
      JSON.stringify({ synopsis: "ok" }),
    )) as { success: boolean };
    expect(writeResponse.success).toBe(true);

    const readLuieEntryHandler = mocked.handlerMap.get(IPC_CHANNELS.FS_READ_LUIE_ENTRY);
    expect(readLuieEntryHandler).toBeDefined();

    const chapterResponse = (await readLuieEntryHandler?.(
      {},
      packageDir,
      "manuscript/chapter-1.md",
    )) as { success: boolean; data: string | null };
    expect(chapterResponse.success).toBe(true);
    expect(chapterResponse.data).toBe("# kept");

    const symlinkResponse = (await readLuieEntryHandler?.(
      {},
      packageDir,
      "manuscript/link.md",
    )) as { success: boolean; data: string | null };
    expect(symlinkResponse.success).toBe(true);
    expect(symlinkResponse.data).toBeNull();
  });

  it("fails writeProjectFile when target .luie package is missing", async () => {
    const { registerFsIPCHandlers } = await import(
      "../../../src/main/handler/system/ipcFsHandlers.js"
    );
    registerFsIPCHandlers(mocked.logger);

    tempRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "luie-fs-missing-package-"));
    const workspaceDir = path.join(tempRoot, "workspace");
    await fsp.mkdir(workspaceDir, { recursive: true });
    mocked.openDialogPath = workspaceDir;

    const selectDirectoryHandler = mocked.handlerMap.get(IPC_CHANNELS.FS_SELECT_DIRECTORY);
    expect(selectDirectoryHandler).toBeDefined();
    const selectResponse = (await selectDirectoryHandler?.({})) as { success: boolean };
    expect(selectResponse.success).toBe(true);

    const missingPackagePath = path.join(workspaceDir, "missing-package.luie");
    const writeProjectFileHandler = mocked.handlerMap.get(IPC_CHANNELS.FS_WRITE_PROJECT_FILE);
    expect(writeProjectFileHandler).toBeDefined();
    const writeResponse = (await writeProjectFileHandler?.(
      {},
      missingPackagePath,
      "world/synopsis.json",
      JSON.stringify({ synopsis: "should fail" }),
    )) as {
      success: boolean;
      error?: { code?: string; message?: string };
    };

    expect(writeResponse.success).toBe(false);
    expect(writeResponse.error?.code).toBe(ErrorCode.FS_WRITE_FAILED);
    await expect(fsp.access(missingPackagePath)).rejects.toThrow();
  });
});
