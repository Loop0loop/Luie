import type { NarrativeRetrievalQuery } from "../../schemas/narrativeBenchmark";
import {
  addIssue,
  type ValidationContext,
  type ValidationState,
} from "./context";

function isActiveAt(
  from: number,
  to: number | null,
  chapter: number,
): boolean {
  return from <= chapter && (to === null || chapter <= to);
}

export function validateRetrievalGold(
  query: NarrativeRetrievalQuery,
  index: number,
  state: ValidationState,
  ctx: ValidationContext,
): void {
  const path = ["corpus", "retrievalQueries", index, "expectedAnswer"];
  const answer = query.expectedAnswer;
  const allowed = new Set(query.scope.allowedContinuityIds);
  const expectedEvidence = new Set(query.expectedEvidenceIds);

  if (query.taxonomy === "entity_retrieval" && answer.answerKind !== "entity") {
    addIssue(ctx, "entity_retrieval requires entity gold", path);
    return;
  }
  if (query.taxonomy === "fact_retrieval" && answer.answerKind !== "fact") {
    addIssue(ctx, "fact_retrieval requires fact gold", path);
    return;
  }
  if (
    query.taxonomy !== "entity_retrieval" &&
    query.taxonomy !== "fact_retrieval" &&
    answer.answerKind !== "evidence"
  ) {
    addIssue(ctx, "This retrieval taxonomy requires evidence-only gold", path);
    return;
  }

  if (answer.answerKind === "entity") {
    for (const evidenceId of answer.mentionEvidenceIds) {
      if (!expectedEvidence.has(evidenceId)) {
        addIssue(ctx, `Entity mention evidence is missing from query gold: ${evidenceId}`, path);
      }
    }
    const selectedCharacters = new Set(answer.characterIds);
    for (const characterId of answer.characterIds) {
      const character = state.characterById.get(characterId);
      if (!character) {
        addIssue(ctx, `Unknown retrieval gold character: ${characterId}`, path);
      } else if (character.introducedChapter > query.scope.allowedUntilChapter) {
        addIssue(ctx, `Retrieval gold character is not yet introduced: ${characterId}`, path);
      }
    }
    for (const aliasId of answer.aliasIds) {
      const alias = state.aliasById.get(aliasId);
      if (!alias) {
        addIssue(ctx, `Unknown retrieval gold alias: ${aliasId}`, path);
        continue;
      }
      const owner = state.corpus.characters.find((character) =>
        character.aliases.some((candidate) => candidate.aliasId === aliasId),
      );
      if (!owner || !selectedCharacters.has(owner.characterId)) {
        addIssue(ctx, `Retrieval gold alias owner is not selected: ${aliasId}`, path);
      }
      if (!allowed.has(alias.continuityId)) {
        addIssue(ctx, `Retrieval gold alias is outside query scope: ${aliasId}`, path);
      }
      if (
        !isActiveAt(
          alias.validFromChapter,
          alias.validToChapter,
          query.scope.allowedUntilChapter,
        )
      ) {
        addIssue(ctx, `Retrieval gold alias is not valid at query chapter: ${aliasId}`, path);
      }
    }
  }

  if (answer.answerKind === "fact") {
    for (const propositionId of answer.propositionIds) {
      const proposition = state.propositionById.get(propositionId);
      if (!proposition) {
        addIssue(ctx, `Unknown retrieval gold proposition: ${propositionId}`, path);
        continue;
      }
      if (!allowed.has(proposition.continuityId)) {
        addIssue(ctx, `Retrieval gold proposition is outside query scope: ${propositionId}`, path);
      }
      if (proposition.canonicalStatus !== "confirmed") {
        addIssue(ctx, `Retrieval fact gold is not confirmed: ${propositionId}`, path);
      }
      for (const evidenceId of proposition.evidenceIds) {
        if (!expectedEvidence.has(evidenceId)) {
          addIssue(ctx, `Fact evidence is missing from query gold: ${evidenceId}`, path);
        }
      }
      if (
        !isActiveAt(
          proposition.validFromChapter,
          proposition.validToChapter,
          query.scope.allowedUntilChapter,
        )
      ) {
        addIssue(
          ctx,
          `Retrieval gold proposition is not valid at query chapter: ${propositionId}`,
          path,
        );
      }
    }
  }
}
