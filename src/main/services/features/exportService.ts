/**
 * Export Service
 * DOCX와 HWPX 형식으로 문서를 내보내는 서비스
 */

import { promises as fs } from "fs";
import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel } from "docx";
import JSZip from "jszip";
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
          text,
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
                size: {
                  width: mmToTwips(paperSize.width),
                  height: mmToTwips(paperSize.height),
                },
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
   */
  private async exportHwpx(options: Required<ExportOptions>): Promise<ExportResult> {
    try {
      const zip = new JSZip();
      const paperSize = PAPER_SIZES[options.paperSize];
      
      // 1. [Content_Types].xml
      const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Override PartName="/Contents/header.xml" ContentType="application/vnd.hancom.hwpx.header+xml"/>
  <Override PartName="/Contents/section0.xml" ContentType="application/vnd.hancom.hwpx.section+xml"/>
</Types>`;
      zip.file("[Content_Types].xml", contentTypes);
      
      // 2. _rels/.rels
      const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://www.hancom.co.kr/hwpml/2011/document/header" Target="Contents/header.xml"/>
</Relationships>`;
      zip.file("_rels/.rels", rels);
      
      // 3. Contents/header.xml
      const headerXml = this.generateHwpxHeader(options, paperSize);
      zip.file("Contents/header.xml", headerXml);
      
      // 4. Contents/section0.xml
      const sectionXml = this.generateHwpxSection(options);
      zip.file("Contents/section0.xml", sectionXml);
      
      // Generate ZIP buffer
      const buffer = await zip.generateAsync({ type: "nodebuffer" });
      
      // Determine output path
      let outputPath = options.outputPath;
      if (!outputPath) {
        throw new ServiceError(ErrorCode.VALIDATION_FAILED, "Output path is required");
      }
      
      // Ensure proper extension
      if (!outputPath.endsWith(".hwpx")) {
        outputPath = outputPath.replace(/\.[^.]*$/, "") + ".hwpx";
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
        `HWPX export failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
  
  /**
   * HWPX header.xml 생성
   */
  private generateHwpxHeader(options: Required<ExportOptions>, _paperSize: { width: number; height: number }): string {
    // 기본 한글 문서 헤더
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<HEAD xmlns="http://www.hancom.co.kr/hwpml/2011/head">
  <DOCSUMMARY>
    <TITLE>${this.escapeXml(options.title)}</TITLE>
  </DOCSUMMARY>
  <LAYOUTCOMPAT>
    <TARGETPROGRAM>HWP2014</TARGETPROGRAM>
  </LAYOUTCOMPAT>
  <BEGINNUMBER page="1" footnote="1" endnote="1" pic="1" tbl="1" equation="1"/>
</HEAD>`;
  }
  
  /**
   * HWPX section0.xml 생성
   */
  private generateHwpxSection(options: Required<ExportOptions>): string {
    // HTML을 텍스트로 변환 (간단한 파싱)
    const textContent = this.htmlToText(options.content);
    const paragraphs = textContent.split("\n").filter(p => p.trim());
    
    let paragraphsXml = "";
    for (const para of paragraphs) {
      if (!para.trim()) continue;
      
      paragraphsXml += `
    <P>
      <TEXT charshape="0">${this.escapeXml(para)}</TEXT>
    </P>`;
    }
    
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<SECTION xmlns="http://www.hancom.co.kr/hwpml/2011/section">
  <SECDEF>
    <PAGESZ width="${Math.round(options.paperSize === 'A4' ? 59528 : 61200)}" height="${Math.round(options.paperSize === 'A4' ? 84188 : 79200)}" landscape="0"/>
    <PAGEMARGIN left="${Math.round(mmToTwips(options.marginLeft))}" right="${Math.round(mmToTwips(options.marginRight))}" top="${Math.round(mmToTwips(options.marginTop))}" bottom="${Math.round(mmToTwips(options.marginBottom))}" header="4252" footer="4252" gutter="0"/>
  </SECDEF>
  <CHARSHAPE id="0" height="1000" textcolor="0" shadecolor="4294967295" useFontSpace="0" useKerning="0" symMark="0" borderFillId="0">
    <FONTID hangul="함초롬바탕" latin="Batang" hanja="함초롬바탕" japanese="함초롬바탕" other="함초롬바탕" symbol="함초롬바탕" user="함초롬바탕"/>
  </CHARSHAPE>
  <PARASHAPE id="0" align="justify" heading="0" level="0" tabdef="0" condense="0" fontlineheight="0" snaptoGrid="1" lineGrid="0" vertalign="baseline" autoSpaceEAsianEng="1" autoSpaceEAsianNum="1">
    <MARGIN left="0" right="0" indent="0" prev="0" next="0"/>
    <LINESPC type="percent" value="160"/>
  </PARASHAPE>${paragraphsXml}
</SECTION>`;
  }
  
  /**
   * HTML을 플레인 텍스트로 변환
   */
  private htmlToText(html: string): string {
    return html
      .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, "$1\n")
      .replace(/<p[^>]*>(.*?)<\/p>/gi, "$1\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .trim();
  }
  
  /**
   * XML 특수문자 이스케이프
   */
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }
}

// Singleton instance
export const exportService = new ExportService();
