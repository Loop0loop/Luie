import crypto from "node:crypto";

const DEFAULT_CHUNK_TARGET = 500;
const DEFAULT_CHUNK_OVERLAP = 50;
const DEFAULT_CHUNK_HARD_CAP = 1000;

export function sha256(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export function estimateTokenCountFromChars(content: string): number {
  // Phase 1 uses a cheap proxy for token count. Real tokenizer integration belongs to Phase 2+.
  return content.length;
}

export function buildMemoryContextLabel(input: {
  sourceType: string;
  title?: string | null;
}): string | null {
  const title = input.title?.trim();
  if (!title) return null;
  return `${input.sourceType}: ${title}`;
}

export function buildMemoryChunkIndexText(input: {
  contextLabel: string | null;
  content: string;
}): string {
  if (!input.contextLabel) return input.content;
  return `[${input.contextLabel}]\n${input.content}`;
}

function collectParagraphBoundaries(input: string): Array<{
  start: number;
  end: number;
  index: number;
}> {
  const htmlParagraphs: Array<{ start: number; end: number; index: number }> = [];
  const paragraphElement = /<p\b[^>]*>[\s\S]*?<\/p>/gi;
  for (const match of input.matchAll(paragraphElement)) {
    const start = match.index ?? 0;
    const end = start + match[0].length;
    htmlParagraphs.push({ start, end, index: htmlParagraphs.length });
  }
  if (htmlParagraphs.length > 1) {
    return htmlParagraphs;
  }

  const paragraphBoundaries: Array<{ start: number; end: number; index: number }> = [];
  let paragraphStart = 0;
  const separator = /\n{2,}/g;
  let paragraphIndex = 0;
  for (const match of input.matchAll(separator)) {
    const sepStart = match.index ?? 0;
    const sepEnd = sepStart + match[0].length;
    paragraphBoundaries.push({ start: paragraphStart, end: sepEnd, index: paragraphIndex });
    paragraphStart = sepEnd;
    paragraphIndex += 1;
  }
  if (paragraphStart < input.length) {
    paragraphBoundaries.push({
      start: paragraphStart,
      end: input.length,
      index: paragraphIndex,
    });
  }
  return paragraphBoundaries;
}

export function chunkText(
  input: string,
  chunkTarget = DEFAULT_CHUNK_TARGET,
  overlap = DEFAULT_CHUNK_OVERLAP,
  hardCap = DEFAULT_CHUNK_HARD_CAP,
): Array<{
  content: string;
  startOffset: number;
  endOffset: number;
  paragraphStartIndex: number;
  paragraphEndIndex: number;
}> {
  const chunks: Array<{
    content: string;
    startOffset: number;
    endOffset: number;
    paragraphStartIndex: number;
    paragraphEndIndex: number;
  }> = [];
  if (input.length === 0) return chunks;

  const pushChunk = (
    startOffset: number,
    endOffset: number,
    paragraphStartIndex: number,
    paragraphEndIndex: number,
  ) => {
    if (endOffset <= startOffset) return;
    const content = input.slice(startOffset, endOffset);
    if (content.length === 0) return;
    if (content.trim().length === 0) return;
    chunks.push({
      content,
      startOffset,
      endOffset,
      paragraphStartIndex,
      paragraphEndIndex,
    });
  };

  const splitOversizedSegment = (
    segmentStart: number,
    segmentEnd: number,
    paragraphIndex: number,
  ) => {
    let cursor = segmentStart;
    while (cursor < segmentEnd) {
      const maxEnd = Math.min(segmentEnd, cursor + hardCap);
      let end = maxEnd;
      if (maxEnd < segmentEnd) {
        const preferredStart = Math.min(
          maxEnd,
          cursor + Math.floor(chunkTarget * 0.7),
        );
        const window = input.slice(preferredStart, maxEnd);
        const breakOffset = Math.max(
          window.lastIndexOf("\n"),
          window.lastIndexOf(" "),
          window.lastIndexOf("."),
          window.lastIndexOf(","),
        );
        if (breakOffset >= 0) {
          end = preferredStart + breakOffset + 1;
        }
      }
      pushChunk(cursor, end, paragraphIndex, paragraphIndex);
      if (end >= segmentEnd) break;
      cursor = Math.max(cursor + 1, end - overlap);
    }
  };

  const paragraphBoundaries = collectParagraphBoundaries(input);

  let currentStart: number | null = null;
  let currentEnd = 0;
  let currentParagraphStartIndex = 0;
  let currentParagraphEndIndex = 0;
  for (const paragraph of paragraphBoundaries) {
    const paragraphLength = paragraph.end - paragraph.start;
    if (paragraphLength > hardCap) {
      if (currentStart !== null) {
        pushChunk(
          currentStart,
          currentEnd,
          currentParagraphStartIndex,
          currentParagraphEndIndex,
        );
        currentStart = null;
      }
      splitOversizedSegment(paragraph.start, paragraph.end, paragraph.index);
      continue;
    }

    if (currentStart === null) {
      currentStart = paragraph.start;
      currentEnd = paragraph.end;
      currentParagraphStartIndex = paragraph.index;
      currentParagraphEndIndex = paragraph.index;
      continue;
    }

    const nextLength = paragraph.end - currentStart;
    if (nextLength <= chunkTarget) {
      currentEnd = paragraph.end;
      currentParagraphEndIndex = paragraph.index;
      continue;
    }

    pushChunk(
      currentStart,
      currentEnd,
      currentParagraphStartIndex,
      currentParagraphEndIndex,
    );
    const overlapStart = Math.max(currentStart, currentEnd - overlap);
    currentStart = overlapStart;
    currentEnd = paragraph.end;
    currentParagraphStartIndex = currentParagraphEndIndex;
    currentParagraphEndIndex = paragraph.index;

    if (currentEnd - currentStart > hardCap) {
      splitOversizedSegment(currentStart, currentEnd, paragraph.index);
      currentStart = null;
    }
  }

  if (currentStart !== null) {
    pushChunk(
      currentStart,
      currentEnd,
      currentParagraphStartIndex,
      currentParagraphEndIndex,
    );
  }
  return chunks;
}
