import {
  formatLayer,
  LAYER0_CHAR_LIMIT,
} from "./internal/contextAssembler.constants.js";
import type {
  RagQaEvidence,
  NarrativeMemoryQueryResult,
} from "../../../../shared/types/index.js";
import {
  buildLayer0ProjectSummary,
  buildLayer1ChapterSummaries,
  buildLayer2WorldContext,
  buildLayer3Evidence,
} from "./internal/contextAssembler.layers.js";
import {
  formatNarrativeMemoryQueryResult,
  narrativeMemoryQueryService,
} from "../memory/query/narrativeMemoryQueryService.js";
import type { RagEmbeddingProvider } from "./internal/contextAssembler.types.js";
import { loadRagPromptConfig } from "./ragPromptConfig.js";

export type RagContextPacket = {
  systemPrompt: string;
  userPrompt: string;
  evidence: RagQaEvidence[];
  narrativeMemory: NarrativeMemoryQueryResult;
};

function throwIfAborted(signal?: AbortSignal): void {
  signal?.throwIfAborted();
}

export async function assembleRagContext(input: {
  projectId: string;
  question: string;
  chapterId?: string;
  includePriorMemory?: boolean;
  signal?: AbortSignal;
  contextBudget?: number;
  embedTexts?: RagEmbeddingProvider;
}): Promise<RagContextPacket> {
  throwIfAborted(input.signal);
  const budget = input.contextBudget ?? 8_192;
  const layer1Limit = Math.max(
    1_000,
    budget - LAYER0_CHAR_LIMIT - 4_000 - 2_000,
  );

  const [layer0, layer1, layer2, narrativeMemory, layer3, promptConfig] =
    await Promise.all([
      buildLayer0ProjectSummary(input.projectId),
      buildLayer1ChapterSummaries(input.projectId, layer1Limit),
      buildLayer2WorldContext(input.projectId),
      narrativeMemoryQueryService.query({
        projectId: input.projectId,
        question: input.question,
        chapterId: input.chapterId,
        includePriorMemory: input.includePriorMemory,
      }),
      buildLayer3Evidence(input.projectId, input.question, input.embedTexts),
      loadRagPromptConfig(),
    ]);
  throwIfAborted(input.signal);

  const systemPrompt = [promptConfig.systemInstruction].join("\n");

  const userPrompt = [
    formatLayer("Layer 0 — Project Summary", layer0),
    formatLayer("Layer 1 — Chapter Summaries", layer1),
    formatLayer("Layer 2 — World Context", layer2),
    formatLayer(
      "Layer 2.5 — Narrative Memory Query",
      formatNarrativeMemoryQueryResult(narrativeMemory),
    ),
    formatLayer("Layer 3 — Retrieved Evidence", layer3.section),
    `## Focus Chapter\n${input.chapterId ?? "(not specified)"}`,
    `## User Question\n${input.question}`,
    [
      "## Output Rules",
      "- 한국어",
      "- 자연스러운 대화형 답변",
      '- 검색된 근거로 직접 확인할 수 없는 내용은 확정하지 말고 "근거 부족" 또는 "추정"이라고 명시',
      "- Layer 3이 `(no evidence found)`이면 원문 근거가 없다고 먼저 말하고 확정 답변을 피할 것",
    ].join("\n"),
  ].join("\n\n");

  return {
    systemPrompt,
    userPrompt,
    evidence: layer3.evidence,
    narrativeMemory,
  };
}
