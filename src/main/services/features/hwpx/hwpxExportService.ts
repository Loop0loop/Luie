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
import {
  convertHtmlToParagraphs,
  escapeXml,
  htmlToText,
  parseXmlAttributes,
} from "./hwpx/hwpxParagraphBuilder.js";
import {
  HWPX_CONTAINER_RDF_XML,
  HWPX_CONTAINER_XML,
  HWPX_HEADER_XML,
  HWPX_MANIFEST_XML,
  HWPX_SETTINGS_XML,
  HWPX_VERSION_XML,
  buildHwpxContentHpfXml,
} from "./hwpx/hwpxStaticXmlTemplates.js";

const MM_TO_HWPUNIT = 283.465;

const PAPER_SIZES_HWPUNIT = {
  A4: { width: 59528, height: 84188 },
  Letter: { width: 61200, height: 79200 },
  B5: { width: 49937, height: 70866 },
} as const;

const DEFAULT_TEMPLATE_PATHS = [
  path.join(process.cwd(), "resources", "blank.hwpx"),
  path.join(process.cwd(), "assets", "blank.hwpx"),
  path.join(process.cwd(), "static", "blank.hwpx"),
];

export class HwpxExportService {
  async exportHwpx(options: Required<ExportOptions>): Promise<ExportResult> {
    try {
      const paperSize = PAPER_SIZES_HWPUNIT[options.paperSize];
      const outputPath = this.ensureHwpxExtension(options.outputPath);
      const templatePath = await this.resolveTemplatePath(options.referenceHwpxPath);

      let buffer: Buffer;
      let message: string;

      if (templatePath) {
        buffer = await this.buildFromTemplate(options, paperSize, templatePath);
        message = "HWPX 파일이 생성되었습니다. (템플릿 기반)";
      } else {
        buffer = await this.buildFromScratch(options, paperSize);
        message = "HWPX 파일이 생성되었습니다.";
      }

      await fs.writeFile(outputPath, buffer);

      return {
        success: true,
        filePath: outputPath,
        message,
      };
    } catch (error) {
      throw new ServiceError(
        ErrorCode.FS_WRITE_FAILED,
        `HWPX export failed: ${error instanceof Error ? error.message : "Unknown error"}`,
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
          `Reference HWPX not found: ${referenceHwpxPath}`,
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
    templatePath: string,
  ): Promise<Buffer> {
    const templateBuffer = await fs.readFile(templatePath);
    const zip = await JSZip.loadAsync(templateBuffer);

    const headerXml = await zip.file("Contents/header.xml")?.async("string");
    const sectionXml = await zip.file("Contents/section0.xml")?.async("string");
    const contentHpfXml = await zip.file("Contents/content.hpf")?.async("string");

    if (!headerXml || !sectionXml || !contentHpfXml) {
      throw new ServiceError(
        ErrorCode.FS_READ_FAILED,
        "Template is missing required HWPX files (header.xml, section0.xml, content.hpf).",
      );
    }

    zip.file("Contents/header.xml", this.updateHeaderXml(headerXml, options));
    zip.file("Contents/section0.xml", this.updateSectionXml(sectionXml, options, paperSize));
    zip.file("Contents/content.hpf", this.updateContentHpf(contentHpfXml, options));

    return zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });
  }

  private updateHeaderXml(xml: string, options: Required<ExportOptions>): string {
    const title = escapeXml(options.title);
    const date = new Date().toISOString();

    return xml
      .replace(/<hh:title>[\s\S]*?<\/hh:title>/, `<hh:title>${title}</hh:title>`)
      .replace(/<hh:date>[\s\S]*?<\/hh:date>/, `<hh:date>${date}</hh:date>`);
  }

  private updateContentHpf(xml: string, options: Required<ExportOptions>): string {
    const title = escapeXml(options.title);
    const date = new Date().toISOString();

    return xml
      .replace(/<dc:title>[\s\S]*?<\/dc:title>/, `<dc:title>${title}</dc:title>`)
      .replace(/<dc:date>[\s\S]*?<\/dc:date>/, `<dc:date>${date}</dc:date>`);
  }

  private updateSectionXml(
    xml: string,
    options: Required<ExportOptions>,
    paperSize: { width: number; height: number },
  ): string {
    const marginLeft = Math.round(options.marginLeft * MM_TO_HWPUNIT);
    const marginRight = Math.round(options.marginRight * MM_TO_HWPUNIT);
    const marginTop = Math.round(options.marginTop * MM_TO_HWPUNIT);
    const marginBottom = Math.round(options.marginBottom * MM_TO_HWPUNIT);
    const paragraphs = convertHtmlToParagraphs(options.content, options.title);

    let updated = xml;

    updated = updated.replace(/<hc:width>\d+<\/hc:width>/, `<hc:width>${paperSize.width}</hc:width>`);
    updated = updated.replace(
      /<hc:height>\d+<\/hc:height>/,
      `<hc:height>${paperSize.height}</hc:height>`,
    );

    const pageMarginMatch = updated.match(/<hc:pageMargin\b[^>]*\/>/);
    if (pageMarginMatch) {
      const attrs = parseXmlAttributes(pageMarginMatch[0]);
      const header = attrs.header ?? "4252";
      const footer = attrs.footer ?? "4252";
      const gutter = attrs.gutter ?? "0";

      const marginTag = `<hc:pageMargin left="${marginLeft}" right="${marginRight}" top="${marginTop}" bottom="${marginBottom}" header="${header}" footer="${footer}" gutter="${gutter}"/>`;
      updated = updated.replace(pageMarginMatch[0], marginTag);
    }

    if (/<\/hs:secPr>/.test(updated)) {
      updated = updated.replace(/(<\/hs:secPr>)([\s\S]*?)(<\/hs:sec>)/, `$1\n${paragraphs}\n$3`);
    }

    return updated;
  }

