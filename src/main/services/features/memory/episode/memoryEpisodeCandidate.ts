import crypto from "node:crypto";
import {
  db,
  memoryEpisode,
  memoryEpisodeEvidence,
} from "../../../../infra/database/index.js";

export type MemoryEpisodeCandidateEvidenceInput = {
  chapterId: string | null;
  chunkId: string | null;
  contentHash: string;
  sourceContentHash: string;
  quote: string;
  startOffset: number | null;
  endOffset: number | null;
};

export type MemoryEpisodeCandidateInput = {
  title: string;
  summary: string;
  evidence: MemoryEpisodeCandidateEvidenceInput[];
};

export type MemoryEpisodeCandidateCreateInput = MemoryEpisodeCandidateInput & {
  nowIso: string;
  projectId: string;
  sourceType: string;
  sourceId: string;
  chapterId: string | null;
  sceneId: string | null;
  sourceContentHash: string;
  extractorVersion: string;
  episodeType: string;
};

export function validateMemoryEpisodeCandidate(
  input: MemoryEpisodeCandidateInput,
): void {
  if (input.evidence.length === 0) {
    throw new Error("MEMORY_EPISODE_REQUIRES_EVIDENCE");
  }
  const hasBlankQuote = input.evidence.some(
    (item) => item.quote.trim().length === 0,
  );
  if (hasBlankQuote) {
    throw new Error("MEMORY_EPISODE_REQUIRES_EVIDENCE");
  }
  const hasMissingHash = input.evidence.some(
    (item) =>
      item.contentHash.trim().length === 0 ||
      item.sourceContentHash.trim().length === 0,
  );
  if (hasMissingHash) {
    throw new Error("MEMORY_EPISODE_EVIDENCE_REQUIRES_HASH");
  }
}

export function buildMemoryEpisodeExtractionKey(input: {
  projectId: string;
  sourceType: string;
  sourceId: string;
  sourceContentHash: string;
  extractorVersion: string;
}): string {
  return [
    input.projectId,
    input.sourceType,
    input.sourceId,
    input.sourceContentHash,
    input.extractorVersion,
  ].join(":");
}

export function createMemoryEpisodeCandidateRows(
  input: MemoryEpisodeCandidateCreateInput,
): {
  episode: {
    id: string;
    projectId: string;
    sourceType: string;
    sourceId: string;
    chapterId: string | null;
    sceneId: string | null;
    sourceContentHash: string;
    extractorVersion: string;
    episodeType: string;
    title: string;
    summary: string;
    status: "suggested";
    confidence: number;
    updatedAt: string;
  };
  evidence: Array<{
    id: string;
    projectId: string;
    episodeId: string;
    chapterId: string | null;
    chunkId: string | null;
    contentHash: string;
    sourceContentHash: string;
    startOffset: number | null;
    endOffset: number | null;
    quote: string;
    updatedAt: string;
  }>;
} {
  validateMemoryEpisodeCandidate(input);
  const episodeId = crypto.randomUUID();
  return {
    episode: {
      id: episodeId,
      projectId: input.projectId,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      chapterId: input.chapterId,
      sceneId: input.sceneId,
      sourceContentHash: input.sourceContentHash,
      extractorVersion: input.extractorVersion,
      episodeType: input.episodeType,
      title: input.title,
      summary: input.summary,
      status: "suggested",
      confidence: 0,
      updatedAt: input.nowIso,
    },
    evidence: input.evidence.map((item) => ({
      id: crypto.randomUUID(),
      projectId: input.projectId,
      episodeId,
      chapterId: item.chapterId,
      chunkId: item.chunkId,
      contentHash: item.contentHash,
      sourceContentHash: item.sourceContentHash,
      startOffset: item.startOffset,
      endOffset: item.endOffset,
      quote: item.quote,
      updatedAt: input.nowIso,
    })),
  };
}

export async function createMemoryEpisodeCandidate(
  input: MemoryEpisodeCandidateCreateInput,
): Promise<ReturnType<typeof createMemoryEpisodeCandidateRows>> {
  const rows = createMemoryEpisodeCandidateRows(input);
  db.getClient().transaction((tx) => {
    tx.insert(memoryEpisode).values(rows.episode).run();
    for (const evidence of rows.evidence) {
      tx.insert(memoryEpisodeEvidence).values(evidence).run();
    }
  });
  return rows;
}
