import { promises as fs } from "fs";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  HeadingLevel,
} from "docx";
import { ServiceError } from "../../../utils/error/index.js";
import { ErrorCode } from "../../../../shared/constants/errors/index.js";
import { hwpxExportService } from "../hwpx/hwpxExportService.js";
import { prepareExportContent } from "../../../../shared/utils/exportContentNormalization.js";

export interface ExportOptions {
  projectId: string;
  chapterId: string;
  title: string;
  /** TipTap editor가 생성한 HTML. */
  content: string;
  format: "DOCX" | "HWPX";

  paperSize?: "A4" | "Letter" | "B5";
  /** mm 단위. */
  marginTop?: number;
  /** mm 단위. */
  marginBottom?: number;
  /** mm 단위. */
  marginLeft?: number;
  /** mm 단위. */
  marginRight?: number;

  fontFamily?: string;
  /** pt 단위. */
  fontSize?: number;
  /** 백분율 문자열. */
  lineHeight?: string;
  normalizeLineSpacing?: boolean;

  showPageNumbers?: boolean;
  startPageNumber?: number;

  outputPath?: string;

  /** blank.hwpx 또는 사용자 template의 절대 경로. */
  referenceHwpxPath?: string;
}

export interface ExportResult {
  success: boolean;
  filePath?: string;
  error?: string;
  message?: string;
}

const MM_TO_TWIPS = 56.7;
const PT_TO_HALF_PT = 2;

const PAPER_SIZES = {
  A4: { width: 210, height: 297 },
  Letter: { width: 216, height: 279 },
  B5: { width: 176, height: 250 },
} as const;

const DEFAULT_SETTINGS = {
  paperSize: "A4" as const,
  marginTop: 20,
  marginBottom: 15,
  marginLeft: 20,
  marginRight: 20,
  fontFamily: "Batang",
  fontSize: 10,
  lineHeight: "160%",
  normalizeLineSpacing: false,
  showPageNumbers: true,
  startPageNumber: 1,
};

function mmToTwips(mm: number): number {
  return Math.round(mm * MM_TO_TWIPS);
}

function ptToHalfPt(pt: number): number {
  return pt * PT_TO_HALF_PT;
}

function parseLineHeight(lineHeight: string): number {
  const percentage = parseInt(lineHeight.replace("%", ""));
  // NOTE: docx의 lineSpacing은 240을 100%로 해석한다.
  return Math.round((percentage / 100) * 240);
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function stripHtmlTags(text: string): string {
  return decodeHtmlEntities(text.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function htmlToParagraphs(
  html: string,
  options: Required<ExportOptions>,
): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  const pushParagraph = (text: string, orderedPrefix?: string) => {
    if (text.length === 0) {
      return;
    }

    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: orderedPrefix ? `${orderedPrefix} ${text}` : text,
            font: options.fontFamily,
            size: ptToHalfPt(options.fontSize),
          }),
        ],
        spacing: {
          before: 0,
          after: 0,
          line: parseLineHeight(options.lineHeight),
        },
        indent:
          orderedPrefix === undefined
            ? { firstLine: mmToTwips(3.5) }
            : { left: mmToTwips(6), hanging: mmToTwips(3) },
      }),
    );
  };

  const blockPattern = /<(h1|h2|h3|p|ul|ol)[^>]*>([\s\S]*?)<\/\1>/gi;
  let lastIndex = 0;
  let match: RegExpExecArray | null = blockPattern.exec(html);

  const flushPlainText = (value: string) => {
    const text = stripHtmlTags(value);
    if (text.length > 0) {
      pushParagraph(text);
    }
  };

  while (match) {
    flushPlainText(html.slice(lastIndex, match.index));

    const tag = match[1].toLowerCase();
    const content = match[2];

    if (tag === "h1" || tag === "h2" || tag === "h3") {
      const text = stripHtmlTags(content);
      if (text.length > 0) {
        paragraphs.push(
          new Paragraph({
            text,
            heading:
              tag === "h1"
                ? HeadingLevel.HEADING_1
                : tag === "h2"
                  ? HeadingLevel.HEADING_2
                  : HeadingLevel.HEADING_3,
            alignment: tag === "h1" ? AlignmentType.CENTER : AlignmentType.LEFT,
            spacing:
              tag === "h1"
                ? { before: 240, after: 120 }
                : tag === "h2"
                  ? { before: 200, after: 100 }
                  : { before: 160, after: 80 },
          }),
        );
      }
    } else if (tag === "p") {
      pushParagraph(stripHtmlTags(content));
    } else if (tag === "ul" || tag === "ol") {
      const items = Array.from(
        content.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi),
        (item) => stripHtmlTags(item[1]),
      ).filter(Boolean);
      for (const [index, item] of items.entries()) {
        if (tag === "ul") {
          paragraphs.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: item,
                  font: options.fontFamily,
                  size: ptToHalfPt(options.fontSize),
                }),
              ],
              spacing: {
                before: 0,
                after: 0,
                line: parseLineHeight(options.lineHeight),
              },
              indent: {
                left: mmToTwips(6),
                hanging: mmToTwips(3),
              },
              bullet: { level: 0 },
            }),
          );
        } else {
          pushParagraph(item, `${index + 1}.`);
        }
      }
    }

    lastIndex = match.index + match[0].length;
    match = blockPattern.exec(html);
  }

  flushPlainText(html.slice(lastIndex));
  return paragraphs;
}