  private async buildFromScratch(
    options: Required<ExportOptions>,
    paperSize: { width: number; height: number },
  ): Promise<Buffer> {
    const zip = new JSZip();

    zip.file("mimetype", "application/hwp+zip", { compression: "STORE" });
    zip.file("version.xml", this.generateVersion(), { compression: "DEFLATE" });
    zip.file("META-INF/manifest.xml", this.generateManifestXml(), { compression: "DEFLATE" });
    zip.file("META-INF/container.xml", this.generateContainerXml(), { compression: "DEFLATE" });
    zip.file("META-INF/container.rdf", this.generateContainerRdf(), { compression: "DEFLATE" });
    zip.file("settings.xml", this.generateSettings(), { compression: "DEFLATE" });
    zip.file("Preview/PrvText.txt", this.generatePreviewText(options), { compression: "DEFLATE" });
    zip.file("Contents/header.xml", this.generateHeader(options), { compression: "DEFLATE" });
    zip.file("Contents/section0.xml", this.generateSection(options, paperSize), {
      compression: "DEFLATE",
    });
    zip.file("Contents/content.hpf", this.generateContentHpf(options), { compression: "DEFLATE" });

    return zip.generateAsync({
      type: "nodebuffer",
    });
  }

  private generateVersion(): string {
    return this.compressXml(HWPX_VERSION_XML);
  }

  private compressXml(xml: string): string {
    return xml.replace(/>\s+</g, "><").replace(/\?>\s+</g, "?><").trim();
  }

  private generateManifestXml(): string {
    return this.compressXml(HWPX_MANIFEST_XML);
  }

  private generateContainerXml(): string {
    return this.compressXml(HWPX_CONTAINER_XML);
  }

  private generateContainerRdf(): string {
    return this.compressXml(HWPX_CONTAINER_RDF_XML);
  }

  private generatePreviewText(options: Required<ExportOptions>): string {
    const textContent = htmlToText(options.content);
    return `${options.title}\n\n${textContent.substring(0, 500)}`;
  }

  private generateSettings(): string {
    return this.compressXml(HWPX_SETTINGS_XML);
  }

  private generateHeader(_options: Required<ExportOptions>): string {
    return this.compressXml(HWPX_HEADER_XML);
  }

  private generateSection(
    options: Required<ExportOptions>,
    paperSize: { width: number; height: number },
  ): string {
    const marginLeft = Math.round(options.marginLeft * MM_TO_HWPUNIT);
    const marginRight = Math.round(options.marginRight * MM_TO_HWPUNIT);
    const marginTop = Math.round(options.marginTop * MM_TO_HWPUNIT);
    const marginBottom = Math.round(options.marginBottom * MM_TO_HWPUNIT);

    const secPrXml = `<hp:secPr id="" textDirection="HORIZONTAL" textVerticalWidthHead="0" spaceColumns="283" tabStop="4252">
      <hp:grid lineGrid="0" charGrid="0" wonggojiFormat="0"/>
      <hp:startNum pageStartsOn="BOTH" page="0" pic="0" tbl="0" equation="0"/>
      <hp:visibility hideFirstHeader="0" hideFirstFooter="0" hideFirstMasterPage="0" border="0" fill="0" hideFirstPageNum="0" hideFirstEmptyLine="0" showLineNumber="0"/>
      <hp:lineNumberShape restartType="0" countBy="0" distance="0"/>
      <hp:pagePr landscape="NARROWLY" width="${paperSize.width}" height="${paperSize.height}" gutterType="LEFT_ONLY">
        <hp:margin header="4252" footer="4252" gutter="0" left="${marginLeft}" right="${marginRight}" top="${marginTop}" bottom="${marginBottom}"/>
      </hp:pagePr>
      <hp:footNotePr><hp:autoNumFormat type="DIGIT"/><hp:newNum type="CONTINUOUS"/></hp:footNotePr>
      <hp:endNotePr><hp:autoNumFormat type="DIGIT"/><hp:newNum type="CONTINUOUS"/></hp:endNotePr>
      <hp:pageBorderFill type="BOTH" borderFillIDRef="1" textBorder="0" headerInside="0" footerInside="0">
        <hp:offset left="1417" right="1417" top="1417" bottom="1417"/>
      </hp:pageBorderFill>
    </hp:secPr>`;

    const paragraphs = convertHtmlToParagraphs(options.content, options.title, secPrXml);

    const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<hs:sec xmlns:hs="http://www.hancom.co.kr/hwpml/2011/section" 
        xmlns:hp="http://www.hancom.co.kr/hwpml/2011/paragraph" 
        xmlns:hc="http://www.hancom.co.kr/hwpml/2011/core" 
        id="0" textDirection="HORIZONTAL" textVerticalWidthHead="0" spaceColumns="283" tabStop="4252">
${paragraphs}
</hs:sec>`;
    return this.compressXml(xml);
  }

  private generateContentHpf(_options: Required<ExportOptions>): string {
    const date = new Date().toISOString();
    return this.compressXml(buildHwpxContentHpfXml(date));
  }
}

export const hwpxExportService = new HwpxExportService();
