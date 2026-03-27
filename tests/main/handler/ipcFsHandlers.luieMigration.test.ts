// TEST_LEVEL: HANDLER_INTEGRATION
// PROVES: IPC handler behavior for SQLite-only .luie operations and explicit legacy rejection
// DOES_NOT_PROVE: full Electron app runtime or renderer interaction

import os from "node:os";
import path from "node:path";
import * as fsp from "node:fs/promises";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IPC_CHANNELS } from "../../../src/shared/ipc/channels.js";
import { ErrorCode } from "../../../src/shared/constants/errorCode.js";
import {
  LUIE_PACKAGE_CONTAINER_DIR,
  LUIE_PACKAGE_FORMAT,
  LUIE_PACKAGE_VERSION,
} from "../../../src/shared/constants/index.js";
import {
  probeLuieContainer,
  readLuieContainerEntry,
} from "../../../src/main/services/io/luieContainer.js";
import { makeMixedNarrativeText } from "../luieFixtures.js";

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

describe("ipcFsHandlers sqlite-only .luie behavior", () => {
  let tempRoot = "";

  const registerFsHandlers = async () => {
    const { registerFsIPCHandlers } = await import(
      "../../../src/main/handler/system/ipcFsHandlers.js"
    );
    registerFsIPCHandlers(mocked.logger);
  };

  const prepareWorkspace = async (prefix: string): Promise<string> => {
    await registerFsHandlers();

    tempRoot = await fsp.mkdtemp(path.join(os.tmpdir(), prefix));
    const workspaceDir = path.join(tempRoot, "workspace");
    await fsp.mkdir(workspaceDir, { recursive: true });
    mocked.openDialogPath = workspaceDir;

    const selectDirectoryHandler = mocked.handlerMap.get(
      IPC_CHANNELS.FS_SELECT_DIRECTORY,
    );
    expect(selectDirectoryHandler).toBeDefined();
    const selectResponse = (await selectDirectoryHandler?.({})) as {
      success: boolean;
    };
    expect(selectResponse.success).toBe(true);

    return workspaceDir;
  };

  afterEach(async () => {
    if (tempRoot) {
      await fsp.rm(tempRoot, { recursive: true, force: true });
      tempRoot = "";
    }
    mocked.handlerMap.clear();
    mocked.openDialogPath = "";
  });

  beforeEach(() => {
    mocked.handlerMap.clear();
    mocked.openDialogPath = "";
  });

  it("writes FS_SAVE_PROJECT output as sqlite-backed .luie and preserves the chapter body", async () => {
    const workspaceDir = await prepareWorkspace("luie-fs-save-project-");
    const saveProjectHandler = mocked.handlerMap.get(IPC_CHANNELS.FS_SAVE_PROJECT);
    expect(saveProjectHandler).toBeDefined();

    const content = makeMixedNarrativeText(5_000, 0);
    const saveResponse = (await saveProjectHandler?.(
      {},
      "SQLite Save Project",
      workspaceDir,
      content,
    )) as {
      success: boolean;
      data?: { path: string; projectDir: string };
    };

    expect(saveResponse.success).toBe(true);
    const savedPath = saveResponse.data?.path;
    expect(savedPath).toBeTruthy();

    const probe = await probeLuieContainer(savedPath ?? "");
    expect(probe).toMatchObject({
      exists: true,
      kind: "sqlite-v2",
      layout: "file",
    });

    const metaRaw = await readLuieContainerEntry(savedPath ?? "", "meta.json", mocked.logger);
    const chapterRaw = await readLuieContainerEntry(
      savedPath ?? "",
      "manuscript/legacy-import.md",
      mocked.logger,
    );

    expect(metaRaw).not.toBeNull();
    expect(JSON.parse(metaRaw ?? "{}")).toMatchObject({
      title: "SQLite Save Project",
      format: LUIE_PACKAGE_FORMAT,
      container: LUIE_PACKAGE_CONTAINER_DIR,
      version: LUIE_PACKAGE_VERSION,
    });
    expect(chapterRaw).toBe(content);
    await expect(fsp.access(`${savedPath}-wal`)).rejects.toMatchObject({
      code: "ENOENT",
    });
    await expect(fsp.access(`${savedPath}-shm`)).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  it("normalizes required .luie meta fields during create", async () => {
    const workspaceDir = await prepareWorkspace("luie-fs-create-");
    const createLuieHandler = mocked.handlerMap.get(
      IPC_CHANNELS.FS_CREATE_LUIE_PACKAGE,
    );
    expect(createLuieHandler).toBeDefined();

    const packagePath = path.join(workspaceDir, "normalized-meta.luie");
    const createResponse = (await createLuieHandler?.(
      {},
      packagePath,
      {
        title: "Normalized Meta",
      },
    )) as { success: boolean };

    expect(createResponse.success).toBe(true);

    const probe = await probeLuieContainer(packagePath);
    expect(probe.kind).toBe("sqlite-v2");

    const metaResponse = (await readLuieContainerEntry(
      packagePath,
      "meta.json",
      mocked.logger,
    )) as string | null;
    expect(metaResponse).not.toBeNull();
    const parsedMeta = JSON.parse(metaResponse ?? "{}") as Record<string, unknown>;
    expect(parsedMeta.format).toBe(LUIE_PACKAGE_FORMAT);
    expect(parsedMeta.container).toBe(LUIE_PACKAGE_CONTAINER_DIR);
    expect(parsedMeta.version).toBe(LUIE_PACKAGE_VERSION);
    expect(parsedMeta.title).toBe("Normalized Meta");
    expect(typeof parsedMeta.createdAt).toBe("string");
    expect(typeof parsedMeta.updatedAt).toBe("string");
  });

  it.each([
    { field: "format", meta: { format: "tampered", title: "Invalid" } },
    { field: "container", meta: { container: "tar", title: "Invalid" } },
    { field: "version", meta: { version: 999, title: "Invalid" } },
  ])("rejects invalid meta $field during create", async ({ meta }) => {
    const workspaceDir = await prepareWorkspace(`luie-fs-invalid-${String(meta)}`);
    const createLuieHandler = mocked.handlerMap.get(
      IPC_CHANNELS.FS_CREATE_LUIE_PACKAGE,
    );
    expect(createLuieHandler).toBeDefined();

    const packagePath = path.join(workspaceDir, "invalid-meta.luie");
    const response = (await createLuieHandler?.({}, packagePath, meta)) as {
      success: boolean;
      error?: { code?: string };
    };

    expect(response.success).toBe(false);
    expect(response.error?.code).toBe(ErrorCode.FS_WRITE_FAILED);
    await expect(fsp.access(packagePath)).rejects.toThrow();
  });

  it("replaces sqlite entry content on writeProjectFile", async () => {
    const workspaceDir = await prepareWorkspace("luie-fs-replace-entry-");
    const createLuieHandler = mocked.handlerMap.get(
      IPC_CHANNELS.FS_CREATE_LUIE_PACKAGE,
    );
    expect(createLuieHandler).toBeDefined();

    const packagePath = path.join(workspaceDir, "replace-entry.luie");
    const createResponse = (await createLuieHandler?.(
      {},
      packagePath,
      {
        projectId: "project-1",
        title: "Replace Entry",
      },
    )) as { success: boolean };
    expect(createResponse.success).toBe(true);

    const writeProjectFileHandler = mocked.handlerMap.get(
      IPC_CHANNELS.FS_WRITE_PROJECT_FILE,
    );
    expect(writeProjectFileHandler).toBeDefined();

    const nextSynopsis = {
      synopsis: "updated value",
      status: "working",
    };
    const writeResponse = (await writeProjectFileHandler?.(
      {},
      packagePath,
      "world/synopsis.json",
      JSON.stringify(nextSynopsis, null, 2),
    )) as { success: boolean };
    expect(writeResponse.success).toBe(true);

    const readResponse = (await readLuieContainerEntry(
      packagePath,
      "world/synopsis.json",
      mocked.logger,
    )) as string | null;
    expect(readResponse).not.toBeNull();
    expect(JSON.parse(readResponse ?? "{}")).toMatchObject(nextSynopsis);
  });

  it("fails writeProjectFile when target .luie package is missing", async () => {
    const workspaceDir = await prepareWorkspace("luie-fs-missing-package-");
    const writeProjectFileHandler = mocked.handlerMap.get(
      IPC_CHANNELS.FS_WRITE_PROJECT_FILE,
    );
    expect(writeProjectFileHandler).toBeDefined();

    const missingPackagePath = path.join(workspaceDir, "missing-package.luie");
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

  it("blocks direct .luie overwrite via FS_WRITE_FILE", async () => {
    const workspaceDir = await prepareWorkspace("luie-fs-block-direct-write-");
    const writeFileHandler = mocked.handlerMap.get(IPC_CHANNELS.FS_WRITE_FILE);
    expect(writeFileHandler).toBeDefined();

    const packagePath = path.join(workspaceDir, "blocked-direct-write.luie");
    const response = (await writeFileHandler?.({}, packagePath, "should-fail")) as {
      success: boolean;
      error?: { code?: string };
    };

    expect(response.success).toBe(false);
    expect(response.error?.code).toBe(ErrorCode.INVALID_INPUT);
    await expect(fsp.access(packagePath)).rejects.toThrow();
  });

  it("preserves an existing sqlite package when createLuiePackage fails", async () => {
    const workspaceDir = await prepareWorkspace("luie-fs-create-rollback-");
    const createLuieHandler = mocked.handlerMap.get(
      IPC_CHANNELS.FS_CREATE_LUIE_PACKAGE,
    );
    expect(createLuieHandler).toBeDefined();

    const packagePath = path.join(workspaceDir, "existing-package.luie");
    const validResponse = (await createLuieHandler?.(
      {},
      packagePath,
      {
        title: "Before Failure",
      },
    )) as { success: boolean };
    expect(validResponse.success).toBe(true);

    const beforeMeta = await readLuieContainerEntry(
      packagePath,
      "meta.json",
      mocked.logger,
    );
    expect(beforeMeta).not.toBeNull();

    const createResponse = (await createLuieHandler?.(
      {},
      packagePath,
      { invalid: 1n },
    )) as { success: boolean };
    expect(createResponse.success).toBe(false);

    const afterMeta = await readLuieContainerEntry(
      packagePath,
      "meta.json",
      mocked.logger,
    );
    expect(afterMeta).toBe(beforeMeta);
  });

  it("rejects legacy zip package reads explicitly", async () => {
    const workspaceDir = await prepareWorkspace("luie-fs-legacy-zip-");
    const readLuieEntryHandler = mocked.handlerMap.get(
      IPC_CHANNELS.FS_READ_LUIE_ENTRY,
    );
    expect(readLuieEntryHandler).toBeDefined();

    const packagePath = path.join(workspaceDir, "legacy-project.luie");
    await fsp.writeFile(packagePath, Buffer.from([0x50, 0x4b, 0x03, 0x04]));

    const response = (await readLuieEntryHandler?.(
      {},
      packagePath,
      "meta.json",
    )) as {
      success: boolean;
      error?: { code?: string };
    };

    expect(response.success).toBe(false);
    expect(response.error?.code).toBe(ErrorCode.LUIE_LEGACY_FORMAT_UNSUPPORTED);
  });

  it("rejects legacy directory package reads explicitly", async () => {
    const workspaceDir = await prepareWorkspace("luie-fs-legacy-dir-");
    const readLuieEntryHandler = mocked.handlerMap.get(
      IPC_CHANNELS.FS_READ_LUIE_ENTRY,
    );
    expect(readLuieEntryHandler).toBeDefined();

    const packagePath = path.join(workspaceDir, "legacy-directory.luie");
    await fsp.mkdir(path.join(packagePath, "manuscript"), { recursive: true });
    await fsp.writeFile(
      path.join(packagePath, "meta.json"),
      JSON.stringify({ title: "Legacy Dir" }, null, 2),
      "utf8",
    );

    const response = (await readLuieEntryHandler?.(
      {},
      packagePath,
      "meta.json",
    )) as {
      success: boolean;
      error?: { code?: string };
    };

    expect(response.success).toBe(false);
    expect(response.error?.code).toBe(ErrorCode.LUIE_LEGACY_FORMAT_UNSUPPORTED);
  });

  it("grants read-only permission when selecting non-.luie file", async () => {
    const workspaceDir = await prepareWorkspace("luie-fs-select-file-read-only-");
    const textFilePath = path.join(workspaceDir, "notes.txt");
    await fsp.writeFile(textFilePath, "initial", "utf-8");
    mocked.openDialogPath = textFilePath;

    const { registerFsIPCHandlers } = await import(
      "../../../src/main/handler/system/ipcFsHandlers.js"
    );
    registerFsIPCHandlers(mocked.logger);

    const selectFileHandler = mocked.handlerMap.get(IPC_CHANNELS.FS_SELECT_FILE);
    expect(selectFileHandler).toBeDefined();
    const selectResponse = (await selectFileHandler?.({}, {
      filters: [{ name: "Text", extensions: ["txt"] }],
    })) as { success: boolean; data?: string | null };
    expect(selectResponse.success).toBe(true);
    expect(selectResponse.data).toBe(textFilePath);
  });
});