function buildTitleParagraph(options: Required<ExportOptions>): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text: options.title,
        font: options.fontFamily,
        size: ptToHalfPt(options.fontSize + 6),
        bold: true,
      }),
    ],
    alignment: AlignmentType.CENTER,
    spacing: {
      before: 120,
      after: 180,
    },
  });
}

export class ExportService {
  /**
   * 문서를 지정한 DOCX 또는 HWPX 경로로 내보낸다.
   */
  async export(options: ExportOptions): Promise<ExportResult> {
    try {
      const mergedOptions: Required<ExportOptions> = {
        ...DEFAULT_SETTINGS,
        ...options,
        marginRight:
          options.marginRight ??
          options.marginLeft ??
          DEFAULT_SETTINGS.marginLeft,
        outputPath: options.outputPath ?? "",
        referenceHwpxPath: options.referenceHwpxPath ?? "",
      };

      if (!mergedOptions.title || !mergedOptions.content) {
        throw new ServiceError(
          ErrorCode.VALIDATION_FAILED,
          "Title and content are required",
        );
      }

      if (mergedOptions.format === "DOCX") {
        return await this.exportDocx(mergedOptions);
      } else if (mergedOptions.format === "HWPX") {
        return await this.exportHwpx(mergedOptions);
      } else {
        throw new ServiceError(
          ErrorCode.VALIDATION_FAILED,
          `Unsupported format: ${mergedOptions.format}`,
        );
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown export error",
      };
    }
  }

  private async exportDocx(
    options: Required<ExportOptions>,
  ): Promise<ExportResult> {
    try {
      const paperSize = PAPER_SIZES[options.paperSize];
      const preparedContent = options.normalizeLineSpacing
        ? prepareExportContent({
            html: options.content,
            title: options.title,
          })
        : null;
      const bodyHtml = preparedContent?.html ?? options.content;
      const paragraphs = options.normalizeLineSpacing
        ? [buildTitleParagraph(options), ...htmlToParagraphs(bodyHtml, options)]
        : htmlToParagraphs(bodyHtml, options);

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

      const buffer = await Packer.toBuffer(doc);

      let outputPath = options.outputPath;
      if (!outputPath) {
        throw new ServiceError(
          ErrorCode.VALIDATION_FAILED,
          "Output path is required",
        );
      }

      if (!outputPath.endsWith(".docx")) {
        outputPath = outputPath.replace(/\.[^.]*$/, "") + ".docx";
      }

      await fs.writeFile(outputPath, buffer);

      return {
        success: true,
        filePath: outputPath,
      };
    } catch (error) {
      throw new ServiceError(
        ErrorCode.FS_WRITE_FAILED,
        `DOCX export failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  private async exportHwpx(
    options: Required<ExportOptions>,
  ): Promise<ExportResult> {
    const preparedContent = options.normalizeLineSpacing
      ? prepareExportContent({
          html: options.content,
          title: options.title,
        })
      : null;

    return await hwpxExportService.exportHwpx({
      ...options,
      content: preparedContent?.html ?? options.content,
    });
  }
}

export const exportService = new ExportService();
