import type {
  NarrativeReasoningQuery,
  NarrativeRetrievalQuery,
} from "../../schemas/narrativeBenchmark";
import {
  addIssue,
  type ValidationContext,
  type ValidationState,
} from "./context";
import { validateReasoningGold } from "./reasoning-gold";
import { validateRetrievalGold } from "./retrieval-gold";

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
  if (!state.corpus.manifest.genres.includes(query.genre)) {
    addIssue(ctx, `Query genre is not declared in manifest: ${query.genre}`, [
      ...path,
      "genre",
    ]);
  }
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
  const { corpus, propositionById } = state;
  corpus.retrievalQueries.forEach((query, index) => {
    validateQueryScope(
      query,
      "retrievalQueries",
      index,
      query.expectedEvidenceIds,
      state,
      ctx,
    );
    validateRetrievalGold(query, index, state, ctx);
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
    validateReasoningGold(query, index, state, ctx);
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
