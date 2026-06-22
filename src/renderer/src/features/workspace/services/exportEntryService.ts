import type { TFunction } from "i18next";
import { api } from "@shared/api";
import type { IPCResponse } from "@shared/ipc";
import type { ToastType } from "@shared/ui/ToastContext";

type ToastFn = (message: string, type: ToastType, duration?: number) => void;

type LoggerLike = {
  info: (message: string, data?: unknown) => Promise<IPCResponse<unknown>>;
  warn: (message: string, data?: unknown) => Promise<IPCResponse<unknown>>;
  error: (message: string, data?: unknown) => Promise<IPCResponse<unknown>>;
};

type ExportEntryDeps = {
  openExportWindow: (chapterId: string) => Promise<IPCResponse<boolean>>;
  logger: LoggerLike;
};

type OpenQuickExportOptions = {
  chapterId?: string | null;
  t: TFunction;
  toast: ToastFn;
  deps?: Partial<ExportEntryDeps>;
};

const DEFAULT_DEPS: ExportEntryDeps = {
  openExportWindow: (chapterId) => api.window.openExport(chapterId),
  logger: api.logger,
};

const isValidChapterId = (chapterId: unknown): chapterId is string =>
  typeof chapterId === "string" &&
  chapterId.trim().length > 0 &&
  chapterId !== "undefined" &&
  chapterId !== "null";

export async function openQuickExportEntry({
  chapterId,
  t,
  toast,
  deps,
}: OpenQuickExportOptions): Promise<boolean> {
  const resolved = {
    ...DEFAULT_DEPS,
    ...deps,
  };

  if (!isValidChapterId(chapterId)) {
    await resolved.logger.warn("Quick export blocked: invalid chapter id", {
      code: "EXPORT_NO_CHAPTER",
      chapterId,
    });
    toast(t("editor.errors.exportNoChapter"), "error");
    return false;
  }

  try {
    const response = await resolved.openExportWindow(chapterId);
    if (!response.success || response.data !== true) {
      await resolved.logger.error("Quick export failed to open window", {
        code: "EXPORT_OPEN_FAILED",
        chapterId,
        error: response.error,
        data: response.data,
      });
      toast(response.error?.message ?? t("editor.errors.exportOpenFailed"), "error");
      return false;
    }

    await resolved.logger.info("Quick export window opened", {
      code: "EXPORT_OPENED",
      chapterId,
    });
    return true;
  } catch (error) {
    await resolved.logger.error("Quick export threw unexpected error", {
      code: "EXPORT_OPEN_EXCEPTION",
      chapterId,
      error,
    });
    toast(t("editor.errors.exportOpenFailed"), "error");
    return false;
  }
}
