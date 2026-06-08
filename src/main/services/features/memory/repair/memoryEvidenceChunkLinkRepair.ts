import { sql } from "drizzle-orm";
import { db } from "../../../../infra/database/index.js";

type StaleEvidenceRow = {
  id: string;
  projectId: string;
  chapterId: string | null;
  chunkId: string | null;
  contentHash: string;
  sourceContentHash: string;
  startOffset: number | null;
  endOffset: number | null;
  quote: string;
};

type ChunkCandidateRow = {
  id: string;
  contentHash: string;
};

export type MemoryEvidenceChunkLinkRepairResult = {
  episodeEvidenceScanned: number;
  episodeEvidenceRepaired: number;
  episodeEvidenceUnresolved: number;
  entityMentionScanned: number;
  entityMentionRepaired: number;
  entityMentionUnresolved: number;
};

export async function repairMemoryEvidenceChunkLinks(input: {
  projectId: string;
  nowIso?: string;
}): Promise<MemoryEvidenceChunkLinkRepairResult> {
  const nowIso = input.nowIso ?? new Date().toISOString();
  const client = db.getClient();
  const episodeEvidenceRows = await client.all<StaleEvidenceRow>(sql`
    SELECT
      evidence."id",
      evidence."projectId",
      evidence."chapterId",
      evidence."chunkId",
      evidence."contentHash",
      evidence."sourceContentHash",
      evidence."startOffset",
      evidence."endOffset",
      evidence."quote"
    FROM "MemoryEpisodeEvidence" evidence
    LEFT JOIN "MemoryChunk" chunk ON chunk."id" = evidence."chunkId"
    WHERE evidence."projectId" = ${input.projectId}
      AND evidence."chunkId" IS NOT NULL
      AND chunk."id" IS NULL;
  `);
  const entityMentionRows = await client.all<StaleEvidenceRow>(sql`
    SELECT
      mention."id",
      mention."projectId",
      mention."chapterId",
      mention."chunkId",
      mention."contentHash",
      mention."sourceContentHash",
      mention."startOffset",
      mention."endOffset",
      mention."quote"
    FROM "MemoryEntityMention" mention
    LEFT JOIN "MemoryChunk" chunk ON chunk."id" = mention."chunkId"
    WHERE mention."projectId" = ${input.projectId}
      AND mention."chunkId" IS NOT NULL
      AND chunk."id" IS NULL;
  `);

  let episodeEvidenceRepaired = 0;
  let entityMentionRepaired = 0;

  for (const row of episodeEvidenceRows) {
    const candidate = await findCurrentChunkForEvidence(row);
    if (!candidate) continue;
    await client.run(sql`
      UPDATE "MemoryEpisodeEvidence"
      SET
        "chunkId" = ${candidate.id},
        "contentHash" = ${candidate.contentHash},
        "updatedAt" = ${nowIso}
      WHERE "id" = ${row.id}
        AND "projectId" = ${row.projectId};
    `);
    episodeEvidenceRepaired += 1;
  }

  for (const row of entityMentionRows) {
    const candidate = await findCurrentChunkForEvidence(row);
    if (!candidate) continue;
    await client.run(sql`
      UPDATE "MemoryEntityMention"
      SET
        "chunkId" = ${candidate.id},
        "contentHash" = ${candidate.contentHash},
        "updatedAt" = ${nowIso}
      WHERE "id" = ${row.id}
        AND "projectId" = ${row.projectId};
    `);
    entityMentionRepaired += 1;
  }

  return {
    episodeEvidenceScanned: episodeEvidenceRows.length,
    episodeEvidenceRepaired,
    episodeEvidenceUnresolved: episodeEvidenceRows.length - episodeEvidenceRepaired,
    entityMentionScanned: entityMentionRows.length,
    entityMentionRepaired,
    entityMentionUnresolved: entityMentionRows.length - entityMentionRepaired,
  };
}

async function findCurrentChunkForEvidence(
  row: StaleEvidenceRow,
): Promise<ChunkCandidateRow | null> {
  const candidates = await db.getClient().all<ChunkCandidateRow>(sql`
    SELECT
      chunk."id",
      chunk."contentHash"
    FROM "MemoryChunk" chunk
    WHERE chunk."projectId" = ${row.projectId}
      AND chunk."sourceContentHash" = ${row.sourceContentHash}
      AND (${row.chapterId} IS NULL OR chunk."chapterId" = ${row.chapterId})
      AND (
        chunk."contentHash" = ${row.contentHash}
        OR (
          ${row.startOffset} IS NOT NULL
          AND ${row.endOffset} IS NOT NULL
          AND chunk."startOffset" IS NOT NULL
          AND chunk."endOffset" IS NOT NULL
          AND chunk."startOffset" <= ${row.startOffset}
          AND chunk."endOffset" >= ${row.endOffset}
        )
        OR instr(chunk."content", ${row.quote}) > 0
      )
    ORDER BY
      CASE WHEN chunk."contentHash" = ${row.contentHash} THEN 0 ELSE 1 END,
      CASE
        WHEN ${row.startOffset} IS NOT NULL
          AND ${row.endOffset} IS NOT NULL
          AND chunk."startOffset" IS NOT NULL
          AND chunk."endOffset" IS NOT NULL
          AND chunk."startOffset" <= ${row.startOffset}
          AND chunk."endOffset" >= ${row.endOffset}
        THEN 0 ELSE 1
      END,
      CASE WHEN instr(chunk."content", ${row.quote}) > 0 THEN 0 ELSE 1 END,
      chunk."chunkIndex" ASC
    LIMIT 1;
  `);
  return candidates[0] ?? null;
}
