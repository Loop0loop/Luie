import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import type { AnyColumn, SQLWrapper } from "drizzle-orm";
import { db } from "../../../../database/main/databaseService.js";
import { escapeLike } from "../../../../utils/queryHelpers.js";
import { memoryBuildJob, memoryChunk } from "../../../../database/schema/index.js";
import type {
  RagQaEvidence,
  MemoryChunkSearchResult,
} from "../../../../../shared/types/index.js";
import { createLogger } from "../../../../../shared/logger/index.js";
import {
  EVIDENCE_QUOTE_CHAR_LIMIT,
  trimByChars,
} from "./contextAssembler.constants.js";
import { searchMemoryChunksForRag } from "./contextAssembler.search.js";
import type { RagEmbeddingProvider } from "./contextAssembler.types.js";

type Layer3Result = {
  section: string;
  evidence: RagQaEvidence[];
};
type Layer2LogCountRow = { count: number | bigint | string | null };
type Layer2LogJobRow = {
  jobType: string | null;
  status: string | null;
  count: number | bigint | string | null;
};
type Layer3FallbackRow = {
  chunkId: string;
  chapterId: string | null;
  content: string;
  startOffset: number | null;
  endOffset: number | null;
};

const KOREAN_SUFFIXES = [
  "은",
  "는",
  "이",
  "가",
  "을",
  "를",
  "에",
  "에서",
  "에게",
  "한테",
  "께",
  "와",
  "과",
  "으로",
  "로",
  "도",
  "만",
  "까지",
  "부터",
  "처럼",
  "보다",
  "의",
  "랑",
  "이라",
  "라",
  "야",
  "요",
  "다",
];

const logger = createLogger("RagContextAssembler");

function buildLexicalTokens(input: string, maxTokens: number): string[] {
  const seeds = input
    .replace(/[^0-9A-Za-z가-힣_\s]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2)
    .slice(0, maxTokens);

  const expanded = new Set<string>();
  for (const token of seeds) {
    expanded.add(token);
    for (const suffix of KOREAN_SUFFIXES) {
      if (token.endsWith(suffix) && token.length - suffix.length >= 2) {
        expanded.add(token.slice(0, token.length - suffix.length));
      }
    }
  }

  return [...expanded]
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function likeWithEscape(columnSql: AnyColumn | SQLWrapper, pattern: string) {
  return sql`${columnSql} LIKE ${pattern} ESCAPE '\\'`;
}

async function logEvidenceGapDiagnostics(
  projectId: string,
  question: string,
): Promise<void> {
  try {
    const [memoryCountRows, jobRows] = (await Promise.all([
      db
        .getClient()
        .select({ count: sql<number>`count(*)` })
        .from(memoryChunk)
        .where(eq(memoryChunk.projectId, projectId)),
      db
        .getClient()
        .select({
          jobType: memoryBuildJob.jobType,
          status: memoryBuildJob.status,
          count: sql<number>`count(*)`,
        })
        .from(memoryBuildJob)
        .where(
          and(
            eq(memoryBuildJob.projectId, projectId),
            inArray(memoryBuildJob.status, ["pending", "running", "failed"]),
          ),
        )
        .groupBy(memoryBuildJob.jobType, memoryBuildJob.status),
    ])) as [Layer2LogCountRow[], Layer2LogJobRow[]];
    logger.warn("RAG evidence empty", {
      projectId,
      questionPreview: question.slice(0, 120),
      memoryChunkCount: Number(memoryCountRows[0]?.count ?? 0),
      pendingJobs: jobRows,
    });
  } catch (error) {
    logger.warn("Failed to collect RAG evidence diagnostics", {
      projectId,
      error,
    });
  }
}

export async function buildLayer3Evidence(
  projectId: string,
  question: string,
  embedTexts?: RagEmbeddingProvider,
): Promise<Layer3Result> {
  let rows: MemoryChunkSearchResult[] = await searchMemoryChunksForRag({
    projectId,
    query: question,
    limit: 10,
    embedTexts,
    parentWindow: { before: 1, after: 1 },
  });

  if (rows.length === 0) {
    const normalizedQuestion = question.trim();
    const escaped = escapeLike(normalizedQuestion);
    const rawTokens = buildLexicalTokens(normalizedQuestion, 8);
    const tokenPredicates = rawTokens
      .map((token) => escapeLike(token))
      .filter((token): token is string => token.length > 0)
      .map((token) => likeWithEscape(memoryChunk.indexText, `%${token}%`));
    const lexicalPredicate =
      tokenPredicates.length > 0
        ? or(...tokenPredicates)
        : escaped
          ? likeWithEscape(memoryChunk.indexText, `%${escaped}%`)
          : undefined;
    if (lexicalPredicate) {
      try {
        const lexicalRows: Layer3FallbackRow[] = await db
          .getClient()
          .select({
            chunkId: memoryChunk.id,
            chapterId: memoryChunk.chapterId,
            content: memoryChunk.content,
            startOffset: memoryChunk.startOffset,
            endOffset: memoryChunk.endOffset,
          })
          .from(memoryChunk)
          .where(and(eq(memoryChunk.projectId, projectId), lexicalPredicate))
          .orderBy(desc(memoryChunk.updatedAt))
          .limit(10);
        rows = lexicalRows.map((row) => ({
          chunkId: row.chunkId,
          chapterId: row.chapterId,
          content: row.content,
          startOffset: row.startOffset,
          endOffset: row.endOffset,
          score: 0,
        }));
      } catch (error) {
        logger.warn(
          "Layer3 lexical fallback failed; using empty lexical rows",
          {
            projectId,
            error,
          },
        );
      }
    }
  }

  const evidence: RagQaEvidence[] = rows.map((row) => ({
    chunkId: row.chunkId,
    chapterId: row.chapterId,
    offset: row.startOffset ?? 0,
    quote: trimByChars(row.content, EVIDENCE_QUOTE_CHAR_LIMIT),
  }));

  if (evidence.length === 0) {
    await logEvidenceGapDiagnostics(projectId, question);
  }

  const section = rows.length
    ? rows
        .map((item, index) => {
          const n = index + 1;
          const content = item.parentWindow?.content ?? item.content;
          const windowStart = item.parentWindow?.startOffset ?? item.startOffset ?? 0;
          const windowEnd = item.parentWindow?.endOffset ?? item.endOffset ?? null;
          const windowSuffix =
            item.parentWindow && item.parentWindow.chunkIds.length > 1
              ? ` window=${item.parentWindow.chunkIds.join(",")} windowOffset=${windowStart}-${windowEnd ?? "null"}`
              : "";
          return `[E${n}] chunk=${item.chunkId} chapter=${item.chapterId ?? "null"} offset=${item.startOffset ?? 0}${windowSuffix}\n${trimByChars(content, EVIDENCE_QUOTE_CHAR_LIMIT)}`;
        })
        .join("\n\n")
    : "(no evidence found)";

  return { section, evidence };
}
