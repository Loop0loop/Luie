export type PreparedExportBlock =
  | { kind: "heading"; level: 1 | 2 | 3; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "list"; ordered: boolean; items: string[] };

export interface PrepareExportContentOptions {
  html: string;
  title?: string;
}

export interface PreparedExportContent {
  html: string;
  blocks: PreparedExportBlock[];
  removedDuplicateTitle: boolean;
}

const BLOCKED_ELEMENT_PATTERN =
  /<(script|style|iframe|object|embed|link|meta|xml|o:p)\b[^>]*>[\s\S]*?<\/\1>/gi;
const BLOCKED_SELF_CLOSING_PATTERN =
  /<(script|style|iframe|object|embed|link|meta|xml|o:p)\b[^>]*\/?>/gi;
const COMMENT_PATTERN = /<!--[\s\S]*?-->/g;

const decodeHtmlEntities = (value: string): string =>
  value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");

const normalizeWhitespace = (value: string): string =>
  decodeHtmlEntities(value)
    .replace(/\u00a0/g, " ")
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim();

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const normalizeComparisonText = (value: string): string =>
  normalizeWhitespace(value)
    .replace(/[“”"']/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase();

const stripTags = (value: string): string => value.replace(/<[^>]+>/g, " ");

const sanitizeExportHtml = (html: string): string =>
  html
    .replace(COMMENT_PATTERN, "")
    .replace(BLOCKED_ELEMENT_PATTERN, "")
    .replace(BLOCKED_SELF_CLOSING_PATTERN, "")
    .replace(/<(\/?)div\b[^>]*>/gi, (_, closing: string) =>
      closing ? "</p>" : "<p>",
    )
    .replace(/<(\/?)b\b[^>]*>/gi, (_, closing: string) =>
      closing ? "</strong>" : "<strong>",
    )
    .replace(/<(\/?)i\b[^>]*>/gi, (_, closing: string) =>
      closing ? "</em>" : "<em>",
    )
    .replace(/<(\/?)(span|font|section|article|main|header|footer|nav|figure|figcaption|tbody|thead|tr|td|th|table)\b[^>]*>/gi, "")
    .replace(/<([a-z0-9]+)\b[^>]*>/gi, (match, tag: string) => {
      const normalizedTag = tag.toLowerCase();
      if (
        normalizedTag === "p" ||
        normalizedTag === "br" ||
        normalizedTag === "h1" ||
        normalizedTag === "h2" ||
        normalizedTag === "h3" ||
        normalizedTag === "ul" ||
        normalizedTag === "ol" ||
        normalizedTag === "li" ||
        normalizedTag === "blockquote" ||
        normalizedTag === "strong" ||
        normalizedTag === "em" ||
        normalizedTag === "u"
      ) {
        return normalizedTag === "br" ? "<br>" : `<${normalizedTag}>`;
      }
      return match.startsWith("</") ? "" : "";
    })
    .replace(/<\/([a-z0-9]+)\b[^>]*>/gi, (_match, tag: string) => {
      const normalizedTag = tag.toLowerCase();
      if (
        normalizedTag === "p" ||
        normalizedTag === "h1" ||
        normalizedTag === "h2" ||
        normalizedTag === "h3" ||
        normalizedTag === "ul" ||
        normalizedTag === "ol" ||
        normalizedTag === "li" ||
        normalizedTag === "blockquote" ||
        normalizedTag === "strong" ||
        normalizedTag === "em" ||
        normalizedTag === "u"
      ) {
        return `</${normalizedTag}>`;
      }
      return "";
    });

const toSegments = (html: string): string[] => {
  const normalized = sanitizeExportHtml(html)
    .replace(/<h1>/gi, "\n\n@@H1@@ ")
    .replace(/<\/h1>/gi, "\n\n")
    .replace(/<h2>/gi, "\n\n@@H2@@ ")
    .replace(/<\/h2>/gi, "\n\n")
    .replace(/<h3>/gi, "\n\n@@H3@@ ")
    .replace(/<\/h3>/gi, "\n\n")
    .replace(/<li>/gi, "\n@@LI@@ ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<(p|blockquote|ul|ol)>/gi, "\n\n")
    .replace(/<\/(p|blockquote|ul|ol)>/gi, "\n\n")
    .replace(/<br>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/\n{3,}/g, "\n\n");

  return normalized
    .split(/\n{2,}/)
    .map((segment) => normalizeWhitespace(segment))
    .filter(Boolean);
};

const BULLET_ITEM_PATTERN = /^(?:@@LI@@\s*|[•●▪■·*-]\s+)(.+)$/;
const ORDERED_ITEM_PATTERN = /^(?:@@LI@@\s*)?(\d+)[.)]\s+(.+)$/;
const HEADING_PATTERN = /^@@H([123])@@\s*(.+)$/;

const buildBlocks = (segments: string[]): PreparedExportBlock[] => {
  const blocks: PreparedExportBlock[] = [];

  for (const segment of segments) {
    const headingMatch = segment.match(HEADING_PATTERN);
    if (headingMatch) {
      const text = normalizeWhitespace(headingMatch[2].replace(/\n+/g, " "));
      if (text.length > 0) {
        blocks.push({
          kind: "heading",
          level: Number(headingMatch[1]) as 1 | 2 | 3,
          text,
        });
      }
      continue;
    }

    const lines = segment
      .split("\n")
      .map((line) => normalizeWhitespace(line))
      .filter(Boolean);

    if (lines.length === 0) {
      continue;
    }

    const orderedItems = lines
      .map((line) => line.match(ORDERED_ITEM_PATTERN))
      .filter((match): match is RegExpMatchArray => Boolean(match))
      .map((match) => normalizeWhitespace(match[2]));
    if (orderedItems.length === lines.length && orderedItems.length > 0) {
      blocks.push({
        kind: "list",
        ordered: true,
        items: orderedItems,
      });
      continue;
    }

    const bulletItems = lines
      .map((line) => line.match(BULLET_ITEM_PATTERN))
      .filter((match): match is RegExpMatchArray => Boolean(match))
      .map((match) => normalizeWhitespace(match[1]));
    if (bulletItems.length === lines.length && bulletItems.length > 0) {
      blocks.push({
        kind: "list",
        ordered: false,
        items: bulletItems,
      });
      continue;
    }

    const text = normalizeWhitespace(lines.join(" "));
    if (text.length > 0) {
      blocks.push({
        kind: "paragraph",
        text,
      });
    }
  }

  return blocks;
};

const mergeAdjacentLists = (
  blocks: PreparedExportBlock[],
): PreparedExportBlock[] => {
  const merged: PreparedExportBlock[] = [];

  for (const block of blocks) {
    const previous = merged[merged.length - 1];
    if (
      block.kind === "list" &&
      previous?.kind === "list" &&
      previous.ordered === block.ordered
    ) {
      previous.items.push(...block.items);
      continue;
    }

    if (block.kind === "list") {
      merged.push({
        kind: "list",
        ordered: block.ordered,
        items: [...block.items],
      });
      continue;
    }

    merged.push(block);
  }

  return merged;
};

const serializeBlocks = (blocks: PreparedExportBlock[]): string =>
  blocks
    .map((block) => {
      if (block.kind === "heading") {
        return `<h${block.level}>${escapeHtml(block.text)}</h${block.level}>`;
      }

      if (block.kind === "list") {
        const tag = block.ordered ? "ol" : "ul";
        const items = block.items
          .map((item) => `<li>${escapeHtml(item)}</li>`)
          .join("");
        return `<${tag}>${items}</${tag}>`;
      }

      return `<p>${escapeHtml(block.text)}</p>`;
    })
    .join("");

export const prepareExportContent = (
  input: PrepareExportContentOptions,
): PreparedExportContent => {
  const blocks = mergeAdjacentLists(buildBlocks(toSegments(input.html)));
  const normalizedTitle = normalizeComparisonText(input.title ?? "");
  let removedDuplicateTitle = false;

  if (normalizedTitle.length > 0 && blocks.length > 0) {
    const firstBlock = blocks[0];
    const firstText = normalizeComparisonText(
      firstBlock.kind === "list" ? firstBlock.items.join(" ") : firstBlock.text,
    );
    if (firstText === normalizedTitle) {
      blocks.shift();
      removedDuplicateTitle = true;
    }
  }

  return {
    html: serializeBlocks(blocks),
    blocks,
    removedDuplicateTitle,
  };
};

export const extractPlainTextFromHtml = (html: string): string =>
  normalizeWhitespace(stripTags(sanitizeExportHtml(html)));
