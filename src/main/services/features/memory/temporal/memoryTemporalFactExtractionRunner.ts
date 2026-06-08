import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import {
  chapter,
  db,
  memoryEntity,
  memoryEpisode,
  memoryEpisodeEvidence,
  memoryFactEvidence,
} from "../../../../infra/database/index.js";
import {
  createMemoryTemporalFactCandidate,
  type MemoryTemporalFactCandidateCreateInput,
} from "./memoryTemporalFactCandidateService.js";

export type MemoryTemporalFactExtractionEvidence = {
  evidenceId: string;
  episodeId: string;
  episodeType: string;
  episodeTitle: string;
  episodeSummary: string;
  chapterId: string;
  chapterOrder: number;
  chunkId: string | null;
  quote: string;
  startOffset: number | null;
  endOffset: number | null;
  contentHash: string;
  sourceContentHash: string;
};

export type MemoryTemporalFactExtractionEntity = {
  id: string;
  entityType: string;
  canonicalName: string;
  status: string;
};

export type MemoryTemporalFactExtractorCandidate = Omit<
  MemoryTemporalFactCandidateCreateInput,
  "nowIso" | "projectId" | "extractorVersion"
>;

export type MemoryTemporalFactExtractor = (input: {
  projectId: string;
  evidence: MemoryTemporalFactExtractionEvidence[];
  entities: MemoryTemporalFactExtractionEntity[];
}) => Promise<MemoryTemporalFactExtractorCandidate[]>;

export async function processPendingTemporalFactExtraction(input: {
  projectId: string;
  extractor: MemoryTemporalFactExtractor;
  nowIso?: string;
  extractorVersion?: string;
  limit?: number;
}): Promise<{ extracted: number }> {
  const client = db.getClient();
  const limit = Math.max(1, input.limit ?? 20);
  const nowIso = input.nowIso ?? new Date().toISOString();
  const extractorVersion = input.extractorVersion ?? "fact-v1";

  const evidenceRows = await client
    .select({
      evidenceId: memoryEpisodeEvidence.id,
      episodeId: memoryEpisode.id,
      episodeType: memoryEpisode.episodeType,
      episodeTitle: memoryEpisode.title,
      episodeSummary: memoryEpisode.summary,
      chapterId: memoryEpisodeEvidence.chapterId,
      chapterOrder: chapter.order,
      chunkId: memoryEpisodeEvidence.chunkId,
      quote: memoryEpisodeEvidence.quote,
      startOffset: memoryEpisodeEvidence.startOffset,
      endOffset: memoryEpisodeEvidence.endOffset,
      contentHash: memoryEpisodeEvidence.contentHash,
      sourceContentHash: memoryEpisodeEvidence.sourceContentHash,
    })
    .from(memoryEpisodeEvidence)
    .innerJoin(
      memoryEpisode,
      eq(memoryEpisode.id, memoryEpisodeEvidence.episodeId),
    )
    .innerJoin(chapter, eq(chapter.id, memoryEpisodeEvidence.chapterId))
    .leftJoin(
      memoryFactEvidence,
      eq(memoryFactEvidence.evidenceId, memoryEpisodeEvidence.id),
    )
    .where(
      and(
        eq(memoryEpisodeEvidence.projectId, input.projectId),
        eq(memoryEpisode.projectId, input.projectId),
        eq(chapter.projectId, input.projectId),
        isNull(memoryFactEvidence.id),
        inArray(memoryEpisode.status, ["suggested", "confirmed"]),
      ),
    )
    .limit(limit);

  const evidence = evidenceRows.flatMap((row) =>
    row.chapterId === null
      ? []
      : [
          {
            ...row,
            chapterId: row.chapterId,
          },
        ],
  );
  if (evidence.length === 0) {
    return { extracted: 0 };
  }

  const entities = await client
    .select({
      id: memoryEntity.id,
      entityType: memoryEntity.entityType,
      canonicalName: memoryEntity.canonicalName,
      status: memoryEntity.status,
    })
    .from(memoryEntity)
    .where(
      and(
        eq(memoryEntity.projectId, input.projectId),
        isNull(memoryEntity.deletedAt),
      ),
    )
    .orderBy(memoryEntity.canonicalName);

  const candidates = await input.extractor({
    projectId: input.projectId,
    evidence,
    entities,
  });

  let extracted = 0;
  for (const candidate of candidates) {
    await createMemoryTemporalFactCandidate({
      ...candidate,
      nowIso,
      projectId: input.projectId,
      extractorVersion,
    });
    extracted += 1;
  }

  return { extracted };
}

export function isLlmTemporalFactExtractionEnabled(): boolean {
  return process.env.LUIE_ENABLE_LLM_TEMPORAL_FACT_EXTRACTION === "1";
}

export async function processPendingLlmTemporalFactExtraction(input: {
  projectId: string;
  nowIso?: string;
  limit?: number;
}): Promise<{ extracted: number }> {
  if (!isLlmTemporalFactExtractionEnabled()) {
    return { extracted: 0 };
  }
  const { llmTemporalFactExtractor } =
    await import("./memoryTemporalFactLlmExtractor.js");
  return await processPendingTemporalFactExtraction({
    ...input,
    extractor: llmTemporalFactExtractor,
    extractorVersion: "fact-v1",
  });
}

export async function listProjectsWithPendingTemporalFactEvidence(
  limit = 20,
): Promise<string[]> {
  const rows = await db.getClient().all<{ projectId: string }>(
    sql`SELECT ee."projectId"
        FROM "MemoryEpisodeEvidence" ee
        LEFT JOIN "MemoryFactEvidence" fe ON fe."evidenceId" = ee."id"
        INNER JOIN "MemoryEpisode" e ON e."id" = ee."episodeId"
        WHERE fe."id" IS NULL
          AND e."status" IN ('suggested', 'confirmed')
        GROUP BY ee."projectId"
        ORDER BY MAX(ee."updatedAt") DESC
        LIMIT ${Math.max(1, limit)};`,
  );
  return rows.map((row) => row.projectId);
}
