import type {
  MemoryConflictQueueInput,
  MemoryConflictQueueItem,
  MemoryConflictQueueResult,
  MemoryEpisodeCalibrationRequest,
  MemoryEpisodeCalibrationResult,
  MemoryEpisodeConfirmInput,
  MemoryEntityAliasConfirmInput,
  MemoryEntityAliasRejectInput,
  MemoryEntityAliasReviewMutationResult,
  MemoryEntityAliasReviewQueueInput,
  MemoryEntityAliasReviewQueueResult,
  MemoryEntityAliasSplitInput,
  MemoryEntityAliasSplitResult,
  MemoryEntityConfirmInput,
  MemoryEntityMergeInput,
  MemoryEntityMergeResult,
  MemoryEntityRejectInput,
  MemoryEntityReviewMutationResult,
  MemoryEntityReviewQueueInput,
  MemoryEntityReviewQueueResult,
  MemoryEpisodeRejectInput,
  MemoryEpisodeRejectResult,
  MemoryEpisodeReviewMutationResult,
  MemoryEpisodeReviewQueueInput,
  MemoryEpisodeReviewQueueResult,
  MemoryTemporalFactConfirmInput,
  MemoryTemporalFactConflictResolveInput,
  MemoryTemporalFactRejectInput,
  MemoryTemporalFactReviewMutationResult,
  MemoryTemporalFactReviewQueueInput,
  MemoryTemporalFactReviewQueueResult,
  NarrativeMemoryIntentCalibrationRequest,
  NarrativeMemoryIntentCalibrationResult,
  NarrativeMemoryFactResult,
  NarrativeMemoryQueryInput,
  NarrativeMemoryQueryResult,
} from "../../../../../shared/types/search.js";
import type {
  MemoryEvalLiveRunnerResult,
  MemoryEvalRunRequest,
} from "../../../../../shared/types/memoryEval.js";
import { createLogger } from "../../../../../shared/logger/index.js";
import {
  confirmMemoryEntity,
  confirmMemoryEntityAlias,
  listSuggestedMemoryEntities,
  listSuggestedMemoryEntityAliases,
  mergeMemoryEntities,
  rejectMemoryEntity,
  rejectMemoryEntityAlias,
  splitMemoryEntityAlias,
} from "../entity/memoryEntityReviewService.js";
import {
  confirmMemoryEpisode,
  listSuggestedMemoryEpisodes,
  rejectMemoryEpisode,
} from "../episode/memoryEpisodeReviewService.js";
import {
  createDefaultMemoryEpisodeCalibrationCases,
  runMemoryEpisodeExtractorCalibration,
} from "../episode/memoryEpisodeExtractorCalibration.js";
import { llmEpisodeExtractor } from "../episode/memoryEpisodeLlmExtractor.js";
import {
  confirmMemoryTemporalFact,
  listSuggestedMemoryTemporalFacts,
  rejectMemoryTemporalFact,
  resolveMemoryTemporalFactConflict,
} from "../temporal/memoryTemporalFactReviewService.js";
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
import {
  resolveChapterOrder,
  resolveChapterOrderByChapterId,
} from "./internal/chapter.js";
import { fetchTemporalFacts } from "./internal/temporal.js";
import {
  loadEntityProfiles,
  resolveMemoryEntityIds,
} from "./internal/entity.js";
import { runLiveMemoryEvalSuite } from "../eval/memoryEvalRunner.js";
import {
  createDefaultNarrativeMemoryIntentCalibrationCases,
  runNarrativeMemoryIntentClassifierCalibration,
} from "./internal/memoryIntentClassifierCalibration.js";

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
    return await runLiveMemoryEvalSuite({
      projectId: input.projectId,
      label: input.label,
      engineVersion: "narrative-memory-query-service",
      topK: input.topK ?? 5,
      answerer: async (evalCase) => {
        const result = await this.query({
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

  async runIntentCalibration(
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

  async runEpisodeCalibration(
    input: MemoryEpisodeCalibrationRequest,
  ): Promise<MemoryEpisodeCalibrationResult> {
    return await runMemoryEpisodeExtractorCalibration({
      extractor: llmEpisodeExtractor,
      cases: createDefaultMemoryEpisodeCalibrationCases(input.projectId),
    });
  }

  async getConflictQueue(
    input: MemoryConflictQueueInput,
  ): Promise<MemoryConflictQueueResult> {
    const chapterOrder = await resolveChapterOrderByChapterId({
      projectId: input.projectId,
      chapterId: input.chapterId,
    });

    const items = await fetchConflictFactPairs({
      projectId: input.projectId,
      chapterOrder,
      includePriorMemory: input.includePriorMemory ?? false,
      entityId: input.entityId,
      entityName: input.entityName,
      entityType: input.entityType,
      limit: input.limit,
    });

    return { items };
  }

  async listSuggestedEpisodes(
    input: MemoryEpisodeReviewQueueInput,
  ): Promise<MemoryEpisodeReviewQueueResult> {
    return await listSuggestedMemoryEpisodes(input);
  }

  async confirmEpisode(
    input: MemoryEpisodeConfirmInput,
  ): Promise<MemoryEpisodeReviewMutationResult> {
    return await confirmMemoryEpisode(input);
  }

  async rejectEpisode(
    input: MemoryEpisodeRejectInput,
  ): Promise<MemoryEpisodeRejectResult> {
    return await rejectMemoryEpisode(input);
  }

  async listSuggestedFacts(
    input: MemoryTemporalFactReviewQueueInput,
  ): Promise<MemoryTemporalFactReviewQueueResult> {
    return await listSuggestedMemoryTemporalFacts(input);
  }

  async confirmFact(
    input: MemoryTemporalFactConfirmInput,
  ): Promise<MemoryTemporalFactReviewMutationResult> {
    return await confirmMemoryTemporalFact(input);
  }

  async rejectFact(
    input: MemoryTemporalFactRejectInput,
  ): Promise<MemoryTemporalFactReviewMutationResult> {
    return await rejectMemoryTemporalFact(input);
  }

  async resolveFactConflict(
    input: MemoryTemporalFactConflictResolveInput,
  ): Promise<MemoryTemporalFactReviewMutationResult> {
    return await resolveMemoryTemporalFactConflict(input);
  }

  async listSuggestedEntityAliases(
    input: MemoryEntityAliasReviewQueueInput,
  ): Promise<MemoryEntityAliasReviewQueueResult> {
    return await listSuggestedMemoryEntityAliases(input);
  }

  async listSuggestedEntities(
    input: MemoryEntityReviewQueueInput,
  ): Promise<MemoryEntityReviewQueueResult> {
    return await listSuggestedMemoryEntities(input);
  }

  async confirmEntity(
    input: MemoryEntityConfirmInput,
  ): Promise<MemoryEntityReviewMutationResult> {
    return await confirmMemoryEntity(input);
  }

  async rejectEntity(
    input: MemoryEntityRejectInput,
  ): Promise<MemoryEntityReviewMutationResult> {
    return await rejectMemoryEntity(input);
  }

  async confirmEntityAlias(
    input: MemoryEntityAliasConfirmInput,
  ): Promise<MemoryEntityAliasReviewMutationResult> {
    return await confirmMemoryEntityAlias(input);
  }

  async rejectEntityAlias(
    input: MemoryEntityAliasRejectInput,
  ): Promise<MemoryEntityAliasReviewMutationResult> {
    return await rejectMemoryEntityAlias(input);
  }

  async splitEntityAlias(
    input: MemoryEntityAliasSplitInput,
  ): Promise<MemoryEntityAliasSplitResult> {
    return await splitMemoryEntityAlias(input);
  }

  async mergeEntity(
    input: MemoryEntityMergeInput,
  ): Promise<MemoryEntityMergeResult> {
    return await mergeMemoryEntities(input);
  }
}

export const narrativeMemoryQueryService = new NarrativeMemoryQueryService();
