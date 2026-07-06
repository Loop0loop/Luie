import type {
  MemoryEpisodeCalibrationRequest,
  MemoryEpisodeCalibrationResult,
  NarrativeMemoryIntentCalibrationRequest,
  NarrativeMemoryIntentCalibrationResult,
  NarrativeMemoryQueryInput,
  NarrativeMemoryQueryResult,
} from "../../../../../shared/types/search.js";
import type {
  MemoryEvalLiveRunnerResult,
  MemoryEvalRunRequest,
} from "../../../../../shared/types/memoryEval.js";
import {
  createDefaultMemoryEpisodeCalibrationCases,
  runMemoryEpisodeExtractorCalibration,
} from "../episode/memoryEpisodeExtractorCalibration.js";
import { llmEpisodeExtractor } from "../episode/memoryEpisodeLlmExtractor.js";
import { runLiveMemoryEvalSuite } from "../eval/memoryEvalRunner.js";
import { formatNarrativeMemoryQueryResult } from "./internal/formatter.js";
import { classifyNarrativeMemoryQueryPlanWithLlm } from "./internal/llmIntentClassifier.js";
import { buildNarrativeMemoryQueryPlan } from "./internal/plan.js";
import {
  createDefaultNarrativeMemoryIntentCalibrationCases,
  runNarrativeMemoryIntentClassifierCalibration,
} from "./internal/memoryIntentClassifierCalibration.js";

export async function runNarrativeMemoryEvalSuite(input: {
  request: MemoryEvalRunRequest;
  query: (input: NarrativeMemoryQueryInput) => Promise<NarrativeMemoryQueryResult>;
}): Promise<MemoryEvalLiveRunnerResult> {
  return await runLiveMemoryEvalSuite({
    projectId: input.request.projectId,
    label: input.request.label,
    engineVersion: "narrative-memory-query-service",
    topK: input.request.topK ?? 5,
    answerer: async (evalCase) => {
      const result = await input.query({
        projectId: evalCase.projectId,
        question: evalCase.question,
        includePriorMemory: true,
      });
      const groundingStatus =
        result.status === "found"
          ? "inferred"
          : result.status === "conflicting"
            ? "conflicting"
            : "insufficient_evidence";

      return {
        answer: formatNarrativeMemoryQueryResult(result),
        groundingStatus,
        evidence: result.evidence,
        observedFacts: result.facts.map((fact) => ({
          id: fact.id,
          status: fact.status,
          observedAtChapterOrder: fact.observedAtChapterOrder,
          usedAs: groundingStatus,
        })),
        observedRelations: result.facts
          .filter((fact) => fact.relatedEntityName)
          .map((fact) => ({
            sourceName: fact.subjectEntityId,
            targetName: fact.relatedEntityName ?? "",
            relation: fact.predicate,
          })),
      };
    },
  });
}

export async function runNarrativeMemoryIntentCalibration(
  input: NarrativeMemoryIntentCalibrationRequest,
): Promise<NarrativeMemoryIntentCalibrationResult> {
  return await runNarrativeMemoryIntentClassifierCalibration({
    projectId: input.projectId,
    cases: createDefaultNarrativeMemoryIntentCalibrationCases(),
    classifier: input.useLlm
      ? classifyNarrativeMemoryQueryPlanWithLlm
      : async ({ question }) => buildNarrativeMemoryQueryPlan(question),
  });
}

export async function runNarrativeMemoryEpisodeCalibration(
  input: MemoryEpisodeCalibrationRequest,
): Promise<MemoryEpisodeCalibrationResult> {
  return await runMemoryEpisodeExtractorCalibration({
    extractor: llmEpisodeExtractor,
    cases: createDefaultMemoryEpisodeCalibrationCases(input.projectId),
  });
}
