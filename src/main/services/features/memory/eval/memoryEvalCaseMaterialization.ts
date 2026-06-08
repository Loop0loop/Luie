import crypto from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import {
  db,
  memoryEpisode,
  memoryEpisodeEvidence,
  memoryEvalCase,
  memoryEvalEvidence,
} from "../../../../infra/database/index.js";

type EpisodeEvidenceEvalSeedRow = {
  evidenceId: string;
  projectId: string;
  episodeTitle: string;
  episodeSummary: string;
  chapterId: string | null;
  chunkId: string | null;
  startOffset: number | null;
  endOffset: number | null;
  quote: string;
};

export async function materializeMemoryEvalCasesFromEpisodeEvidence(input: {
  projectId: string;
  nowIso?: string;
  limit?: number;
}): Promise<{ inspected: number; created: number; skipped: number }> {
  const nowIso = input.nowIso ?? new Date().toISOString();
  const limit = Math.max(1, input.limit ?? 20);
  const client = db.getClient();
  const rows = await client
    .select({
      evidenceId: memoryEpisodeEvidence.id,
      projectId: memoryEpisodeEvidence.projectId,
      episodeTitle: memoryEpisode.title,
      episodeSummary: memoryEpisode.summary,
      chapterId: memoryEpisodeEvidence.chapterId,
      chunkId: memoryEpisodeEvidence.chunkId,
      startOffset: memoryEpisodeEvidence.startOffset,
      endOffset: memoryEpisodeEvidence.endOffset,
      quote: memoryEpisodeEvidence.quote,
    })
    .from(memoryEpisodeEvidence)
    .innerJoin(
      memoryEpisode,
      eq(memoryEpisode.id, memoryEpisodeEvidence.episodeId),
    )
    .where(eq(memoryEpisodeEvidence.projectId, input.projectId))
    .limit(limit);

  let created = 0;
  let skipped = 0;

  for (const row of rows) {
    const name = `episode evidence: ${row.episodeTitle}`;
    const existing = await client
      .select({ id: memoryEvalCase.id })
      .from(memoryEvalCase)
      .where(
        and(
          eq(memoryEvalCase.projectId, input.projectId),
          eq(memoryEvalCase.name, name),
        ),
      )
      .limit(1);
    if (existing.length > 0) {
      skipped += 1;
      continue;
    }
    await insertEvalCaseFromEpisodeEvidence(row, name, nowIso);
    created += 1;
  }

  return { inspected: rows.length, created, skipped };
}

async function insertEvalCaseFromEpisodeEvidence(
  row: EpisodeEvidenceEvalSeedRow,
  name: string,
  nowIso: string,
): Promise<void> {
  const caseId = crypto.randomUUID();
  db.getClient().transaction((tx) => {
    tx.insert(memoryEvalCase)
      .values({
        id: caseId,
        projectId: row.projectId,
        name,
        question: `${row.episodeTitle}의 근거를 찾아라.`,
        caseType: "qa",
        expectedAnswer: row.episodeSummary,
        temporalScopeStartChapterId: row.chapterId,
        temporalScopeEndChapterId: row.chapterId,
        severity: "p1",
        updatedAt: nowIso,
      })
      .run();
    tx.insert(memoryEvalEvidence)
      .values({
        id: crypto.randomUUID(),
        caseId,
        projectId: row.projectId,
        chapterId: row.chapterId,
        expectedChunkId: row.chunkId,
        startOffset: row.startOffset,
        endOffset: row.endOffset,
        quote: row.quote,
        updatedAt: nowIso,
      })
      .run();
  });
}

export async function countMemoryEvalCases(input: {
  projectId: string;
}): Promise<{ evalCaseCount: number; evalEvidenceCount: number }> {
  const [caseRows, evidenceRows] = await Promise.all([
    db.getClient().all<{ count: number }>(sql`
      SELECT COUNT(*) AS count FROM "MemoryEvalCase"
      WHERE "projectId" = ${input.projectId};
    `),
    db.getClient().all<{ count: number }>(sql`
      SELECT COUNT(*) AS count FROM "MemoryEvalEvidence"
      WHERE "projectId" = ${input.projectId};
    `),
  ]);
  return {
    evalCaseCount: Number(caseRows[0]?.count ?? 0),
    evalEvidenceCount: Number(evidenceRows[0]?.count ?? 0),
  };
}
