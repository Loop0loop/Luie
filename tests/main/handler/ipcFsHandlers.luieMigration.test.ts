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

  it("replaces existing .luie entry content on writeProjectFile", async () => {
    const { registerFsIPCHandlers } = await import(
      "../../../src/main/handler/system/ipcFsHandlers.js"
    );
    registerFsIPCHandlers(mocked.logger);

    tempRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "luie-fs-replace-entry-"));
    const workspaceDir = path.join(tempRoot, "workspace");
    await fsp.mkdir(workspaceDir, { recursive: true });
    mocked.openDialogPath = workspaceDir;

    const selectDirectoryHandler = mocked.handlerMap.get(IPC_CHANNELS.FS_SELECT_DIRECTORY);
    expect(selectDirectoryHandler).toBeDefined();
    const selectResponse = (await selectDirectoryHandler?.({})) as { success: boolean };
    expect(selectResponse.success).toBe(true);

    const packagePath = path.join(workspaceDir, "replace-entry.luie");
    const createLuieHandler = mocked.handlerMap.get(IPC_CHANNELS.FS_CREATE_LUIE_PACKAGE);
    expect(createLuieHandler).toBeDefined();
    const createResponse = (await createLuieHandler?.(
      {},
      packagePath,
      { projectId: "project-1", title: "Replace Entry" },
    )) as { success: boolean };
    expect(createResponse.success).toBe(true);

    const writeProjectFileHandler = mocked.handlerMap.get(IPC_CHANNELS.FS_WRITE_PROJECT_FILE);
    expect(writeProjectFileHandler).toBeDefined();
    const nextSynopsis = { synopsis: "updated value", status: "working" };
    const writeResponse = (await writeProjectFileHandler?.(
      {},
      packagePath,
      "world/synopsis.json",
      JSON.stringify(nextSynopsis, null, 2),
    )) as { success: boolean };
    expect(writeResponse.success).toBe(true);

    const readLuieEntryHandler = mocked.handlerMap.get(IPC_CHANNELS.FS_READ_LUIE_ENTRY);
    expect(readLuieEntryHandler).toBeDefined();
    const readResponse = (await readLuieEntryHandler?.(
      {},
      packagePath,
      "world/synopsis.json",
    )) as { success: boolean; data: string | null };
    expect(readResponse.success).toBe(true);
    expect(readResponse.data).not.toBeNull();
    expect(JSON.parse(readResponse.data ?? "{}")).toMatchObject(nextSynopsis);
  });

  it("restores existing .luie file when createLuiePackage fails", async () => {
    const { registerFsIPCHandlers } = await import(
      "../../../src/main/handler/system/ipcFsHandlers.js"
    );
    registerFsIPCHandlers(mocked.logger);

    tempRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "luie-fs-create-rollback-"));
    const workspaceDir = path.join(tempRoot, "workspace");
    await fsp.mkdir(workspaceDir, { recursive: true });
    mocked.openDialogPath = workspaceDir;

    const selectDirectoryHandler = mocked.handlerMap.get(IPC_CHANNELS.FS_SELECT_DIRECTORY);
    expect(selectDirectoryHandler).toBeDefined();
    const selectResponse = (await selectDirectoryHandler?.({})) as { success: boolean };
    expect(selectResponse.success).toBe(true);

    const packagePath = path.join(workspaceDir, "existing-package.luie");
    const legacyContent = "LEGACY_PACKAGE_CONTENT";
    await fsp.writeFile(packagePath, legacyContent, "utf-8");

    const createLuieHandler = mocked.handlerMap.get(IPC_CHANNELS.FS_CREATE_LUIE_PACKAGE);
    expect(createLuieHandler).toBeDefined();
    const createResponse = (await createLuieHandler?.(
      {},
      packagePath,
      { invalid: 1n },
    )) as { success: boolean };
    expect(createResponse.success).toBe(false);

    const restoredContent = await fsp.readFile(packagePath, "utf-8");
    expect(restoredContent).toBe(legacyContent);
  });

  it("writes FS_SAVE_PROJECT output as zip .luie and preserves legacy content", async () => {
    const { registerFsIPCHandlers } = await import(
      "../../../src/main/handler/system/ipcFsHandlers.js"
    );
    registerFsIPCHandlers(mocked.logger);

    tempRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "luie-fs-save-project-"));
    const workspaceDir = path.join(tempRoot, "workspace");
    await fsp.mkdir(workspaceDir, { recursive: true });
    mocked.openDialogPath = workspaceDir;

    const selectDirectoryHandler = mocked.handlerMap.get(IPC_CHANNELS.FS_SELECT_DIRECTORY);
    expect(selectDirectoryHandler).toBeDefined();
    const selectResponse = (await selectDirectoryHandler?.({})) as { success: boolean };
    expect(selectResponse.success).toBe(true);

    const saveProjectHandler = mocked.handlerMap.get(IPC_CHANNELS.FS_SAVE_PROJECT);
    expect(saveProjectHandler).toBeDefined();
    const saveResponse = (await saveProjectHandler?.(
      {},
      "Legacy Save Project",
      workspaceDir,
      "LEGACY_CONTENT_BODY",
    )) as {
      success: boolean;
      data?: { path: string; projectDir: string };
    };
    expect(saveResponse.success).toBe(true);
    const savedPath = saveResponse.data?.path;
    expect(savedPath).toBeTruthy();

    const fileBuffer = await fsp.readFile(savedPath ?? "");
    expect(fileBuffer[0]).toBe(0x50); // 'P'
    expect(fileBuffer[1]).toBe(0x4b); // 'K'

    const readLuieEntryHandler = mocked.handlerMap.get(IPC_CHANNELS.FS_READ_LUIE_ENTRY);
    expect(readLuieEntryHandler).toBeDefined();

    const metaResponse = (await readLuieEntryHandler?.(
      {},
      savedPath,
      "meta.json",
    )) as { success: boolean; data: string | null };
    expect(metaResponse.success).toBe(true);
    expect(metaResponse.data).not.toBeNull();
    expect(JSON.parse(metaResponse.data ?? "{}")).toMatchObject({
      title: "Legacy Save Project",
    });

    const legacyContentResponse = (await readLuieEntryHandler?.(
      {},
      savedPath,
      "manuscript/legacy-import.md",
    )) as { success: boolean; data: string | null };
    expect(legacyContentResponse.success).toBe(true);
    expect(legacyContentResponse.data).toBe("LEGACY_CONTENT_BODY");
  });
});
