import { resolveApprovedGoodTargets } from "./review-decision";
import {
  addIssue,
  type ValidationContext,
  type ValidationState,
} from "./context";

function buildReviewTargets(state: ValidationState): Map<string, string> {
  const { corpus, sourceDocuments } = state;
  const targets = new Map<string, string>();
  targets.set(`world:${corpus.world.worldId}`, corpus.world.revision);
  for (const item of corpus.characters) {
    targets.set(`character:${item.characterId}`, item.revision);
  }
  for (const item of corpus.events) targets.set(`event:${item.eventId}`, item.revision);
  for (const item of corpus.relationshipTransitions) {
    targets.set(`relationship_transition:${item.transitionId}`, item.revision);
  }
  for (const item of corpus.knowledgeStates) {
    targets.set(`knowledge_state:${item.knowledgeStateId}`, item.revision);
  }
  for (const item of corpus.foreshadowing) {
    targets.set(`foreshadowing:${item.foreshadowId}`, item.revision);
  }
  for (const item of sourceDocuments) {
    targets.set(`source_document:${item.sourceId}`, item.sha256);
  }
  for (const item of corpus.retrievalQueries) {
    targets.set(`retrieval_query:${item.queryId}`, item.revision);
  }
  for (const item of corpus.reasoningQueries) {
    targets.set(`reasoning_query:${item.queryId}`, item.revision);
  }
  return targets;
}

function validateReviewRecords(
  state: ValidationState,
  ctx: ValidationContext,
): void {
  const targets = buildReviewTargets(state);
  state.corpus.humanReviews.forEach((review, index) => {
    const path = ["corpus", "humanReviews", index];
    const targetRevision = targets.get(`${review.targetType}:${review.targetId}`);
    if (!targetRevision) {
      addIssue(ctx, "Unknown human review target", [...path, "targetId"]);
    } else {
      const isStale = targetRevision !== review.reviewedRevision;
      if (isStale && review.status !== "stale") {
        addIssue(ctx, "Review must be stale after target revision changes", [
          ...path,
          "status",
        ]);
      }
      if (!isStale && review.status === "stale") {
        addIssue(ctx, "Review marked stale despite matching revision", [
          ...path,
          "status",
        ]);
      }
    }
    if (review.label === "GOOD" && review.status !== "approved") {
      addIssue(ctx, "GOOD review must be approved", [...path, "status"]);
    }
    if (review.label === "BAD" && review.status !== "rejected") {
      addIssue(ctx, "BAD review must be rejected", [...path, "status"]);
    }
    if (review.label === "AMBIGUOUS" && review.status !== "needs_adjudication") {
      addIssue(ctx, "AMBIGUOUS review needs adjudication", [...path, "status"]);
    }
  });
}

function validateEligibility(
  state: ValidationState,
  ctx: ValidationContext,
): void {
  const { corpus, sourceDocuments } = state;
  if (!corpus.manifest.benchmarkEligibility) return;
  if (corpus.manifest.humanReviewStatus !== "approved") {
    addIssue(ctx, "Eligible benchmark requires approved human review status", [
      "corpus",
      "manifest",
      "humanReviewStatus",
    ]);
  }

  if (corpus.retrievalQueries.length === 0) {
    addIssue(ctx, "Eligible benchmark requires at least one retrieval query", [
      "corpus",
      "retrievalQueries",
    ]);
  }
  if (corpus.reasoningQueries.length === 0) {
    addIssue(ctx, "Eligible benchmark requires at least one reasoning query", [
      "corpus",
      "reasoningQueries",
    ]);
  }

  if (
    corpus.manifest.genres.includes("contemporary") &&
    corpus.manifest.genres.includes("romance")
  ) {
    const retrievalTaxonomies = new Set(
      corpus.retrievalQueries.map((query) => query.taxonomy),
    );
    const reasoningTaxonomies = new Set(
      corpus.reasoningQueries.map((query) => query.taxonomy),
    );
    for (const taxonomy of ["entity_retrieval", "fact_retrieval"] as const) {
      if (!retrievalTaxonomies.has(taxonomy)) {
        addIssue(ctx, `Eligible contemporary romance pack lacks retrieval taxonomy: ${taxonomy}`, [
          "corpus",
          "retrievalQueries",
        ]);
      }
    }
    for (const taxonomy of [
      "relationship_state",
      "relationship_change",
      "character_knowledge",
    ] as const) {
      if (!reasoningTaxonomies.has(taxonomy)) {
        addIssue(ctx, `Eligible contemporary romance pack lacks reasoning taxonomy: ${taxonomy}`, [
          "corpus",
          "reasoningQueries",
        ]);
      }
    }
  }

  const targetRevisions = buildReviewTargets(state);
  const approvedGoodTargets = resolveApprovedGoodTargets(
    corpus.humanReviews,
    targetRevisions,
    ctx,
  );
  if (!approvedGoodTargets.has(`blueprint:world:${corpus.world.worldId}`)) {
    addIssue(ctx, "Eligible benchmark lacks approved GOOD blueprint review", [
      "corpus",
      "humanReviews",
    ]);
  }
  for (const source of sourceDocuments) {
    if (!approvedGoodTargets.has(`manuscript:source_document:${source.sourceId}`)) {
      addIssue(
        ctx,
        `Eligible source document lacks approved GOOD manuscript review: ${source.sourceId}`,
        ["corpus", "humanReviews"],
      );
    }
  }
  for (const query of corpus.retrievalQueries) {
    if (!approvedGoodTargets.has(`query_gold:retrieval_query:${query.queryId}`)) {
      addIssue(
        ctx,
        `Eligible retrieval query lacks approved GOOD review: ${query.queryId}`,
        ["corpus", "humanReviews"],
      );
    }
  }
  for (const query of corpus.reasoningQueries) {
    if (!approvedGoodTargets.has(`query_gold:reasoning_query:${query.queryId}`)) {
      addIssue(
        ctx,
        `Eligible reasoning query lacks approved GOOD review: ${query.queryId}`,
        ["corpus", "humanReviews"],
      );
    }
  }
}

export function validateReviews(
  state: ValidationState,
  ctx: ValidationContext,
): void {
  validateReviewRecords(state, ctx);
  validateEligibility(state, ctx);
}
