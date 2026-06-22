import { describe, expect, it, vi } from "vitest";
import type { TFunction } from "i18next";
import { openQuickExportEntry } from "../../../src/renderer/src/features/workspace/services/exportEntryService.js";

const t = ((key: string) => key) as unknown as TFunction;

const createDeps = () => {
  const openExportWindow = vi.fn();
  const logger = {
    info: vi.fn().mockResolvedValue({ success: true }),
    warn: vi.fn().mockResolvedValue({ success: true }),
    error: vi.fn().mockResolvedValue({ success: true }),
  };
  const toast = vi.fn();

  return {
    openExportWindow,
    logger,
    toast,
  };
};

describe("openQuickExportEntry", () => {
  it("shows toast and blocks export when chapter id is invalid", async () => {
    const deps = createDeps();

    const result = await openQuickExportEntry({
      chapterId: undefined,
      t,
      toast: deps.toast,
      deps: {
        openExportWindow: deps.openExportWindow,
        logger: deps.logger,
      },
    });

    expect(result).toBe(false);
    expect(deps.openExportWindow).not.toHaveBeenCalled();
    expect(deps.logger.warn).toHaveBeenCalledWith(
      "Quick export blocked: invalid chapter id",
      expect.objectContaining({ code: "EXPORT_NO_CHAPTER" }),
    );
    expect(deps.toast).toHaveBeenCalledWith("editor.errors.exportNoChapter", "error");
  });

  it("opens export window successfully with valid chapter id", async () => {
    const deps = createDeps();
    deps.openExportWindow.mockResolvedValue({ success: true, data: true });

    const result = await openQuickExportEntry({
      chapterId: "00000000-0000-4000-8000-000000000001",
      t,
      toast: deps.toast,
      deps: {
        openExportWindow: deps.openExportWindow,
        logger: deps.logger,
      },
    });

    expect(result).toBe(true);
    expect(deps.openExportWindow).toHaveBeenCalledTimes(1);
    expect(deps.toast).not.toHaveBeenCalled();
    expect(deps.logger.info).toHaveBeenCalledWith(
      "Quick export window opened",
      expect.objectContaining({ code: "EXPORT_OPENED" }),
    );
  });

  it("shows response error message when export open fails", async () => {
    const deps = createDeps();
    deps.openExportWindow.mockResolvedValue({
      success: false,
      error: {
        code: "E_EXPORT",
        message: "failed from ipc",
      },
    });

    const result = await openQuickExportEntry({
      chapterId: "00000000-0000-4000-8000-000000000001",
      t,
      toast: deps.toast,
      deps: {
        openExportWindow: deps.openExportWindow,
        logger: deps.logger,
      },
    });

    expect(result).toBe(false);
    expect(deps.logger.error).toHaveBeenCalledWith(
      "Quick export failed to open window",
      expect.objectContaining({ code: "EXPORT_OPEN_FAILED" }),
    );
    expect(deps.toast).toHaveBeenCalledWith("failed from ipc", "error");
  });

  it("falls back to translated message when export call throws", async () => {
    const deps = createDeps();
    deps.openExportWindow.mockRejectedValue(new Error("IPC_DOWN"));

    const result = await openQuickExportEntry({
      chapterId: "00000000-0000-4000-8000-000000000001",
      t,
      toast: deps.toast,
      deps: {
        openExportWindow: deps.openExportWindow,
        logger: deps.logger,
      },
    });

    expect(result).toBe(false);
    expect(deps.logger.error).toHaveBeenCalledWith(
      "Quick export threw unexpected error",
      expect.objectContaining({ code: "EXPORT_OPEN_EXCEPTION" }),
    );
    expect(deps.toast).toHaveBeenCalledWith("editor.errors.exportOpenFailed", "error");
  });
});
