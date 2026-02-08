/**
 * Export IPC Handlers
 * 문서 내보내기 IPC 통신 처리
 */

import { ipcMain, dialog } from "electron";
import { IPC_CHANNELS } from "../../../shared/ipc/channels.js";
import type { IPCResponse } from "../../../shared/ipc/response.js";
import { exportService, type ExportOptions, type ExportResult } from "../../services/features/exportService.js";
import sanitize from "sanitize-filename";

/**
 * Export request payload from renderer
 */
export interface ExportRequest {
  projectId: string;
  chapterId: string;
  title: string;
  content: string; // HTML from TipTap
  format: "DOCX" | "HWPX";
  
  // Optional settings (will use defaults if not provided)
  paperSize?: "A4" | "Letter" | "B5";
  marginTop?: number;
  marginBottom?: number;
  marginLeft?: number;
  marginRight?: number;
  fontFamily?: string;
  fontSize?: number;
  lineHeight?: string;
  showPageNumbers?: boolean;
  startPageNumber?: number;
}

/**
 * Export 창에서 내보내기 실행
 */
async function handleExportCreate(
  _event: Electron.IpcMainInvokeEvent,
  request: ExportRequest
): Promise<IPCResponse<ExportResult>> {
  try {
    
    // Show save dialog
    const extension = request.format === "DOCX" ? "docx" : "hwpx";
    const filters = [
      {
        name: request.format === "DOCX" ? "Word Document" : "Hangul Document",
        extensions: [extension],
      },
      { name: "All Files", extensions: ["*"] },
    ];
    
    const sanitizedTitle = sanitize(request.title || "Untitled");
    const defaultPath = `${sanitizedTitle}.${extension}`;
    
    const result = await dialog.showSaveDialog({
      title: "문서 내보내기",
      defaultPath,
      filters,
      properties: ["createDirectory", "showOverwriteConfirmation"],
    });
    
    if (result.canceled || !result.filePath) {
      return {
        success: false,
        data: {
          success: false,
          error: "Export cancelled by user",
        },
      };
    }
    
    // Build export options
    const exportOptions: ExportOptions = {
      projectId: request.projectId,
      chapterId: request.chapterId,
      title: request.title,
      content: request.content,
      format: request.format,
      outputPath: result.filePath,
      
      // Optional settings
      paperSize: request.paperSize,
      marginTop: request.marginTop,
      marginBottom: request.marginBottom,
      marginLeft: request.marginLeft,
      marginRight: request.marginRight,
      fontFamily: request.fontFamily,
      fontSize: request.fontSize,
      lineHeight: request.lineHeight,
      showPageNumbers: request.showPageNumbers,
      startPageNumber: request.startPageNumber,
    };
    
    // Execute export
    const exportResult = await exportService.export(exportOptions);
    
    return {
      success: true,
      data: exportResult,
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: "EXPORT_FAILED",
        message: error instanceof Error ? error.message : "Unknown export error",
      },
    };
  }
}

/**
 * Register export IPC handlers
 */
export function registerExportHandlers() {
  ipcMain.handle(IPC_CHANNELS.EXPORT_CREATE, handleExportCreate);
}
