import type {
  NarrativeReasoningQuery,
  NarrativeRetrievalQuery,
} from "../../schemas/narrativeBenchmark";
import {
  addIssue,
  type ValidationContext,
  type ValidationState,
} from "./context";

type Query = NarrativeRetrievalQuery | NarrativeReasoningQuery;

function validateQueryScope(
  query: Query,
  collection: "retrievalQueries" | "reasoningQueries",
  index: number,
  evidenceIds: string[],
  state: ValidationState,
  ctx: ValidationContext,
): void {
  const { continuityById, evidenceById, chapterById } = state;
  const path = ["corpus", collection, index];
  const allowed = new Set(query.scope.allowedContinuityIds);
  const forbidden = new Set(query.scope.forbiddenContinuityIds);
  for (const continuityId of [...allowed, ...forbidden]) {
    if (!continuityById.has(continuityId)) {
      addIssue(ctx, `Unknown query continuity: ${continuityId}`, [...path, "scope"]);
    }
  }
  for (const continuityId of allowed) {
    if (forbidden.has(continuityId)) {
      addIssue(ctx, `Continuity is both allowed and forbidden: ${continuityId}`, [
        ...path,
        "scope",
      ]);
    }
  }
  if (query.difficulty === "cross_worldline" && allowed.size < 2) {
    addIssue(ctx, "cross_worldline query requires at least two allowed continuities", [
      ...path,
      "scope",
      "allowedContinuityIds",
    ]);
  }
  for (const evidenceId of evidenceIds) {
    const evidence = evidenceById.get(evidenceId);
    if (!evidence) {
      addIssue(ctx, `Unknown query evidence: ${evidenceId}`, [...path, "evidenceIds"]);
      continue;
    }
    const chapter = chapterById.get(evidence.chapterId);
    if (
      !allowed.has(evidence.continuityId) ||
      forbidden.has(evidence.continuityId)
    ) {
      addIssue(ctx, `Evidence continuity is outside query scope: ${evidenceId}`, [
        ...path,
        "scope",
      ]);
    }
    if (
      !query.scope.includeFuture &&
      chapter &&
      chapter.chapterNumber > query.scope.allowedUntilChapter
    ) {
      addIssue(ctx, `Future evidence is not allowed: ${evidenceId}`, [
        ...path,
        "scope",
        "allowedUntilChapter",
      ]);
    }
  }
}

export function validateQueries(
  state: ValidationState,
  ctx: ValidationContext,
): void {
  const { corpus, characterById, eventById, propositionById } = state;
  corpus.retrievalQueries.forEach((query, index) => {
    validateQueryScope(
      query,
      "retrievalQueries",
      index,
      query.expectedEvidenceIds,
      state,
      ctx,
    );
  });

  corpus.reasoningQueries.forEach((query, index) => {
    validateQueryScope(
      query,
      "reasoningQueries",
      index,
      query.requiredEvidenceIds,
      state,
      ctx,
    );
    const answer = query.expectedAnswer;
    if (answer.answerKind === "entity") {
      for (const entityId of answer.entityIds) {
        if (!characterById.has(entityId)) {
          addIssue(ctx, `Unknown answer entity: ${entityId}`, [
            "corpus",
            "reasoningQueries",
            index,
            "expectedAnswer",
          ]);
        }
      }
    }
    if (
      answer.answerKind === "ordered_events" ||
      answer.answerKind === "causal_chain"
    ) {
      for (const eventId of answer.eventIds) {
        if (!eventById.has(eventId)) {
          addIssue(ctx, `Unknown answer event: ${eventId}`, [
            "corpus",
            "reasoningQueries",
            index,
            "expectedAnswer",
          ]);
        }
      }
    }
    for (const claimId of query.forbiddenClaimIds) {
      if (!propositionById.has(claimId)) {
        addIssue(ctx, `Unknown forbidden claim: ${claimId}`, [
          "corpus",
          "reasoningQueries",
          index,
          "forbiddenClaimIds",
        ]);
      }
    }
  });
}
