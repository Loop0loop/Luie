import { and, asc, eq, inArray, sql } from "drizzle-orm";
import {
  db,
  memoryChunk,
  memoryEpisodeExtractionJob,
} from "../../../../infra/database/index.js";
import { createMemoryEpisodeCandidate } from "./memoryEpisodeCandidate.js";

const EPISODE_EXTRACTION_MAX_ATTEMPTS = 3;

export type MemoryEpisodeExtractionChunk = {
  chunkId: string;
  chapterId: string | null;
  sceneId: string | null;
  content: string;
  contentHash: string;
  sourceContentHash: string;
  startOffset: number | null;
  endOffset: number | null;
};

export type MemoryEpisodeExtractorCandidate = {
  episodeType: string;
  title: string;
  summary: string;
  evidence: Array<{
    chunkId: string;
    quote: string;
    startOffset: number | null;
    endOffset: number | null;
  }>;
};

export type MemoryEpisodeExtractor = (input: {
  projectId: string;
  sourceType: string;
  sourceId: string;
  sourceContentHash: string;
  extractorVersion: string;
  chunks: MemoryEpisodeExtractionChunk[];
}) => Promise<MemoryEpisodeExtractorCandidate[]>;

export function isLlmEpisodeExtractionEnabled(): boolean {
  return process.env.LUIE_ENABLE_LLM_EPISODE_EXTRACTION === "1";
}

export async function listProjectsWithPendingEpisodeExtractionJobs(
  limit = 20,
): Promise<string[]> {
  const rows = await db.getClient().all<{ projectId: string }>(
    sql`SELECT "projectId"
        FROM "MemoryEpisodeExtractionJob"
        WHERE "status" IN ('pending', 'failed')
        GROUP BY "projectId"
        ORDER BY MAX("updatedAt") DESC
        LIMIT ${Math.max(1, limit)};`,
  );
  return rows.map((row) => row.projectId);
}

export async function processPendingEpisodeExtractionJobs(input: {
  projectId: string;
  extractor: MemoryEpisodeExtractor;
  nowIso?: string;
  limit?: number;
}): Promise<{ queued: number; processed: number }> {
  const client = db.getClient();
  const limit = input.limit ?? 1;
  const nowIso = input.nowIso ?? new Date().toISOString();
  const candidates = await client
    .select()
    .from(memoryEpisodeExtractionJob)
    .where(
      and(
        eq(memoryEpisodeExtractionJob.projectId, input.projectId),
        inArray(memoryEpisodeExtractionJob.status, ["pending", "failed"]),
      ),
    )
    .orderBy(asc(memoryEpisodeExtractionJob.priority), asc(memoryEpisodeExtractionJob.createdAt))
    .limit(limit);

  if (candidates.length === 0) return { queued: 0, processed: 0 };

  let processed = 0;

  for (const job of candidates) {
    const claimed = await client
      .update(memoryEpisodeExtractionJob)
      .set({
        status: "running",
        updatedAt: nowIso,
      })
      .where(
        and(
          eq(memoryEpisodeExtractionJob.id, job.id),
          inArray(memoryEpisodeExtractionJob.status, ["pending", "failed"]),
        ),
      )
      .returning({ id: memoryEpisodeExtractionJob.id });
    if (claimed.length === 0) continue;

    try {
      const chunks = await client
        .select({
          chunkId: memoryChunk.id,
          chapterId: memoryChunk.chapterId,
          sceneId: memoryChunk.sceneId,
          content: memoryChunk.content,
          contentHash: memoryChunk.contentHash,
          sourceContentHash: memoryChunk.sourceContentHash,
          startOffset: memoryChunk.startOffset,
          endOffset: memoryChunk.endOffset,
        })
        .from(memoryChunk)
        .where(
          and(
            eq(memoryChunk.projectId, job.projectId),
            eq(memoryChunk.sourceType, job.sourceType),
            eq(memoryChunk.sourceId, job.sourceId),
          ),
        )
        .orderBy(asc(memoryChunk.chunkIndex));
      const chunksById = new Map(chunks.map((chunk) => [chunk.chunkId, chunk]));
      const extracted = await input.extractor({
        projectId: job.projectId,
        sourceType: job.sourceType,
        sourceId: job.sourceId,
        sourceContentHash: job.sourceContentHash,
        extractorVersion: job.extractorVersion,
        chunks,
      });

      for (const candidate of extracted) {
        await createMemoryEpisodeCandidate({
          nowIso,
          projectId: job.projectId,
          sourceType: job.sourceType,
          sourceId: job.sourceId,
          chapterId: chunks[0]?.chapterId ?? null,
          sceneId: chunks[0]?.sceneId ?? null,
          sourceContentHash: job.sourceContentHash,
          extractorVersion: job.extractorVersion,
          episodeType: candidate.episodeType,
          title: candidate.title,
          summary: candidate.summary,
          evidence: candidate.evidence.map((evidence) => {
            const chunk = chunksById.get(evidence.chunkId);
            if (!chunk) {
              throw new Error(`MEMORY_EPISODE_EVIDENCE_CHUNK_NOT_FOUND:${evidence.chunkId}`);
            }
            return {
              chapterId: chunk.chapterId,
              chunkId: chunk.chunkId,
              contentHash: chunk.contentHash,
              sourceContentHash: chunk.sourceContentHash || job.sourceContentHash,
              quote: evidence.quote,
              startOffset: evidence.startOffset,
              endOffset: evidence.endOffset,
            };
          }),
        });
      }

      await client
        .update(memoryEpisodeExtractionJob)
        .set({
          status: "completed",
          attempts: sql`${memoryEpisodeExtractionJob.attempts} + 1`,
          error: null,
          updatedAt: nowIso,
        })
        .where(eq(memoryEpisodeExtractionJob.id, job.id));
      processed += 1;
    } catch (error) {
      const attempts = job.attempts + 1;
      await client
        .update(memoryEpisodeExtractionJob)
        .set({
          status: attempts >= EPISODE_EXTRACTION_MAX_ATTEMPTS ? "failed" : "pending",
          attempts,
          error: error instanceof Error ? error.message : "UNKNOWN_ERROR",
          updatedAt: nowIso,
        })
        .where(eq(memoryEpisodeExtractionJob.id, job.id));
    }
  }

  return { queued: candidates.length, processed };
}

export async function processPendingLlmEpisodeExtractionJobs(input: {
  projectId: string;
  nowIso?: string;
  limit?: number;
}): Promise<{ queued: number; processed: number }> {
  if (!isLlmEpisodeExtractionEnabled()) {
    return { queued: 0, processed: 0 };
  }
  const { llmEpisodeExtractor } = await import("./memoryEpisodeLlmExtractor.js");
  return await processPendingEpisodeExtractionJobs({
    ...input,
    extractor: llmEpisodeExtractor,
  });
}
