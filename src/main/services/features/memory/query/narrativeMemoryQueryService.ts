import type {
  MemoryConflictQueueInput,
  MemoryConflictQueueItem,
  MemoryConflictQueueResult,
  NarrativeMemoryFactResult,
  NarrativeMemoryQueryInput,
  NarrativeMemoryQueryResult,
} from "../../../../../shared/types/search.js";
import { createLogger } from "../../../../../shared/logger/index.js";
import { fetchConflictFactPairs, toNarrativeMemoryFactSummary } from "./internal/conflicts.js";
import { fetchFactEvidence } from "./internal/evidence.js";
import { formatNarrativeMemoryQueryResult } from "./internal/formatter.js";
import { extractEntityNamesFromQuestion, buildNarrativeMemoryQueryPlan } from "./internal/plan.js";
import { fetchNarrativeSummaryFacts, fetchChapterSummaryFacts } from "./internal/summaries.js";
import { resolveChapterOrder, resolveChapterOrderByChapterId } from "./internal/chapter.js";
import { fetchTemporalFacts } from "./internal/temporal.js";
import { loadEntityProfiles, resolveMemoryEntityIds } from "./internal/entity.js";

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

export { buildNarrativeMemoryQueryPlan, formatNarrativeMemoryQueryResult };

export class NarrativeMemoryQueryService {
  async query(input: NarrativeMemoryQueryInput): Promise<NarrativeMemoryQueryResult> {
    const plan = buildNarrativeMemoryQueryPlan(input.question);
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
    const resolvedEntityIds = await resolveMemoryEntityIds({
      projectId: input.projectId,
      entityId: input.entityId,
      entityName: input.entityName,
      entityNames: input.entityNames,
      entityType: input.entityType,
    });
    const entityNames = input.entityNames?.length
      ? [...input.entityNames]
      : input.entityName
        ? [input.entityName]
        : extractEntityNamesFromQuestion(input.question);

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
      status:
        hasConflict
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
}

export const narrativeMemoryQueryService = new NarrativeMemoryQueryService();
