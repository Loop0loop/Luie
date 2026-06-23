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
type ChunkTextCandidateRow = ChunkCandidateRow & {
  content: string;
  chunkIndex: number;
};

export type MemoryEvidenceChunkLinkRepairResult = {
  episodeEvidenceScanned: number;
  episodeEvidenceRepaired: number;
  episodeEvidenceUnresolved: number;
  entityMentionScanned: number;
  entityMentionRepaired: number;
  entityMentionUnresolved: number;
  evalEvidenceScanned: number;
  evalEvidenceRepaired: number;
  evalEvidenceUnresolved: number;
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
      AND (
        chunk."id" IS NULL
        OR instr(chunk."content", evidence."quote") = 0
      );
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
      AND (
        chunk."id" IS NULL
        OR instr(chunk."content", mention."quote") = 0
      );
  `);
  const evalEvidenceRows = await client.all<StaleEvidenceRow>(sql`
    SELECT
      evidence."id",
      evidence."projectId",
      evidence."chapterId",
      evidence."expectedChunkId" AS "chunkId",
      '' AS "contentHash",
      '' AS "sourceContentHash",
      evidence."startOffset",
      evidence."endOffset",
      evidence."quote"
    FROM "MemoryEvalEvidence" evidence
    LEFT JOIN "MemoryChunk" chunk ON chunk."id" = evidence."expectedChunkId"
    WHERE evidence."projectId" = ${input.projectId}
      AND evidence."expectedChunkId" IS NOT NULL
      AND (
        chunk."id" IS NULL
        OR instr(chunk."content", evidence."quote") = 0
      )
    GROUP BY evidence."id";
  `);

  let episodeEvidenceRepaired = 0;
  let entityMentionRepaired = 0;
  let evalEvidenceRepaired = 0;

  for (const row of episodeEvidenceRows) {
    // eslint-disable-next-line no-await-in-loop -- repair updates are intentionally applied row-by-row for traceable counts.
    const candidate = await findCurrentChunkForEvidence(row);
    if (!candidate) continue;
    // eslint-disable-next-line no-await-in-loop -- repair updates are intentionally applied row-by-row for traceable counts.
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
    // eslint-disable-next-line no-await-in-loop -- repair updates are intentionally applied row-by-row for traceable counts.
    const candidate = await findCurrentChunkForEvidence(row);
    if (!candidate) continue;
    // eslint-disable-next-line no-await-in-loop -- repair updates are intentionally applied row-by-row for traceable counts.
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

  for (const row of evalEvidenceRows) {
    // eslint-disable-next-line no-await-in-loop -- repair updates are intentionally applied row-by-row for traceable counts.
    const candidate = await findCurrentChunkForEvidence(row);
    if (!candidate) continue;
    // eslint-disable-next-line no-await-in-loop -- repair updates are intentionally applied row-by-row for traceable counts.
    await client.run(sql`
      UPDATE "MemoryEvalEvidence"
      SET
        "expectedChunkId" = ${candidate.id},
        "updatedAt" = ${nowIso}
      WHERE "id" = ${row.id}
        AND "projectId" = ${row.projectId};
    `);
    evalEvidenceRepaired += 1;
  }

  return {
    episodeEvidenceScanned: episodeEvidenceRows.length,
    episodeEvidenceRepaired,
    episodeEvidenceUnresolved:
      episodeEvidenceRows.length - episodeEvidenceRepaired,
    entityMentionScanned: entityMentionRows.length,
    entityMentionRepaired,
    entityMentionUnresolved: entityMentionRows.length - entityMentionRepaired,
    evalEvidenceScanned: evalEvidenceRows.length,
    evalEvidenceRepaired,
    evalEvidenceUnresolved: evalEvidenceRows.length - evalEvidenceRepaired,
  };
}

async function findCurrentChunkForEvidence(
  row: StaleEvidenceRow,
): Promise<ChunkCandidateRow | null> {
  const exactQuoteCandidates = await db.getClient().all<ChunkCandidateRow>(sql`
    SELECT
      chunk."id",
      chunk."contentHash"
    FROM "MemoryChunk" chunk
    WHERE chunk."projectId" = ${row.projectId}
      AND (${row.sourceContentHash} = '' OR chunk."sourceContentHash" = ${row.sourceContentHash})
      AND (${row.chapterId} IS NULL OR chunk."chapterId" = ${row.chapterId})
      AND instr(chunk."content", ${row.quote}) > 0
    ORDER BY chunk."chunkIndex" ASC
    LIMIT 1;
  `);
  if (exactQuoteCandidates[0]) return exactQuoteCandidates[0];

  const fuzzyQuoteCandidate = await findChunkByQuoteTokenOverlap(row);
  if (fuzzyQuoteCandidate) return fuzzyQuoteCandidate;

  const fallbackCandidates = await db.getClient().all<ChunkCandidateRow>(sql`
    SELECT
      chunk."id",
      chunk."contentHash"
    FROM "MemoryChunk" chunk
    WHERE chunk."projectId" = ${row.projectId}
      AND (${row.sourceContentHash} = '' OR chunk."sourceContentHash" = ${row.sourceContentHash})
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
      chunk."chunkIndex" ASC
    LIMIT 1;
  `);
  return fallbackCandidates[0] ?? null;
}

async function findChunkByQuoteTokenOverlap(
  row: StaleEvidenceRow,
): Promise<ChunkCandidateRow | null> {
  const tokens = extractEvidenceTokens(row.quote);
  if (tokens.length < 3) return null;
  const candidates = await db.getClient().all<ChunkTextCandidateRow>(sql`
    SELECT
      chunk."id",
      chunk."contentHash",
      chunk."content",
      chunk."chunkIndex"
    FROM "MemoryChunk" chunk
    WHERE chunk."projectId" = ${row.projectId}
      AND (${row.sourceContentHash} = '' OR chunk."sourceContentHash" = ${row.sourceContentHash})
      AND (${row.chapterId} IS NULL OR chunk."chapterId" = ${row.chapterId})
    ORDER BY chunk."chunkIndex" ASC
    LIMIT 500;
  `);
  const ranked = candidates
    .map((candidate) => ({
      candidate,
      score: countTokenOverlap(tokens, candidate.content),
    }))
    .filter((item) => item.score >= Math.min(4, Math.ceil(tokens.length * 0.45)))
    .sort((a, b) =>
      b.score === a.score
        ? a.candidate.chunkIndex - b.candidate.chunkIndex
        : b.score - a.score,
    );
  const best = ranked[0]?.candidate;
  return best ? { id: best.id, contentHash: best.contentHash } : null;
}

function extractEvidenceTokens(value: string): string[] {
  return Array.from(
    new Set(
      value
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .split(/\s+/)
        .map((token) =>
          token
            .trim()
            .toLowerCase()
            .replace(
              /(으로만|에게만|에서는|으로는|에게는|으로|에게|에서|부터|까지|처럼|보다|과는|와는|에는|의|은|는|이|가|을|를|와|과|도|만|로)$/u,
              "",
            ),
        )
        .filter((token) => token.length >= 2),
    ),
  );
}

function countTokenOverlap(tokens: string[], content: string): number {
  const normalizedContent = content.toLowerCase();
  return tokens.filter((token) => normalizedContent.includes(token)).length;
}
