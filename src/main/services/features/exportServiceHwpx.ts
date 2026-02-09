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
   * HWPX 내보내기 (원클릭 생성)
   */
  async exportHwpx(options: Required<ExportOptions>): Promise<ExportResult> {
    try {
      const paperSize = PAPER_SIZES_HWPUNIT[options.paperSize];
      const outputPath = this.ensureHwpxExtension(options.outputPath);
      const templatePath = await this.resolveTemplatePath(options.referenceHwpxPath);

      let buffer: Buffer;
      let message: string;

      if (templatePath) {
        // 템플릿이 있으면 템플릿 기반 생성 (더 높은 호환성)
        buffer = await this.buildFromTemplate(options, paperSize, templatePath);
        message = "HWPX 파일이 생성되었습니다. (템플릿 기반)";
      } else {
        // 템플릿이 없으면 직접 생성 (원클릭)
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

  /**
   * 템플릿 없이 HWPX를 직접 생성 (원클릭)
   */
  private async buildFromScratch(
    options: Required<ExportOptions>,
    paperSize: { width: number; height: number }
  ): Promise<Buffer> {
    const zip = new JSZip();

    // 1. mimetype (MUST be first, MUST be uncompressed - OpenDocument standard)
    zip.file("mimetype", "application/hwp+zip", { compression: "STORE" });

    // 2. version.xml
    zip.file("version.xml", this.generateVersion(), { compression: "DEFLATE" });

    // 5. META-INF/manifest.xml (OpenDocument standard)
    zip.file("META-INF/manifest.xml", this.generateManifestXml(), { compression: "DEFLATE" });

    // 6. META-INF/container.xml (Required for OpenDocument)
    zip.file("META-INF/container.xml", this.generateContainerXml(), { compression: "DEFLATE" });

    // 7. META-INF/container.rdf (RDF metadata)
    zip.file("META-INF/container.rdf", this.generateContainerRdf(), { compression: "DEFLATE" });

    // 8. settings.xml
    zip.file("settings.xml", this.generateSettings(), { compression: "DEFLATE" });

    // 9. Preview/PrvText.txt (Optional but recommended)
    zip.file("Preview/PrvText.txt", this.generatePreviewText(options), { compression: "DEFLATE" });

    // 10. Contents/header.xml
    zip.file("Contents/header.xml", this.generateHeader(options), { compression: "DEFLATE" });

    // 11. Contents/section0.xml
    zip.file("Contents/section0.xml", this.generateSection(options, paperSize), { compression: "DEFLATE" });

    // 12. Contents/content.hpf
    zip.file("Contents/content.hpf", this.generateContentHpf(options), { compression: "DEFLATE" });

    return await zip.generateAsync({
      type: "nodebuffer",
      // Don't set global compression - use per-file settings above
    });
  }

  private generateVersion(): string {
    const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<hv:HCFVersion xmlns:hv="http://www.hancom.co.kr/hwpml/2011/version" tagetApplication="WORDPROCESSOR" major="5" minor="1" micro="1" buildNumber="0" os="1" xmlVersion="1.5" application="Luie" appVersion="1.0.0"/>`;
    return this.compressXml(xml);
  }

  private compressXml(xml: string): string {
    // Remove all whitespace between tags to create single-line XML like Hancom Office expects
    return xml
      .replace(/>\s+</g, '><')  // Remove whitespace between tags
      .replace(/\?>\s+</g, '?><') // Remove whitespace after XML declaration
      .trim();
  }

  private generateManifestXml(): string {
    // 작동하는 format 파일은 manifest가 비어있음 (HWPX 표준)
    const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<odf:manifest xmlns:odf="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0"/>`;
    return this.compressXml(xml);
  }

  private generateContainerXml(): string {
    const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<ocf:container xmlns:ocf="urn:oasis:names:tc:opendocument:xmlns:container" xmlns:hpf="http://www.hancom.co.kr/schema/2011/hpf">
  <ocf:rootfiles>
    <ocf:rootfile full-path="Contents/content.hpf" media-type="application/hwpml-package+xml"/>
    <ocf:rootfile full-path="Preview/PrvText.txt" media-type="text/plain"/>
    <ocf:rootfile full-path="META-INF/container.rdf" media-type="application/rdf+xml"/>
  </ocf:rootfiles>
</ocf:container>`;
    return this.compressXml(xml);
  }

  private generateContainerRdf(): string {
    const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about="">
    <ns0:hasPart xmlns:ns0="http://www.hancom.co.kr/hwpml/2016/meta/pkg#" rdf:resource="Contents/header.xml"/>
  </rdf:Description>
  <rdf:Description rdf:about="Contents/header.xml">
    <rdf:type rdf:resource="http://www.hancom.co.kr/hwpml/2016/meta/pkg#HeaderFile"/>
  </rdf:Description>
  <rdf:Description rdf:about="">
    <ns0:hasPart xmlns:ns0="http://www.hancom.co.kr/hwpml/2016/meta/pkg#" rdf:resource="Contents/section0.xml"/>
  </rdf:Description>
  <rdf:Description rdf:about="Contents/section0.xml">
    <rdf:type rdf:resource="http://www.hancom.co.kr/hwpml/2016/meta/pkg#SectionFile"/>
  </rdf:Description>
  <rdf:Description rdf:about="">
    <rdf:type rdf:resource="http://www.hancom.co.kr/hwpml/2016/meta/pkg#Document"/>
  </rdf:Description>
</rdf:RDF>`;
    return this.compressXml(xml);
  }

  private generatePreviewText(options: Required<ExportOptions>): string {
    const textContent = this.htmlToText(options.content);
    return `${options.title}\n\n${textContent.substring(0, 500)}`;
  }

  private generateSettings(): string {
    const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<ha:HWPApplicationSetting xmlns:ha="http://www.hancom.co.kr/hwpml/2011/app" xmlns:config="urn:oasis:names:tc:opendocument:xmlns:config:1.0">
  <ha:CaretPosition listIDRef="0" paraIDRef="0" pos="0"/>
</ha:HWPApplicationSetting>`;
    return this.compressXml(xml);
  }

  private generateHeader(_options: Required<ExportOptions>): string {
    const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<hh:head xmlns:ha="http://www.hancom.co.kr/hwpml/2011/app" 
         xmlns:hp="http://www.hancom.co.kr/hwpml/2011/paragraph" 
         xmlns:hp10="http://www.hancom.co.kr/hwpml/2016/paragraph" 
         xmlns:hs="http://www.hancom.co.kr/hwpml/2011/section" 
         xmlns:hc="http://www.hancom.co.kr/hwpml/2011/core" 
         xmlns:hh="http://www.hancom.co.kr/hwpml/2011/head" 
         xmlns:hhs="http://www.hancom.co.kr/hwpml/2011/history" 
         xmlns:hm="http://www.hancom.co.kr/hwpml/2011/master-page" 
         xmlns:hpf="http://www.hancom.co.kr/schema/2011/hpf" 
         xmlns:dc="http://purl.org/dc/elements/1.1/" 
         xmlns:opf="http://www.idpf.org/2007/opf/" 
         xmlns:ooxmlchart="http://www.hancom.co.kr/hwpml/2016/ooxmlchart" 
         xmlns:hwpunitchar="http://www.hancom.co.kr/hwpml/2016/HwpUnitChar" 
         xmlns:epub="http://www.idpf.org/2007/ops" 
         xmlns:config="urn:oasis:names:tc:opendocument:xmlns:config:1.0" 
         version="1.5" secCnt="1">
  <hh:beginNum page="1" footnote="1" endnote="1" pic="1" tbl="1" equation="1"/>
  
  <hh:refList>
    <hh:fontfaces itemCnt="7">
      <hh:fontface lang="HANGUL" fontCnt="2">
        <hh:font id="0" face="함초롬돋움" type="TTF" isEmbedded="0"><hh:typeInfo familyType="FCAT_GOTHIC" weight="6" proportion="4" contrast="0" strokeVariation="1" armStyle="1" letterform="1" midline="1" xHeight="1"/></hh:font>
        <hh:font id="1" face="함초롬바탕" type="TTF" isEmbedded="0"><hh:typeInfo familyType="FCAT_GOTHIC" weight="6" proportion="4" contrast="0" strokeVariation="1" armStyle="1" letterform="1" midline="1" xHeight="1"/></hh:font>
      </hh:fontface>
      <hh:fontface lang="LATIN" fontCnt="2">
        <hh:font id="0" face="함초롬돋움" type="TTF" isEmbedded="0"><hh:typeInfo familyType="FCAT_GOTHIC" weight="6" proportion="4" contrast="0" strokeVariation="1" armStyle="1" letterform="1" midline="1" xHeight="1"/></hh:font>
        <hh:font id="1" face="함초롬바탕" type="TTF" isEmbedded="0"><hh:typeInfo familyType="FCAT_GOTHIC" weight="6" proportion="4" contrast="0" strokeVariation="1" armStyle="1" letterform="1" midline="1" xHeight="1"/></hh:font>
      </hh:fontface>
      <hh:fontface lang="HANJA" fontCnt="2">
        <hh:font id="0" face="함초롬돋움" type="TTF" isEmbedded="0"><hh:typeInfo familyType="FCAT_GOTHIC" weight="6" proportion="4" contrast="0" strokeVariation="1" armStyle="1" letterform="1" midline="1" xHeight="1"/></hh:font>
        <hh:font id="1" face="함초롬바탕" type="TTF" isEmbedded="0"><hh:typeInfo familyType="FCAT_GOTHIC" weight="6" proportion="4" contrast="0" strokeVariation="1" armStyle="1" letterform="1" midline="1" xHeight="1"/></hh:font>
      </hh:fontface>
      <hh:fontface lang="JAPANESE" fontCnt="2">
        <hh:font id="0" face="함초롬돋움" type="TTF" isEmbedded="0"><hh:typeInfo familyType="FCAT_GOTHIC" weight="6" proportion="4" contrast="0" strokeVariation="1" armStyle="1" letterform="1" midline="1" xHeight="1"/></hh:font>
        <hh:font id="1" face="함초롬바탕" type="TTF" isEmbedded="0"><hh:typeInfo familyType="FCAT_GOTHIC" weight="6" proportion="4" contrast="0" strokeVariation="1" armStyle="1" letterform="1" midline="1" xHeight="1"/></hh:font>
      </hh:fontface>
      <hh:fontface lang="OTHER" fontCnt="2">
        <hh:font id="0" face="함초롬돋움" type="TTF" isEmbedded="0"><hh:typeInfo familyType="FCAT_GOTHIC" weight="6" proportion="4" contrast="0" strokeVariation="1" armStyle="1" letterform="1" midline="1" xHeight="1"/></hh:font>
        <hh:font id="1" face="함초롬바탕" type="TTF" isEmbedded="0"><hh:typeInfo familyType="FCAT_GOTHIC" weight="6" proportion="4" contrast="0" strokeVariation="1" armStyle="1" letterform="1" midline="1" xHeight="1"/></hh:font>
      </hh:fontface>
      <hh:fontface lang="SYMBOL" fontCnt="2">
        <hh:font id="0" face="함초롬돋움" type="TTF" isEmbedded="0"><hh:typeInfo familyType="FCAT_GOTHIC" weight="6" proportion="4" contrast="0" strokeVariation="1" armStyle="1" letterform="1" midline="1" xHeight="1"/></hh:font>
        <hh:font id="1" face="함초롬바탕" type="TTF" isEmbedded="0"><hh:typeInfo familyType="FCAT_GOTHIC" weight="6" proportion="4" contrast="0" strokeVariation="1" armStyle="1" letterform="1" midline="1" xHeight="1"/></hh:font>
      </hh:fontface>
      <hh:fontface lang="USER" fontCnt="2">
        <hh:font id="0" face="함초롬돋움" type="TTF" isEmbedded="0"><hh:typeInfo familyType="FCAT_GOTHIC" weight="6" proportion="4" contrast="0" strokeVariation="1" armStyle="1" letterform="1" midline="1" xHeight="1"/></hh:font>
        <hh:font id="1" face="함초롬바탕" type="TTF" isEmbedded="0"><hh:typeInfo familyType="FCAT_GOTHIC" weight="6" proportion="4" contrast="0" strokeVariation="1" armStyle="1" letterform="1" midline="1" xHeight="1"/></hh:font>
      </hh:fontface>
    </hh:fontfaces>
    <hh:borderFills itemCnt="3">
      <hh:borderFill id="1" threeD="0" shadow="0" centerLine="NONE" breakCellSeparateLine="0">
        <hh:slash type="NONE" Crooked="0" isCounter="0"/><hh:backSlash type="NONE" Crooked="0" isCounter="0"/>
        <hh:leftBorder type="NONE" width="0.1 mm" color="#000000"/><hh:rightBorder type="NONE" width="0.1 mm" color="#000000"/>
        <hh:topBorder type="NONE" width="0.1 mm" color="#000000"/><hh:bottomBorder type="NONE" width="0.1 mm" color="#000000"/>
        <hh:diagonal type="SOLID" width="0.1 mm" color="#000000"/>
      </hh:borderFill>
      <hh:borderFill id="2" threeD="0" shadow="0" centerLine="NONE" breakCellSeparateLine="0">
        <hh:slash type="NONE" Crooked="0" isCounter="0"/><hh:backSlash type="NONE" Crooked="0" isCounter="0"/>
        <hh:leftBorder type="NONE" width="0.1 mm" color="#000000"/><hh:rightBorder type="NONE" width="0.1 mm" color="#000000"/>
        <hh:topBorder type="NONE" width="0.1 mm" color="#000000"/><hh:bottomBorder type="NONE" width="0.1 mm" color="#000000"/>
        <hh:diagonal type="SOLID" width="0.1 mm" color="#000000"/>
        <hc:fillBrush><hc:winBrush faceColor="none" hatchColor="#999999" alpha="0"/></hc:fillBrush>
      </hh:borderFill>
      <hh:borderFill id="3" threeD="0" shadow="0" centerLine="NONE" breakCellSeparateLine="0">
        <hh:slash type="NONE" Crooked="0" isCounter="0"/><hh:backSlash type="NONE" Crooked="0" isCounter="0"/>
        <hh:leftBorder type="SOLID" width="0.12 mm" color="#000000"/><hh:rightBorder type="SOLID" width="0.12 mm" color="#000000"/>
        <hh:topBorder type="SOLID" width="0.12 mm" color="#000000"/><hh:bottomBorder type="SOLID" width="0.12 mm" color="#000000"/>
        <hh:diagonal type="SOLID" width="0.1 mm" color="#000000"/>
      </hh:borderFill>
    </hh:borderFills>
    <hh:charProperties itemCnt="10">
      <hh:charPr id="0" height="1000" textColor="#000000" shadeColor="none" useFontSpace="0" useKerning="0" symMark="NONE" borderFillIDRef="2">
        <hh:fontRef hangul="1" latin="1" hanja="1" japanese="1" other="1" symbol="1" user="1"/>
        <hh:ratio hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/>
        <hh:spacing hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:relSz hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/>
        <hh:offset hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:underline type="NONE" shape="SOLID" color="#000000"/>
        <hh:strikeout shape="NONE" color="#000000"/>
        <hh:outline type="NONE"/>
        <hh:shadow type="NONE" color="#C0C0C0" offsetX="10" offsetY="10"/>
      </hh:charPr>
      <hh:charPr id="1" height="1000" textColor="#000000" shadeColor="none" useFontSpace="0" useKerning="0" symMark="NONE" borderFillIDRef="2">
        <hh:fontRef hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:ratio hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/>
        <hh:spacing hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:relSz hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/>
        <hh:offset hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:underline type="NONE" shape="SOLID" color="#000000"/>
        <hh:strikeout shape="NONE" color="#000000"/>
        <hh:outline type="NONE"/>
        <hh:shadow type="NONE" color="#C0C0C0" offsetX="10" offsetY="10"/>
      </hh:charPr>
      <hh:charPr id="2" height="900" textColor="#000000" shadeColor="none" useFontSpace="0" useKerning="0" symMark="NONE" borderFillIDRef="2">
        <hh:fontRef hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:ratio hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/>
        <hh:spacing hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:relSz hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/>
        <hh:offset hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:underline type="NONE" shape="SOLID" color="#000000"/>
        <hh:strikeout shape="NONE" color="#000000"/>
        <hh:outline type="NONE"/>
        <hh:shadow type="NONE" color="#C0C0C0" offsetX="10" offsetY="10"/>
      </hh:charPr>
      <hh:charPr id="3" height="900" textColor="#000000" shadeColor="none" useFontSpace="0" useKerning="0" symMark="NONE" borderFillIDRef="2">
        <hh:fontRef hangul="1" latin="1" hanja="1" japanese="1" other="1" symbol="1" user="1"/>
        <hh:ratio hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/>
        <hh:spacing hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:relSz hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/>
        <hh:offset hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:underline type="NONE" shape="SOLID" color="#000000"/>
        <hh:strikeout shape="NONE" color="#000000"/>
        <hh:outline type="NONE"/>
        <hh:shadow type="NONE" color="#C0C0C0" offsetX="10" offsetY="10"/>
      </hh:charPr>
      <hh:charPr id="4" height="1600" textColor="#2E74B5" shadeColor="none" useFontSpace="0" useKerning="0" symMark="NONE" borderFillIDRef="2">
        <hh:fontRef hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:ratio hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/>
        <hh:spacing hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:relSz hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/>
        <hh:offset hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:underline type="NONE" shape="SOLID" color="#000000"/>
        <hh:strikeout shape="NONE" color="#000000"/>
        <hh:outline type="NONE"/>
        <hh:shadow type="NONE" color="#C0C0C0" offsetX="10" offsetY="10"/>
      </hh:charPr>
      <hh:charPr id="5" height="1100" textColor="#000000" shadeColor="none" useFontSpace="0" useKerning="0" symMark="NONE" borderFillIDRef="2">
        <hh:fontRef hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:ratio hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/>
        <hh:spacing hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:relSz hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/>
        <hh:offset hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:underline type="NONE" shape="SOLID" color="#000000"/>
        <hh:strikeout shape="NONE" color="#000000"/>
        <hh:outline type="NONE"/>
        <hh:shadow type="NONE" color="#C0C0C0" offsetX="10" offsetY="10"/>
      </hh:charPr>
      <hh:charPr id="6" height="1700" textColor="#000000" shadeColor="none" useFontSpace="0" useKerning="0" symMark="NONE" borderFillIDRef="2">
        <hh:fontRef hangul="1" latin="1" hanja="1" japanese="1" other="1" symbol="1" user="1"/>
        <hh:ratio hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/>
        <hh:spacing hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:relSz hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/>
        <hh:offset hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:underline type="NONE" shape="SOLID" color="#000000"/>
        <hh:strikeout shape="NONE" color="#000000"/>
        <hh:outline type="NONE"/>
        <hh:shadow type="NONE" color="#C0C0C0" offsetX="10" offsetY="10"/>
      </hh:charPr>
      <hh:charPr id="7" height="1100" textColor="#000000" shadeColor="none" useFontSpace="0" useKerning="0" symMark="NONE" borderFillIDRef="2">
        <hh:fontRef hangul="1" latin="1" hanja="1" japanese="1" other="1" symbol="1" user="1"/>
        <hh:ratio hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/>
        <hh:spacing hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:relSz hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/>
        <hh:offset hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:underline type="NONE" shape="SOLID" color="#000000"/>
        <hh:strikeout shape="NONE" color="#000000"/>
        <hh:outline type="NONE"/>
        <hh:shadow type="NONE" color="#C0C0C0" offsetX="10" offsetY="10"/>
      </hh:charPr>
      <hh:charPr id="8" height="1600" textColor="#000000" shadeColor="none" useFontSpace="0" useKerning="0" symMark="NONE" borderFillIDRef="2">
        <hh:fontRef hangul="1" latin="1" hanja="1" japanese="1" other="1" symbol="1" user="1"/>
        <hh:ratio hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/>
        <hh:spacing hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:relSz hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/>
        <hh:offset hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:bold/><hh:underline type="NONE" shape="SOLID" color="#000000"/>
        <hh:strikeout shape="NONE" color="#000000"/>
        <hh:outline type="NONE"/>
        <hh:shadow type="NONE" color="#C0C0C0" offsetX="10" offsetY="10"/>
      </hh:charPr>
      <hh:charPr id="9" height="1400" textColor="#000000" shadeColor="none" useFontSpace="0" useKerning="0" symMark="NONE" borderFillIDRef="2">
        <hh:fontRef hangul="1" latin="1" hanja="1" japanese="1" other="1" symbol="1" user="1"/>
        <hh:ratio hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/>
        <hh:spacing hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:relSz hangul="100" latin="100" hanja="100" japanese="100" other="100" symbol="100" user="100"/>
        <hh:offset hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/>
        <hh:underline type="NONE" shape="SOLID" color="#000000"/>
        <hh:strikeout shape="NONE" color="#000000"/>
        <hh:outline type="NONE"/>
        <hh:shadow type="NONE" color="#C0C0C0" offsetX="10" offsetY="10"/>
      </hh:charPr>
    </hh:charProperties>
    <hh:tabProperties itemCnt="3">
      <hh:tabPr id="0" autoTabLeft="0" autoTabRight="0"/>
      <hh:tabPr id="1" autoTabLeft="1" autoTabRight="0"/>
      <hh:tabPr id="2" autoTabLeft="0" autoTabRight="1"/>
    </hh:tabProperties>
    <hh:numberings itemCnt="1">
      <hh:numbering id="1" start="0">
        <hh:paraHead start="1" level="1" align="LEFT" useInstWidth="1" autoIndent="1" widthAdjust="0" textOffsetType="PERCENT" textOffset="50" numFormat="DIGIT" charPrIDRef="4294967295" checkable="0">^1.</hh:paraHead>
        <hh:paraHead start="1" level="2" align="LEFT" useInstWidth="1" autoIndent="1" widthAdjust="0" textOffsetType="PERCENT" textOffset="50" numFormat="HANGUL_SYLLABLE" charPrIDRef="4294967295" checkable="0">^2.</hh:paraHead>
        <hh:paraHead start="1" level="3" align="LEFT" useInstWidth="1" autoIndent="1" widthAdjust="0" textOffsetType="PERCENT" textOffset="50" numFormat="DIGIT" charPrIDRef="4294967295" checkable="0">^3)</hh:paraHead>
        <hh:paraHead start="1" level="4" align="LEFT" useInstWidth="1" autoIndent="1" widthAdjust="0" textOffsetType="PERCENT" textOffset="50" numFormat="HANGUL_SYLLABLE" charPrIDRef="4294967295" checkable="0">^4)</hh:paraHead>
        <hh:paraHead start="1" level="5" align="LEFT" useInstWidth="1" autoIndent="1" widthAdjust="0" textOffsetType="PERCENT" textOffset="50" numFormat="DIGIT" charPrIDRef="4294967295" checkable="0">(^5)</hh:paraHead>
        <hh:paraHead start="1" level="6" align="LEFT" useInstWidth="1" autoIndent="1" widthAdjust="0" textOffsetType="PERCENT" textOffset="50" numFormat="HANGUL_SYLLABLE" charPrIDRef="4294967295" checkable="0">(^6)</hh:paraHead>
        <hh:paraHead start="1" level="7" align="LEFT" useInstWidth="1" autoIndent="1" widthAdjust="0" textOffsetType="PERCENT" textOffset="50" numFormat="CIRCLED_DIGIT" charPrIDRef="4294967295" checkable="1">^7</hh:paraHead>
        <hh:paraHead start="1" level="8" align="LEFT" useInstWidth="1" autoIndent="1" widthAdjust="0" textOffsetType="PERCENT" textOffset="50" numFormat="CIRCLED_HANGUL_SYLLABLE" charPrIDRef="4294967295" checkable="1">^8</hh:paraHead>
        <hh:paraHead start="1" level="9" align="LEFT" useInstWidth="1" autoIndent="1" widthAdjust="0" textOffsetType="PERCENT" textOffset="50" numFormat="HANGUL_JAMO" charPrIDRef="4294967295" checkable="0"/>
        <hh:paraHead start="1" level="10" align="LEFT" useInstWidth="1" autoIndent="1" widthAdjust="0" textOffsetType="PERCENT" textOffset="50" numFormat="ROMAN_SMALL" charPrIDRef="4294967295" checkable="1"/>
      </hh:numbering>
    </hh:numberings>
    <hh:paraProperties itemCnt="10">
      <hh:paraPr id="0" tabPrIDRef="0" condense="0" fontLineHeight="0" snapToGrid="1" suppressLineNumbers="0" checked="0">
        <hh:align horizontal="JUSTIFY" vertical="BASELINE"/>
        <hh:heading type="NONE" idRef="0" level="0"/>
        <hh:breakSetting breakLatinWord="KEEP_WORD" breakNonLatinWord="KEEP_WORD" widowOrphan="0" keepWithNext="0" keepLines="0" pageBreakBefore="0" lineWrap="BREAK"/>
        <hh:autoSpacing eAsianEng="0" eAsianNum="0"/>
        <hh:margin left="0" right="0" top="0" bottom="0" indent="0"/>
        <hh:lineSpacing type="PERCENT" value="160" unit="HWPUNIT"/>
        <hh:border borderFillIDRef="2" offsetLeft="0" offsetRight="0" offsetTop="0" offsetBottom="0" connect="0" ignoreMargin="0"/>
      </hh:paraPr>
      <hh:paraPr id="1" tabPrIDRef="0" condense="0" fontLineHeight="0" snapToGrid="1" suppressLineNumbers="0" checked="0">
        <hh:align horizontal="JUSTIFY" vertical="BASELINE"/>
        <hh:heading type="NONE" idRef="0" level="0"/>
        <hh:breakSetting breakLatinWord="KEEP_WORD" breakNonLatinWord="KEEP_WORD" widowOrphan="0" keepWithNext="0" keepLines="0" pageBreakBefore="0" lineWrap="BREAK"/>
        <hh:autoSpacing eAsianEng="0" eAsianNum="0"/>
        <hh:margin left="3000" right="0" top="0" bottom="0" indent="0"/>
        <hh:lineSpacing type="PERCENT" value="160" unit="HWPUNIT"/>
        <hh:border borderFillIDRef="2" offsetLeft="0" offsetRight="0" offsetTop="0" offsetBottom="0" connect="0" ignoreMargin="0"/>
      </hh:paraPr>
      <hh:paraPr id="2" tabPrIDRef="1" condense="20" fontLineHeight="0" snapToGrid="1" suppressLineNumbers="0" checked="0">
        <hh:align horizontal="JUSTIFY" vertical="BASELINE"/>
        <hh:heading type="OUTLINE" idRef="0" level="0"/>
        <hh:breakSetting breakLatinWord="KEEP_WORD" breakNonLatinWord="KEEP_WORD" widowOrphan="0" keepWithNext="0" keepLines="0" pageBreakBefore="0" lineWrap="BREAK"/>
        <hh:autoSpacing eAsianEng="0" eAsianNum="0"/>
        <hh:margin left="2000" right="0" top="0" bottom="0" indent="0"/>
        <hh:lineSpacing type="PERCENT" value="160" unit="HWPUNIT"/>
        <hh:border borderFillIDRef="2" offsetLeft="0" offsetRight="0" offsetTop="0" offsetBottom="0" connect="0" ignoreMargin="0"/>
      </hh:paraPr>
      <hh:paraPr id="3" tabPrIDRef="1" condense="20" fontLineHeight="0" snapToGrid="1" suppressLineNumbers="0" checked="0">
        <hh:align horizontal="JUSTIFY" vertical="BASELINE"/>
        <hh:heading type="OUTLINE" idRef="0" level="1"/>
        <hh:breakSetting breakLatinWord="KEEP_WORD" breakNonLatinWord="KEEP_WORD" widowOrphan="0" keepWithNext="0" keepLines="0" pageBreakBefore="0" lineWrap="BREAK"/>
        <hh:autoSpacing eAsianEng="0" eAsianNum="0"/>
        <hh:margin left="4000" right="0" top="0" bottom="0" indent="0"/>
        <hh:lineSpacing type="PERCENT" value="160" unit="HWPUNIT"/>
        <hh:border borderFillIDRef="2" offsetLeft="0" offsetRight="0" offsetTop="0" offsetBottom="0" connect="0" ignoreMargin="0"/>
      </hh:paraPr>
      <hh:paraPr id="4" tabPrIDRef="1" condense="20" fontLineHeight="0" snapToGrid="1" suppressLineNumbers="0" checked="0">
        <hh:align horizontal="JUSTIFY" vertical="BASELINE"/>
        <hh:heading type="OUTLINE" idRef="0" level="2"/>
        <hh:breakSetting breakLatinWord="KEEP_WORD" breakNonLatinWord="KEEP_WORD" widowOrphan="0" keepWithNext="0" keepLines="0" pageBreakBefore="0" lineWrap="BREAK"/>
        <hh:autoSpacing eAsianEng="0" eAsianNum="0"/>
        <hh:margin left="6000" right="0" top="0" bottom="0" indent="0"/>
        <hh:lineSpacing type="PERCENT" value="160" unit="HWPUNIT"/>
        <hh:border borderFillIDRef="2" offsetLeft="0" offsetRight="0" offsetTop="0" offsetBottom="0" connect="0" ignoreMargin="0"/>
      </hh:paraPr>
      <hh:paraPr id="5" tabPrIDRef="1" condense="20" fontLineHeight="0" snapToGrid="1" suppressLineNumbers="0" checked="0">
        <hh:align horizontal="JUSTIFY" vertical="BASELINE"/>
        <hh:heading type="OUTLINE" idRef="0" level="3"/>
        <hh:breakSetting breakLatinWord="KEEP_WORD" breakNonLatinWord="KEEP_WORD" widowOrphan="0" keepWithNext="0" keepLines="0" pageBreakBefore="0" lineWrap="BREAK"/>
        <hh:autoSpacing eAsianEng="0" eAsianNum="0"/>
        <hh:margin left="8000" right="0" top="0" bottom="0" indent="0"/>
        <hh:lineSpacing type="PERCENT" value="160" unit="HWPUNIT"/>
        <hh:border borderFillIDRef="2" offsetLeft="0" offsetRight="0" offsetTop="0" offsetBottom="0" connect="0" ignoreMargin="0"/>
      </hh:paraPr>
      <hh:paraPr id="6" tabPrIDRef="0" condense="0" fontLineHeight="0" snapToGrid="1" suppressLineNumbers="0" checked="0">
        <hh:align horizontal="JUSTIFY" vertical="BASELINE"/>
        <hh:heading type="NONE" idRef="0" level="0"/>
        <hh:breakSetting breakLatinWord="KEEP_WORD" breakNonLatinWord="BREAK_WORD" widowOrphan="0" keepWithNext="0" keepLines="0" pageBreakBefore="0" lineWrap="BREAK"/>
        <hh:autoSpacing eAsianEng="0" eAsianNum="0"/>
        <hh:margin left="0" right="0" top="0" bottom="0" indent="0"/>
        <hh:lineSpacing type="PERCENT" value="150" unit="HWPUNIT"/>
        <hh:border borderFillIDRef="2" offsetLeft="0" offsetRight="0" offsetTop="0" offsetBottom="0" connect="0" ignoreMargin="0"/>
      </hh:paraPr>
      <hh:paraPr id="7" tabPrIDRef="0" condense="0" fontLineHeight="0" snapToGrid="1" suppressLineNumbers="0" checked="0">
        <hh:align horizontal="LEFT" vertical="BASELINE"/>
        <hh:heading type="NONE" idRef="0" level="0"/>
        <hh:breakSetting breakLatinWord="KEEP_WORD" breakNonLatinWord="BREAK_WORD" widowOrphan="0" keepWithNext="0" keepLines="0" pageBreakBefore="0" lineWrap="BREAK"/>
        <hh:autoSpacing eAsianEng="0" eAsianNum="0"/>
        <hh:margin left="0" right="0" top="0" bottom="0" indent="0"/>
        <hh:lineSpacing type="PERCENT" value="130" unit="HWPUNIT"/>
        <hh:border borderFillIDRef="2" offsetLeft="0" offsetRight="0" offsetTop="0" offsetBottom="0" connect="0" ignoreMargin="0"/>
      </hh:paraPr>
      <hh:paraPr id="8" tabPrIDRef="1" condense="20" fontLineHeight="0" snapToGrid="1" suppressLineNumbers="0" checked="0">
        <hh:align horizontal="LEFT" vertical="BASELINE"/>
        <hh:heading type="NONE" idRef="0" level="0"/>
        <hh:breakSetting breakLatinWord="KEEP_WORD" breakNonLatinWord="BREAK_WORD" widowOrphan="0" keepWithNext="0" keepLines="0" pageBreakBefore="0" lineWrap="BREAK"/>
        <hh:autoSpacing eAsianEng="0" eAsianNum="0"/>
        <hh:margin left="0" right="0" top="2400" bottom="600" indent="0"/>
        <hh:lineSpacing type="PERCENT" value="160" unit="HWPUNIT"/>
        <hh:border borderFillIDRef="2" offsetLeft="0" offsetRight="0" offsetTop="0" offsetBottom="0" connect="0" ignoreMargin="0"/>
      </hh:paraPr>
      <hh:paraPr id="9" tabPrIDRef="0" condense="0" fontLineHeight="0" snapToGrid="1" suppressLineNumbers="0" checked="0">
        <hh:align horizontal="CENTER" vertical="BASELINE"/>
        <hh:heading type="NONE" idRef="0" level="0"/>
        <hh:breakSetting breakLatinWord="KEEP_WORD" breakNonLatinWord="BREAK_WORD" widowOrphan="0" keepWithNext="0" keepLines="0" pageBreakBefore="0" lineWrap="BREAK"/>
        <hh:autoSpacing eAsianEng="0" eAsianNum="0"/>
        <hh:margin left="0" right="0" top="0" bottom="0" indent="0"/>
        <hh:lineSpacing type="PERCENT" value="160" unit="HWPUNIT"/>
        <hh:border borderFillIDRef="2" offsetLeft="0" offsetRight="0" offsetTop="0" offsetBottom="0" connect="0" ignoreMargin="0"/>
      </hh:paraPr>
    </hh:paraProperties>
    <hh:styles itemCnt="10">
      <hh:style id="0" type="PARA" name="바탕글" engName="Normal" paraPrIDRef="0" charPrIDRef="0" nextStyleIDRef="0" langID="1042" lockForm="0"/>
      <hh:style id="1" type="PARA" name="본문" engName="Body" paraPrIDRef="1" charPrIDRef="0" nextStyleIDRef="1" langID="1042" lockForm="0"/>
      <hh:style id="2" type="PARA" name="개요 1" engName="Outline 1" paraPrIDRef="2" charPrIDRef="0" nextStyleIDRef="2" langID="1042" lockForm="0"/>
      <hh:style id="3" type="PARA" name="개요 2" engName="Outline 2" paraPrIDRef="3" charPrIDRef="0" nextStyleIDRef="3" langID="1042" lockForm="0"/>
      <hh:style id="4" type="PARA" name="개요 3" engName="Outline 3" paraPrIDRef="4" charPrIDRef="0" nextStyleIDRef="4" langID="1042" lockForm="0"/>
      <hh:style id="5" type="PARA" name="개요 4" engName="Outline 4" paraPrIDRef="5" charPrIDRef="0" nextStyleIDRef="5" langID="1042" lockForm="0"/>
      <hh:style id="6" type="CHAR" name="쪽 번호" engName="Page Number" paraPrIDRef="0" charPrIDRef="1" nextStyleIDRef="0" langID="1042" lockForm="0"/>
      <hh:style id="7" type="PARA" name="머리말" engName="Header" paraPrIDRef="6" charPrIDRef="2" nextStyleIDRef="7" langID="1042" lockForm="0"/>
      <hh:style id="8" type="PARA" name="각주" engName="Footnote" paraPrIDRef="7" charPrIDRef="3" nextStyleIDRef="8" langID="1042" lockForm="0"/>
      <hh:style id="9" type="PARA" name="캡션" engName="Caption" paraPrIDRef="9" charPrIDRef="0" nextStyleIDRef="9" langID="1042" lockForm="0"/>
    </hh:styles>
    <hh:memoProperties itemCnt="1">
      <hh:memoPr id="1" width="15591" lineWidth="1" lineType="SOLID" lineColor="#B6D7AE" fillColor="#F0FFE9" activeColor="#CFF1C7" memoType="NOMAL"/>
    </hh:memoProperties>
  </hh:refList>
  <hh:compatibleDocument targetProgram="HWP201X"><hh:layoutCompatibility/></hh:compatibleDocument>
  <hh:docOption><hh:linkinfo path="" pageInherit="0" footnoteInherit="0"/></hh:docOption>
  <hh:trackchageConfig flags="56"/>
</hh:head>`;
    return this.compressXml(xml);
  }

  private generateSection(
    options: Required<ExportOptions>,
    paperSize: { width: number; height: number }
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
      <hp:footNotePr>< hp:autoNumFormat type="DIGIT"/><hp:newNum type="CONTINUOUS"/></hp:footNotePr>
      <hp:endNotePr><hp:autoNumFormat type="DIGIT"/><hp:newNum type="CONTINUOUS"/></hp:endNotePr>
      <hp:pageBorderFill type="BOTH" borderFillIDRef="1" textBorder="0" headerInside="0" footerInside="0">
        <hp:offset left="1417" right="1417" top="1417" bottom="1417"/>
      </hp:pageBorderFill>
    </hp:secPr>`;
    
    const paragraphs = this.convertHtmlToParagraphs(options.content, options.title, secPrXml);

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

    const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<opf:package xmlns:ha="http://www.hancom.co.kr/hwpml/2011/app" 
             xmlns:hp="http://www.hancom.co.kr/hwpml/2011/paragraph" 
             xmlns:hp10="http://www.hancom.co.kr/hwpml/2016/paragraph" 
             xmlns:hs="http://www.hancom.co.kr/hwpml/2011/section" 
             xmlns:hc="http://www.hancom.co.kr/hwpml/2011/core" 
             xmlns:hh="http://www.hancom.co.kr/hwpml/2011/head" 
             xmlns:hhs="http://www.hancom.co.kr/hwpml/2011/history" 
             xmlns:hm="http://www.hancom.co.kr/hwpml/2011/master-page" 
             xmlns:hpf="http://www.hancom.co.kr/schema/2011/hpf" 
             xmlns:dc="http://purl.org/dc/elements/1.1/" 
             xmlns:opf="http://www.idpf.org/2007/opf" 
             xmlns:ooxmlchart="http://www.hancom.co.kr/hwpml/2016/ooxmlchart" 
             xmlns:hwpunitchar="http://www.hancom.co.kr/hwpml/2016/HwpUnitChar" 
             xmlns:epub="http://www.idpf.org/2007/ops" 
             xmlns:config="urn:oasis:names:tc:opendocument:xmlns:config:1.0" 
             version="" unique-identifier="" id="">
  <opf:metadata>
    <opf:title/>
    <opf:language>ko</opf:language>
    <opf:meta name="creator" content="text">Luie</opf:meta>
    <opf:meta name="CreatedDate" content="text">${date}</opf:meta>
    <opf:meta name="ModifiedDate" content="text">${date}</opf:meta>
  </opf:metadata>
  <opf:manifest>
    <opf:item id="header" href="Contents/header.xml" media-type="application/xml"/>
    <opf:item id="section0" href="Contents/section0.xml" media-type="application/xml"/>
    <opf:item id="settings" href="settings.xml" media-type="application/xml"/>
  </opf:manifest>
  <opf:spine>
    <opf:itemref idref="header" linear="yes"/>
    <opf:itemref idref="section0" linear="yes"/>
  </opf:spine>
</opf:package>`;
    return this.compressXml(xml);
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
  private convertHtmlToParagraphs(html: string, title: string, secPrXml?: string): string {
    const paragraphs: string[] = [];
    let paraId = Math.floor(Math.random() * 4000000000); // 고유 ID 시작점
    
    // 첫 문단 (제목 + secPr 포함)
    const firstParaId = paraId++;
    if (secPrXml) {
      paragraphs.push(`  <hp:p id="${firstParaId}" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">
    <hp:run charPrIDRef="0">
      ${secPrXml}
      <hp:ctrl>
        <hp:colPr id="" type="NEWSPAPER" layout="LEFT" colCount="1" sameSz="1" sameGap="0"/>
      </hp:ctrl>
    </hp:run>
    <hp:run charPrIDRef="0">
      <hp:t>${this.escapeXml(title)}</hp:t>
    </hp:run>
    <hp:linesegarray>
      <hp:lineseg textpos="0" vertpos="0" vertsize="1600" textheight="1000" baseline="1280" spacing="0" horzpos="0" horzsize="42520" flags="0"/>
    </hp:linesegarray>
  </hp:p>`);
    } else {
      paragraphs.push(`  <hp:p id="${firstParaId}" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">
    <hp:run charPrIDRef="0">
      <hp:t>${this.escapeXml(title)}</hp:t>
    </hp:run>
    <hp:linesegarray>
      <hp:lineseg textpos="0" vertpos="0" vertsize="1600" textheight="1000" baseline="1280" spacing="0" horzpos="0" horzsize="42520" flags="0"/>
    </hp:linesegarray>
  </hp:p>`);
    }
    
    // 빈 줄 추가
    paragraphs.push(`  <hp:p id="${paraId++}" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">
    <hp:run charPrIDRef="0">
      <hp:t></hp:t>
    </hp:run>
    <hp:linesegarray>
      <hp:lineseg textpos="0" vertpos="0" vertsize="1600" textheight="1000" baseline="1280" spacing="0" horzpos="0" horzsize="42520" flags="0"/>
    </hp:linesegarray>
  </hp:p>`);
    
    // HTML 파싱 (간단한 구현)
    const textContent = this.htmlToText(html);
    const lines = textContent.split("\n").filter(line => line.trim());
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      paragraphs.push(`  <hp:p id="${paraId++}" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">
    <hp:run charPrIDRef="0">
      <hp:t>${this.escapeXml(line)}</hp:t>
    </hp:run>
    <hp:linesegarray>
      <hp:lineseg textpos="0" vertpos="0" vertsize="1600" textheight="1000" baseline="1280" spacing="0" horzpos="0" horzsize="42520" flags="0"/>
    </hp:linesegarray>
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
