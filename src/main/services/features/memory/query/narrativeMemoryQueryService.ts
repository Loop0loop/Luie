import type {
  MemoryConflictQueueItem,
  MemoryEpisodeCalibrationRequest,
  MemoryEpisodeCalibrationResult,
  NarrativeMemoryIntentCalibrationRequest,
  NarrativeMemoryIntentCalibrationResult,
  NarrativeMemoryFactResult,
  NarrativeMemoryQueryInput,
  NarrativeMemoryQueryResult,
} from "../../../../../shared/types/search.js";
import type {
  MemoryEvalFeedbackRecordRequest,
  MemoryEvalFeedbackRecordResult,
  MemoryEvalLiveRunnerResult,
  MemoryEvalRunRequest,
} from "../../../../../shared/types/memoryEval.js";
import { createLogger } from "../../../../../shared/logger/index.js";
import {
  fetchConflictFactPairs,
  toNarrativeMemoryFactSummary,
} from "./internal/conflicts.js";
import { fetchFactEvidence } from "./internal/evidence.js";
import { formatNarrativeMemoryQueryResult } from "./internal/formatter.js";
import {
  classifyNarrativeMemoryQueryPlanWithLlm,
  isLlmNarrativeMemoryIntentClassifierEnabled,
} from "./internal/llmIntentClassifier.js";
import {
  extractEntityNamesFromQuestion,
  buildNarrativeMemoryQueryPlan,
} from "./internal/plan.js";
import {
  fetchNarrativeSummaryFacts,
  fetchChapterSummaryFacts,
} from "./internal/summaries.js";
import { resolveChapterOrder } from "./internal/chapter.js";
import { fetchTemporalFacts } from "./internal/temporal.js";
import {
  loadEntityProfiles,
  resolveMemoryEntityIds,
} from "./internal/entity.js";
import {
  runNarrativeMemoryEpisodeCalibration,
  runNarrativeMemoryEvalSuite,
  runNarrativeMemoryIntentCalibration,
} from "./narrativeMemoryApplicationFacades.js";
import { recordMemoryEvalFeedback } from "../eval/memoryEvalFeedbackService.js";

const logger = createLogger("NarrativeMemoryQueryService");

function mergeFacts(
  ...groups: NarrativeMemoryFactResult[][]
): NarrativeMemoryFactResult[] {
  const byId = new Map<string, NarrativeMemoryFactResult>();
  for (const fact of groups.flat()) {
    if (!byId.has(fact.id)) {
      byId.set(fact.id, fact);
    }
  }

  return [...byId.values()]
    .sort((a, b) => {
      if (a.observedAtChapterOrder !== b.observedAtChapterOrder) {
        return b.observedAtChapterOrder - a.observedAtChapterOrder;
      }
      return b.confidence - a.confidence;
    })
    .slice(0, 20);
}

export function conflictFactsToNarrativeFacts(
  items: MemoryConflictQueueItem[],
): NarrativeMemoryFactResult[] {
  return items.flatMap((item) => [
    toNarrativeMemoryFactSummary(item.invalidatedFact),
    toNarrativeMemoryFactSummary(item.invalidatingFact),
  ]);
}

export {
  buildNarrativeMemoryQueryPlan,
  extractEntityNamesFromQuestion,
  formatNarrativeMemoryQueryResult,
};

