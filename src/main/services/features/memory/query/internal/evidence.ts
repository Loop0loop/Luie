import { and, eq, inArray } from "drizzle-orm";
import { db } from "../../../../../database/main/databaseService.js";
import {
  memoryEpisodeEvidence,
  memoryFactEvidence,
} from "../../../../../database/schema/index.js";
import type { NarrativeMemoryFactResult, RagQaEvidence } from "../../../../../../shared/types/search.js";

export async function countFactEvidence(input: {
  projectId: string;
  factIds: string[];
}): Promise<Map<string, number>> {
  if (input.factIds.length === 0) return new Map();

  const rows = await db
    .getClient()
    .select({ factId: memoryFactEvidence.factId })
    .from(memoryFactEvidence)
    .innerJoin(
      memoryEpisodeEvidence,
      eq(memoryEpisodeEvidence.id, memoryFactEvidence.evidenceId),
    )
    .where(
      and(
        eq(memoryFactEvidence.projectId, input.projectId),
        eq(memoryEpisodeEvidence.projectId, input.projectId),
        inArray(memoryFactEvidence.factId, input.factIds),
      ),
    );

  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.factId, (counts.get(row.factId) ?? 0) + 1);
  }
  return counts;
}

export async function fetchFactEvidence(input: {
  projectId: string;
  facts: NarrativeMemoryFactResult[];
}): Promise<RagQaEvidence[]> {
  const factIds = input.facts.map((fact) => fact.id);
  if (factIds.length === 0) return [];

  const rows = await db
    .getClient()
    .select({
      factId: memoryFactEvidence.factId,
      chunkId: memoryEpisodeEvidence.chunkId,
      chapterId: memoryEpisodeEvidence.chapterId,
      startOffset: memoryEpisodeEvidence.startOffset,
      quote: memoryEpisodeEvidence.quote,
    })
    .from(memoryFactEvidence)
    .innerJoin(
      memoryEpisodeEvidence,
      eq(memoryEpisodeEvidence.id, memoryFactEvidence.evidenceId),
    )
    .where(
      and(
        eq(memoryFactEvidence.projectId, input.projectId),
        eq(memoryEpisodeEvidence.projectId, input.projectId),
        inArray(memoryFactEvidence.factId, factIds),
      ),
    )
    .limit(20);

  return rows
    .filter((row) => row.chunkId !== null)
    .map((row) => ({
      chunkId: row.chunkId ?? row.factId,
      chapterId: row.chapterId ?? null,
      offset: row.startOffset ?? 0,
      quote: row.quote,
    }));
}
