import { describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  quit: vi.fn(),
  showMessageBox: vi.fn(async () => ({ response: 0 })),
  flushCritical: vi.fn(async () => undefined),
  isMain: vi.fn((id: number) => id === 1),
  reload: vi.fn(),
}));

vi.mock("electron", () => ({
  app: { quit: mocked.quit },
  dialog: { showMessageBox: mocked.showMessageBox },
}));

vi.mock("../../../src/main/app/windows/index.js", () => ({
  windowManager: {
    isMainWindowWebContentsId: mocked.isMain,
    getMainWindow: vi.fn(() => ({
      isDestroyed: vi.fn(() => false),
      reload: mocked.reload,
    })),
  },
}));

vi.mock("../../../src/main/domains/manuscript/index.js", () => ({
  autoSaveManager: { flushCritical: mocked.flushCritical },
}));

import { handleRendererCrash } from "../../../src/main/lifecycle/app-ready/rendererCrashRecovery.js";

const logger = {
  error: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
};

describe("renderer crash recovery", () => {
  it("ignores secondary renderer crashes", async () => {
    await handleRendererCrash(logger, { id: 2 } as never, false);

    expect(mocked.flushCritical).not.toHaveBeenCalled();
    expect(mocked.showMessageBox).not.toHaveBeenCalled();
  });

  it("reloads the existing main window after an emergency save", async () => {
    await handleRendererCrash(logger, { id: 1 } as never, false);

    expect(mocked.flushCritical).toHaveBeenCalledOnce();
    expect(mocked.reload).toHaveBeenCalledOnce();
    expect(mocked.quit).not.toHaveBeenCalled();
  });
});
