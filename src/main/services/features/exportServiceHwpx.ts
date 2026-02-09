/**
 * HWPX Export Service (BETA)
 * 한글 문서(.hwpx) 내보내기 전용 서비스
 * 
 * 참고: pypandoc-hwpx 구조 기반
 * https://github.com/msjang/pypandoc-hwpx
 */

import { promises as fs } from "fs";
import path from "path";
import JSZip from "jszip";
import { ServiceError } from "../../utils/serviceError.js";
import { ErrorCode } from "../../../shared/constants/errorCode.js";
import type { ExportOptions, ExportResult } from "./exportService.js";

// ============================================================================
// Constants
// ============================================================================

const MM_TO_HWPUNIT = 283.465; // 1mm = 283.465 HWPUNIT

const PAPER_SIZES_HWPUNIT = {
  A4: { width: 59528, height: 84188 },      // 210mm x 297mm
  Letter: { width: 61200, height: 79200 }, // 216mm x 280mm
  B5: { width: 49937, height: 70866 },     // 176mm x 250mm
} as const;

const DEFAULT_TEMPLATE_PATHS = [
  path.join(process.cwd(), "resources", "blank.hwpx"),
  path.join(process.cwd(), "assets", "blank.hwpx"),
  path.join(process.cwd(), "static", "blank.hwpx"),
];

// ============================================================================
// HWPX Export Service Class
// ============================================================================

