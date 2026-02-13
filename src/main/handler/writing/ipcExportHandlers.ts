/**
 * Export IPC Handlers
 * 문서 내보내기 IPC 통신 처리
 */

import { dialog } from "electron";
import { IPC_CHANNELS } from "../../../shared/ipc/channels.js";
import { exportService, type ExportOptions, type ExportResult } from "../../services/features/exportService.js";
import sanitize from "sanitize-filename";
import { exportCreateArgsSchema } from "../../../shared/schemas/index.js";
import { registerIpcHandlers } from "../core/ipcRegistrar.js";
import type { LoggerLike } from "../core/types.js";
import { ServiceError } from "../../utils/serviceError.js";
import { ErrorCode } from "../../../shared/constants/errorCode.js";

/**
 * Export request payload from renderer
 */
export type ExportRequest = Omit<ExportOptions, "outputPath">;

const buildDefaultPath = (request: ExportRequest): string => {
  const extension = request.format === "DOCX" ? "docx" : "hwpx";
  const sanitizedTitle = sanitize(request.title || "Untitled");
  return `${sanitizedTitle}.${extension}`;
};

const buildDialogFilters = (format: ExportRequest["format"]) => {
  const extension = format === "DOCX" ? "docx" : "hwpx";
  return [
    {
      name: format === "DOCX" ? "Word Document" : "Hangul Document",
      extensions: [extension],
    },
    { name: "All Files", extensions: ["*"] },
  ];
};

async function handleExportCreate(request: ExportRequest): Promise<ExportResult> {
  const result = await dialog.showSaveDialog({
    title: "문서 내보내기",
    defaultPath: buildDefaultPath(request),
    filters: buildDialogFilters(request.format),
    properties: ["createDirectory", "showOverwriteConfirmation"],
  });

  if (result.canceled || !result.filePath) {
    return {
      success: false,
      error: "Export cancelled by user",
    };
  }

  const exportOptions: ExportOptions = {
    ...request,
    outputPath: result.filePath,
  };

  const exportResult = await exportService.export(exportOptions);
  if (!exportResult.success && exportResult.error) {
    throw new ServiceError(
      ErrorCode.FS_WRITE_FAILED,
      exportResult.error,
      { format: request.format, chapterId: request.chapterId },
    );
  }

  return exportResult;
}

/**
 * Register export IPC handlers
 */
export function registerExportHandlers(logger: LoggerLike): void {
  registerIpcHandlers(logger, [
    {
      channel: IPC_CHANNELS.EXPORT_CREATE,
      logTag: "EXPORT_CREATE",
      failMessage: "Failed to export document",
      argsSchema: exportCreateArgsSchema,
      handler: (request: ExportRequest) => handleExportCreate(request),
    },
  ]);
}