export class NarrativeMemoryQueryService {
  async query(
    input: NarrativeMemoryQueryInput,
  ): Promise<NarrativeMemoryQueryResult> {
    const deterministicPlan = buildNarrativeMemoryQueryPlan(input.question);
    const plan = isLlmNarrativeMemoryIntentClassifierEnabled()
      ? await classifyNarrativeMemoryQueryPlanWithLlm({
          projectId: input.projectId,
          question: input.question,
        }).catch((error: unknown) => {
          logger.warn(
            "LLM memory intent classifier failed; falling back to deterministic route",
            {
              projectId: input.projectId,
              error: error instanceof Error ? error.message : String(error),
            },
          );
          return deterministicPlan;
        })
      : deterministicPlan;
    const trace = plan.sources.map((source) => ({
      source,
      decision: "selected" as const,
      reason: plan.reason,
    }));

    logger.info("Narrative memory query routed", {
      projectId: input.projectId,
      intent: plan.intent,
      sources: plan.sources,
      reason: plan.reason,
    });

    const chapterOrder = await resolveChapterOrder(input);
    const includePriorMemory = input.includePriorMemory === true;
    const entityNames = input.entityNames?.length
      ? [...input.entityNames]
      : input.entityName
        ? [input.entityName]
        : extractEntityNamesFromQuestion(input.question);
    const resolvedEntityIds = await resolveMemoryEntityIds({
      projectId: input.projectId,
      entityId: input.entityId,
      entityName: input.entityName,
      entityNames,
      entityType: input.entityType,
    });

    const facts = await fetchTemporalFacts({
      projectId: input.projectId,
      intent: plan.intent,
      sources: plan.sources,
      chapterOrder,
      entityId: input.entityId,
      resolvedEntityIds,
      entityName: entityNames[0],
      entityNames,
      entityType: input.entityType,
      includePriorMemory,
    });
    const summaryFacts =
      plan.intent === "global-summary"
        ? await fetchNarrativeSummaryFacts({
            projectId: input.projectId,
            chapterOrder,
            includePriorMemory,
          })
        : [];
    const chapterSummaryFacts = plan.sources.includes("chapter_summary")
      ? await fetchChapterSummaryFacts({
          projectId: input.projectId,
          chapterOrder,
          includePriorMemory,
        })
      : [];
    const conflictItems = plan.sources.includes("memory_fact_invalidation")
      ? await fetchConflictFactPairs({
          projectId: input.projectId,
          chapterOrder,
          includePriorMemory,
          entityId: input.entityId,
          entityName: entityNames[0],
          entityNames,
          entityType: input.entityType,
        })
      : [];

    const conflictFacts = conflictFactsToNarrativeFacts(conflictItems);
    const narrativeFacts = mergeFacts(
      facts,
      summaryFacts,
      chapterSummaryFacts,
      conflictFacts,
    );
    const profiles =
      plan.intent === "entity-profile" && resolvedEntityIds
        ? await loadEntityProfiles({
            projectId: input.projectId,
            entityIds: resolvedEntityIds,
            entityType: input.entityType,
          })
        : [];

    const evidence = plan.sources.includes("memory_fact_evidence")
      ? await fetchFactEvidence({
          projectId: input.projectId,
          facts: narrativeFacts,
        })
      : [];

    const hasConflict = narrativeFacts.some(
      (fact) => fact.status === "conflicting",
    );

    return {
      intent: plan.intent,
      status: hasConflict
        ? "conflicting"
        : profiles.length > 0 || evidence.length > 0
          ? "found"
          : "insufficient_evidence",
      trace,
      facts: narrativeFacts,
      profiles,
      evidence,
    };
  }

  async runEvalSuite(
    input: MemoryEvalRunRequest,
  ): Promise<MemoryEvalLiveRunnerResult> {
    return await runNarrativeMemoryEvalSuite({
      request: input,
      query: (queryInput) => this.query(queryInput),
    });
  }

  async recordEvalFeedback(
    input: MemoryEvalFeedbackRecordRequest,
  ): Promise<MemoryEvalFeedbackRecordResult> {
    return await recordMemoryEvalFeedback(input);
  }

  async runIntentCalibration(
    input: NarrativeMemoryIntentCalibrationRequest,
  ): Promise<NarrativeMemoryIntentCalibrationResult> {
    return await runNarrativeMemoryIntentCalibration(input);
  }

  async runEpisodeCalibration(
    input: MemoryEpisodeCalibrationRequest,
  ): Promise<MemoryEpisodeCalibrationResult> {
    return await runNarrativeMemoryEpisodeCalibration(input);
  }
}

export const narrativeMemoryQueryService = new NarrativeMemoryQueryService();
