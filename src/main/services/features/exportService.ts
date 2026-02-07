/**
 * Export Service
 * DOCX와 HWPX 형식으로 문서를 내보내는 서비스
 */

import { promises as fs } from "fs";
import path from "path";
import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel } from "docx";
import JSZip from "jszip";
import sanitize from "sanitize-filename";
import { ServiceError } from "../../utils/serviceError.js";
import { ErrorCode } from "../../../shared/constants/errorCode.js";

// ============================================================================
// Types
// ============================================================================

export interface ExportOptions {
  projectId: string;
  chapterId: string;
  title: string;
  content: string; // HTML content from TipTap editor
  format: "DOCX" | "HWPX";
  
  // Page settings
  paperSize?: "A4" | "Letter" | "B5";
  marginTop?: number; // mm
  marginBottom?: number; // mm
  marginLeft?: number; // mm
  marginRight?: number; // mm

  
  // Typography
  fontFamily?: string;
  fontSize?: number; // pt
  lineHeight?: string; // "100%", "160%", "180%", "200%"
  
  // Page numbers
  showPageNumbers?: boolean;
  startPageNumber?: number;
  
  // Output
  outputPath?: string; // If not provided, will prompt user
}

export interface ExportResult {
  success: boolean;
  filePath?: string;
  error?: string;
}

// ============================================================================
// Constants
// ============================================================================

// Unit conversion
const MM_TO_TWIPS = 56.7; // 1mm = 56.7 twips
const PT_TO_HALF_PT = 2; // 10pt = 20 half-points

// Paper sizes in mm
const PAPER_SIZES = {
  A4: { width: 210, height: 297 },
  Letter: { width: 216, height: 279 },
  B5: { width: 176, height: 250 },
} as const;

// Default settings (한글 스타일)
const DEFAULT_SETTINGS = {
  paperSize: "A4" as const,
  marginTop: 20, // mm
  marginBottom: 15, // mm
  marginLeft: 20, // mm
  marginRight: 20, // mm
  fontFamily: "Batang",
  fontSize: 10, // pt
  lineHeight: "160%",
  showPageNumbers: true,
  startPageNumber: 1,
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * mm를 Twips로 변환
 */
function mmToTwips(mm: number): number {
  return Math.round(mm * MM_TO_TWIPS);
}

/**
 * pt를 Half-points로 변환
 */
function ptToHalfPt(pt: number): number {
  return pt * PT_TO_HALF_PT;
}

/**
 * 줄간격 문자열을 docx LineRule 값으로 변환
 */
function parseLineHeight(lineHeight: string): number {
  const percentage = parseInt(lineHeight.replace("%", ""));
  // docx에서 lineSpacing 값은 240 = 100%
  return Math.round((percentage / 100) * 240);
}

/**
 * HTML을 파싱하여 Paragraph 배열로 변환
 * 간단한 파서 (향후 개선 필요)
 */
function htmlToParagraphs(html: string, options: Required<ExportOptions>): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  
  // HTML 태그 제거 및 기본 파싱
  // TipTap 에디터에서 생성된 HTML을 단순하게 파싱
  const tempDiv = html
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, "HEADING1:::$1:::")
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, "HEADING2:::$1:::")
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, "HEADING3:::$1:::")
    .replace(/<p[^>]*>(.*?)<\/p>/gi, "PARAGRAPH:::$1:::")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<strong>(.*?)<\/strong>/gi, "BOLD:::$1:::")
    .replace(/<em>(.*?)<\/em>/gi, "ITALIC:::$1:::")
    .replace(/<u>(.*?)<\/u>/gi, "UNDERLINE:::$1:::")
    .replace(/<[^>]+>/g, ""); // 나머지 태그 제거
  
  const lines = tempDiv.split(":::");
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (!line) continue;
    
    if (line === "HEADING1" && lines[i + 1]) {
      paragraphs.push(
        new Paragraph({
          text: lines[i + 1],
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { before: 240, after: 120 },
        })
      );
      i++;
    } else if (line === "HEADING2" && lines[i + 1]) {
      paragraphs.push(
        new Paragraph({
          text: lines[i + 1],
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
        })
      );
      i++;
    } else if (line === "HEADING3" && lines[i + 1]) {
      paragraphs.push(
        new Paragraph({
          text: lines[i + 1],
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 160, after: 80 },
        })
      );
      i++;
    } else if (line === "PARAGRAPH" && lines[i + 1]) {
      const text = lines[i + 1];
      const runs: TextRun[] = [];
      
      // Simple text run creation
      runs.push(
        new TextRun({
          text: text,
          font: options.fontFamily,
          size: ptToHalfPt(options.fontSize),
        })
      );
      
      paragraphs.push(
        new Paragraph({
          children: runs,
          spacing: {
            before: 0,
            after: 0,
            line: parseLineHeight(options.lineHeight),
          },
          indent: {
            firstLine: mmToTwips(3.5), // 10pt ≈ 3.5mm
          },
        })
      );
      i++;
    }
  }
  
  return paragraphs;
}

