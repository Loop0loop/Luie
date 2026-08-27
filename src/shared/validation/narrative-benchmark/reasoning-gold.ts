import type { NarrativeReasoningQuery } from "../../schemas/narrativeBenchmark";
import {
  addIssue,
  type ValidationContext,
  type ValidationState,
} from "./context";

const REQUIRED_ANSWER_KIND = {
  relationship_state: "relationship_state",
  relationship_change: "relationship_change",
  character_knowledge: "knowledge_state",
} as const;

function isActiveAt(
  from: number,
  to: number | null,
  chapter: number,
): boolean {
  return from <= chapter && (to === null || chapter <= to);
}

export function validateReasoningGold(
  query: NarrativeReasoningQuery,
  index: number,
  state: ValidationState,
  ctx: ValidationContext,
): void {
  const path = ["corpus", "reasoningQueries", index, "expectedAnswer"];
  const answer = query.expectedAnswer;
  const requiredKind =
    REQUIRED_ANSWER_KIND[query.taxonomy as keyof typeof REQUIRED_ANSWER_KIND];
  if (requiredKind && answer.answerKind !== requiredKind) {
    addIssue(ctx, `${query.taxonomy} requires ${requiredKind} gold`, path);
    return;
  }

  const allowed = new Set(query.scope.allowedContinuityIds);
  const requiredEvidence = new Set(query.requiredEvidenceIds);
  if (answer.answerKind === "entity") {
    for (const entityId of answer.entityIds) {
      if (!state.characterById.has(entityId)) {
        addIssue(ctx, `Unknown answer entity: ${entityId}`, path);
      }
    }
  }
  if (
    answer.answerKind === "ordered_events" ||
    answer.answerKind === "causal_chain"
  ) {
    for (const eventId of answer.eventIds) {
      if (!state.eventById.has(eventId)) {
        addIssue(ctx, `Unknown answer event: ${eventId}`, path);
      }
    }
  }
  if (answer.answerKind === "relationship_state") {
    if (answer.validAtChapter > query.scope.allowedUntilChapter) {
      addIssue(ctx, "Relationship gold chapter exceeds query scope", path);
    }
    for (const stateId of answer.relationshipStateIds) {
      const relationship = state.relationshipStateById.get(stateId);
      if (!relationship) {
        addIssue(ctx, `Unknown relationship state gold: ${stateId}`, path);
        continue;
      }
      if (!allowed.has(relationship.continuityId)) {
        addIssue(ctx, `Relationship state gold is outside query scope: ${stateId}`, path);
      }
      for (const evidenceId of relationship.evidenceIds) {
        if (!requiredEvidence.has(evidenceId)) {
          addIssue(ctx, `Relationship evidence is missing from reasoning gold: ${evidenceId}`, path);
        }
      }
      if (
        !isActiveAt(
          relationship.validFromChapter,
          relationship.validToChapter,
          answer.validAtChapter,
        )
      ) {
        addIssue(ctx, `Relationship state gold is not valid at answer chapter: ${stateId}`, path);
      }
    }
  }
  if (answer.answerKind === "relationship_change") {
    for (const transitionId of answer.relationshipTransitionIds) {
      const transition = state.relationshipTransitionById.get(transitionId);
      if (!transition) {
        addIssue(ctx, `Unknown relationship transition gold: ${transitionId}`, path);
        continue;
      }
      if (!allowed.has(transition.continuityId)) {
        addIssue(ctx, `Relationship transition gold is outside query scope: ${transitionId}`, path);
      }
      if (transition.validFromChapter > query.scope.allowedUntilChapter) {
        addIssue(ctx, `Relationship transition gold exceeds query scope: ${transitionId}`, path);
      }
      const before = state.relationshipStateById.get(transition.beforeStateId);
      const after = state.relationshipStateById.get(transition.afterStateId);
      for (const evidenceId of [
        ...(before?.evidenceIds ?? []),
        ...(after?.evidenceIds ?? []),
      ]) {
        if (!requiredEvidence.has(evidenceId)) {
          addIssue(ctx, `Relationship change evidence is missing from reasoning gold: ${evidenceId}`, path);
        }
      }
    }
  }
  if (answer.answerKind === "knowledge_state") {
    if (answer.validAtChapter > query.scope.allowedUntilChapter) {
      addIssue(ctx, "Knowledge gold chapter exceeds query scope", path);
    }
    for (const knowledgeStateId of answer.knowledgeStateIds) {
      const knowledge = state.knowledgeStateById.get(knowledgeStateId);
      if (!knowledge) {
        addIssue(ctx, `Unknown knowledge state gold: ${knowledgeStateId}`, path);
        continue;
      }
      if (!allowed.has(knowledge.continuityId)) {
        addIssue(ctx, `Knowledge state gold is outside query scope: ${knowledgeStateId}`, path);
      }
      for (const evidenceId of knowledge.evidenceIds) {
        if (!requiredEvidence.has(evidenceId)) {
          addIssue(ctx, `Knowledge evidence is missing from reasoning gold: ${evidenceId}`, path);
        }
      }
      if (
        !isActiveAt(
          knowledge.validFromChapter,
          knowledge.validToChapter,
          answer.validAtChapter,
        )
      ) {
        addIssue(ctx, `Knowledge state gold is not valid at answer chapter: ${knowledgeStateId}`, path);
      }
    }
  }
}