export class HwpxExportService {
  /**
   * HWPX 내보내기 (BETA)
   */
  async exportHwpx(options: Required<ExportOptions>): Promise<ExportResult> {
    try {
      const paperSize = PAPER_SIZES_HWPUNIT[options.paperSize];
      const outputPath = this.ensureHwpxExtension(options.outputPath);
      const templatePath = await this.resolveTemplatePath(options.referenceHwpxPath);

      if (!templatePath) {
        return {
          success: false,
          error: "HWPX 템플릿 파일이 필요합니다",
          message: `[HWPX 템플릿 필요]

HWPX 파일을 생성하려면 blank.hwpx 템플릿이 필요합니다.

템플릿 파일 위치:
• resources/blank.hwpx
• assets/blank.hwpx  
• static/blank.hwpx

템플릿을 설정하면 정상적으로 HWPX 파일을 생성할 수 있습니다.
또는 DOCX 형식을 사용해주세요.`,
        };
      }

      const buffer = await this.buildFromTemplate(options, paperSize, templatePath);
      await fs.writeFile(outputPath, buffer);

      return {
        success: true,
        filePath: outputPath,
        message: "HWPX 파일이 생성되었습니다.\n\n템플릿 기반으로 생성되어 호환성이 보장됩니다.",
      };
    } catch (error) {
      throw new ServiceError(
        ErrorCode.FS_WRITE_FAILED,
        `HWPX export failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  private ensureHwpxExtension(outputPath?: string): string {
    if (!outputPath) {
      throw new ServiceError(ErrorCode.VALIDATION_FAILED, "Output path is required");
    }

    if (!outputPath.endsWith(".hwpx")) {
      return outputPath.replace(/\.[^.]*$/, "") + ".hwpx";
    }

    return outputPath;
  }

  private async resolveTemplatePath(referenceHwpxPath?: string): Promise<string | null> {
    if (referenceHwpxPath && referenceHwpxPath.trim().length > 0) {
      try {
        await fs.access(referenceHwpxPath);
        return referenceHwpxPath;
      } catch {
        throw new ServiceError(
          ErrorCode.FS_READ_FAILED,
          `Reference HWPX not found: ${referenceHwpxPath}`
        );
      }
    }

    for (const candidate of DEFAULT_TEMPLATE_PATHS) {
      try {
        await fs.access(candidate);
        return candidate;
      } catch {
        // Try next candidate
      }
    }

    return null;
  }

  private async buildFromTemplate(
    options: Required<ExportOptions>,
    paperSize: { width: number; height: number },
    templatePath: string
  ): Promise<Buffer> {
    const templateBuffer = await fs.readFile(templatePath);
    const zip = await JSZip.loadAsync(templateBuffer);

    const headerXml = await zip.file("Contents/header.xml")?.async("string");
    const sectionXml = await zip.file("Contents/section0.xml")?.async("string");
    const contentHpfXml = await zip.file("Contents/content.hpf")?.async("string");

    if (!headerXml || !sectionXml || !contentHpfXml) {
      throw new ServiceError(
        ErrorCode.FS_READ_FAILED,
        "Template is missing required HWPX files (header.xml, section0.xml, content.hpf)."
      );
    }

    zip.file("Contents/header.xml", this.updateHeaderXml(headerXml, options));
    zip.file(
      "Contents/section0.xml",
      this.updateSectionXml(sectionXml, options, paperSize)
    );
    zip.file("Contents/content.hpf", this.updateContentHpf(contentHpfXml, options));

    return await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });
  }

  private updateHeaderXml(xml: string, options: Required<ExportOptions>): string {
    const title = this.escapeXml(options.title);
    const date = new Date().toISOString();

    return xml
      .replace(/<hh:title>[\s\S]*?<\/hh:title>/, `<hh:title>${title}</hh:title>`)
      .replace(/<hh:date>[\s\S]*?<\/hh:date>/, `<hh:date>${date}</hh:date>`);
  }

  private updateContentHpf(xml: string, options: Required<ExportOptions>): string {
    const title = this.escapeXml(options.title);
    const date = new Date().toISOString();

    return xml
      .replace(/<dc:title>[\s\S]*?<\/dc:title>/, `<dc:title>${title}</dc:title>`)
      .replace(/<dc:date>[\s\S]*?<\/dc:date>/, `<dc:date>${date}</dc:date>`);
  }

  private updateSectionXml(
    xml: string,
    options: Required<ExportOptions>,
    paperSize: { width: number; height: number }
  ): string {
    const marginLeft = Math.round(options.marginLeft * MM_TO_HWPUNIT);
    const marginRight = Math.round(options.marginRight * MM_TO_HWPUNIT);
    const marginTop = Math.round(options.marginTop * MM_TO_HWPUNIT);
    const marginBottom = Math.round(options.marginBottom * MM_TO_HWPUNIT);
    const paragraphs = this.convertHtmlToParagraphs(options.content, options.title);

    let updated = xml;

    updated = updated.replace(
      /<hc:width>\d+<\/hc:width>/,
      `<hc:width>${paperSize.width}</hc:width>`
    );
    updated = updated.replace(
      /<hc:height>\d+<\/hc:height>/,
      `<hc:height>${paperSize.height}</hc:height>`
    );

    const pageMarginMatch = updated.match(/<hc:pageMargin\b[^>]*\/>/);
    if (pageMarginMatch) {
      const attrs = this.parseXmlAttributes(pageMarginMatch[0]);
      const header = attrs.header ?? "4252";
      const footer = attrs.footer ?? "4252";
      const gutter = attrs.gutter ?? "0";

      const marginTag = `<hc:pageMargin left="${marginLeft}" right="${marginRight}" top="${marginTop}" bottom="${marginBottom}" header="${header}" footer="${footer}" gutter="${gutter}"/>`;
      updated = updated.replace(pageMarginMatch[0], marginTag);
    }

    const secPrClose = /<\/hs:secPr>/;
    if (secPrClose.test(updated)) {
      updated = updated.replace(
        /(<\/hs:secPr>)([\s\S]*?)(<\/hs:sec>)/,
        `$1\n${paragraphs}\n$3`
      );
    }

    return updated;
  }

  private parseXmlAttributes(tag: string): Record<string, string> {
    const attrs: Record<string, string> = {};
    const matches = tag.matchAll(/(\w+)="([^"]*)"/g);
    for (const match of matches) {
      attrs[match[1]] = match[2];
    }
    return attrs;
  }

  /**
   * HTML을 HWPX paragraph XML로 변환
   */
  private convertHtmlToParagraphs(html: string, title: string): string {
    const paragraphs: string[] = [];
    
    // 제목 추가
    paragraphs.push(`  <hp:p paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">
    <hp:run charPrIDRef="0">
      <hp:t>${this.escapeXml(title)}</hp:t>
    </hp:run>
  </hp:p>`);
    
    // HTML 파싱 (간단한 구현)
    const textContent = this.htmlToText(html);
    const lines = textContent.split("\n").filter(line => line.trim());
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      paragraphs.push(`  <hp:p paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">
    <hp:run charPrIDRef="0">
      <hp:t>${this.escapeXml(line)}</hp:t>
    </hp:run>
  </hp:p>`);
    }
    
    return paragraphs.join("\n");
  }

  /**
   * HTML을 플레인 텍스트로 변환
   */
  private htmlToText(html: string): string {
    return html
      .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, "\n$1\n")
      .replace(/<p[^>]*>(.*?)<\/p>/gi, "$1\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<li[^>]*>(.*?)<\/li>/gi, "• $1\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/\n\n+/g, "\n\n")
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
export const hwpxExportService = new HwpxExportService();
