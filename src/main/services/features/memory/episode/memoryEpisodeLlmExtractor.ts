import { z } from "zod";
import { utilityProcessBridge } from "../../utility/utilityProcessBridge.js";
import type {
  MemoryEpisodeExtractor,
  MemoryEpisodeExtractorCandidate,
  MemoryEpisodeExtractionChunk,
} from "./memoryEpisodeExtractionProcessor.js";

const EpisodeEvidenceSchema = z.object({
  chunkId: z.string().min(1),
  quote: z.string().min(1),
  startOffset: z.number().int().nullable(),
  endOffset: z.number().int().nullable(),
});

const EpisodeCandidateSchema = z.object({
  episodeType: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  evidence: z.array(EpisodeEvidenceSchema).min(1),
});

const EpisodeExtractorResponseSchema = z.object({
  episodes: z.array(EpisodeCandidateSchema),
});

function stripJsonFence(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced?.[1]?.trim() ?? trimmed;
}

function parseEpisodeExtractorResponse(
  text: string,
): MemoryEpisodeExtractorCandidate[] {
  const parsed = EpisodeExtractorResponseSchema.parse(
    JSON.parse(stripJsonFence(text)),
  );
  return parsed.episodes;
}

function buildEpisodeExtractionPrompt(
  chunks: MemoryEpisodeExtractionChunk[],
): string {
  const chunkLines = chunks.map((chunk) =>
    [
      `chunkId: ${chunk.chunkId}`,
      `startOffset: ${chunk.startOffset ?? "null"}`,
      `endOffset: ${chunk.endOffset ?? "null"}`,
      "text:",
      chunk.content,
    ].join("\n"),
  );
  return [
    "너는 장편 웹소설의 episode memory extractor다.",
    "입력 chunk에 명시적으로 근거가 있는 주요 서사 사건만 추출하라.",
    "근거 없는 추론, 미래 정보, 요약만으로 만든 사실은 금지한다.",
    "응답은 JSON 객체 하나만 출력한다. 코드블록, 설명, markdown은 금지한다.",
    "",
    "JSON schema:",
    `{"episodes":[{"episodeType":"character_learns_secret|relation_changes|major_event|promise_opened|promise_resolved|character_appears|other","title":"string","summary":"string","evidence":[{"chunkId":"string","quote":"입력 chunk에서 정확히 복사한 근거 문장 또는 구절","startOffset":number|null,"endOffset":number|null}]}]}`,
    "",
    "chunks:",
    chunkLines.join("\n\n---\n\n"),
  ].join("\n");
}

function assertKnownEvidenceChunks(
  candidates: MemoryEpisodeExtractorCandidate[],
  chunks: MemoryEpisodeExtractionChunk[],
): void {
  const chunkIds = new Set(chunks.map((chunk) => chunk.chunkId));
  for (const candidate of candidates) {
    for (const evidence of candidate.evidence) {
      if (!chunkIds.has(evidence.chunkId)) {
        throw new Error(
          `MEMORY_EPISODE_LLM_UNKNOWN_EVIDENCE_CHUNK:${evidence.chunkId}`,
        );
      }
    }
  }
}

export function createLlmEpisodeExtractor(): MemoryEpisodeExtractor {
  return async (input) => {
    const generated = await utilityProcessBridge.generateText(
      input.projectId,
      buildEpisodeExtractionPrompt(input.chunks),
      {
        maxTokens: 1200,
        temperature: 0.1,
      },
    );
    const candidates = parseEpisodeExtractorResponse(generated.text);
    assertKnownEvidenceChunks(candidates, input.chunks);
    return candidates;
  };
}

export const llmEpisodeExtractor = createLlmEpisodeExtractor();