/**
 * 파일명 생성 및 안전 처리
 */
function generateSafeFilename(title: string, format: "DOCX" | "HWPX"): string {
  const extension = format === "DOCX" ? "docx" : "hwpx";
  const sanitized = sanitize(title || "Untitled");
  return `${sanitized}.${extension}`;
}

// ============================================================================
// Export Service Class
// ============================================================================

export class ExportService {
  /**
   * 문서를 DOCX 또는 HWPX로 내보내기
   */
  async export(options: ExportOptions): Promise<ExportResult> {
    try {
      // Merge with defaults
      const mergedOptions: Required<ExportOptions> = {
        ...DEFAULT_SETTINGS,
        ...options,
        marginRight: options.marginRight ?? options.marginLeft ?? DEFAULT_SETTINGS.marginLeft,
        outputPath: options.outputPath ?? "",
      };
      
      // Validate
      if (!mergedOptions.title || !mergedOptions.content) {
        throw new ServiceError(ErrorCode.VALIDATION_FAILED, "Title and content are required");
      }
      
      // Export based on format
      if (mergedOptions.format === "DOCX") {
        return await this.exportDocx(mergedOptions);
      } else if (mergedOptions.format === "HWPX") {
        return await this.exportHwpx(mergedOptions);
      } else {
        throw new ServiceError(ErrorCode.VALIDATION_FAILED, `Unsupported format: ${mergedOptions.format}`);
      }
    } catch (error) {
      console.error("[ExportService] Export failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown export error",
      };
    }
  }
  
  /**
   * DOCX 내보내기
   */
  private async exportDocx(options: Required<ExportOptions>): Promise<ExportResult> {
    try {
      const paperSize = PAPER_SIZES[options.paperSize];
      
      // Parse HTML to paragraphs
      const paragraphs = htmlToParagraphs(options.content, options);
      
      // Create document
      const doc = new Document({
        sections: [
          {
            properties: {
              page: {
                width: mmToTwips(paperSize.width),
                height: mmToTwips(paperSize.height),
                margin: {
                  top: mmToTwips(options.marginTop),
                  bottom: mmToTwips(options.marginBottom),
                  left: mmToTwips(options.marginLeft),
                  right: mmToTwips(options.marginRight),
                },
              },
            },
            children: paragraphs,
          },
        ],
      });
      
      // Generate buffer
      const buffer = await Packer.toBuffer(doc);
      
      // Determine output path
      let outputPath = options.outputPath;
      if (!outputPath) {
        // This will be handled by IPC handler (file dialog)
        throw new ServiceError(ErrorCode.VALIDATION_FAILED, "Output path is required");
      }
      
      // Ensure proper extension
      if (!outputPath.endsWith(".docx")) {
        outputPath = outputPath.replace(/\.[^.]*$/, "") + ".docx";
      }
      
      // Write file
      await fs.writeFile(outputPath, buffer);
      
      return {
        success: true,
        filePath: outputPath,
      };
    } catch (error) {
      throw new ServiceError(
        ErrorCode.FS_WRITE_FAILED,
        `DOCX export failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
  
  /**
   * HWPX 내보내기
   * TODO: 템플릿 기반 구현 필요
   */
  private async exportHwpx(options: Required<ExportOptions>): Promise<ExportResult> {
    try {
      // HWPX는 향후 구현 예정
      // blank.hwpx 템플릿 사용하여 XML 생성 및 ZIP 패키징
      throw new ServiceError(ErrorCode.NOT_IMPLEMENTED, "HWPX export is not yet implemented");
    } catch (error) {
      throw new ServiceError(
        ErrorCode.FS_WRITE_FAILED,
        `HWPX export failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
}

// Singleton instance
export const exportService = new ExportService();
