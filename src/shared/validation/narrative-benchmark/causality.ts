import {
  addIssue,
  hasDirectedCycle,
  type ValidationContext,
  type ValidationState,
} from "./context";

export function validateCausality(
  state: ValidationState,
  ctx: ValidationContext,
): void {
  const { corpus, characterById, continuityById, eventById, evidenceById } = state;
  corpus.events.forEach((event, index) => {
    const path = ["corpus", "events", index];
    if (!continuityById.has(event.continuityId)) {
      addIssue(ctx, "Unknown event continuity", [...path, "continuityId"]);
    }
    for (const participantId of event.participantIds) {
      if (!characterById.has(participantId)) {
        addIssue(ctx, `Unknown event participant: ${participantId}`, [
          ...path, "participantIds",
        ]);
      }
    }
    for (const preconditionId of event.preconditionEventIds) {
      const precondition = eventById.get(preconditionId);
      if (!precondition) {
        addIssue(ctx, `Unknown precondition event: ${preconditionId}`, [
          ...path, "preconditionEventIds",
        ]);
      } else if (precondition.continuityId !== event.continuityId) {
        addIssue(ctx, "Precondition event continuity mismatch", [
          ...path, "preconditionEventIds",
        ]);
      }
      if (preconditionId === event.eventId) {
        addIssue(ctx, "Event cannot be its own precondition", [
          ...path, "preconditionEventIds",
        ]);
      }
    }
    for (const effectId of event.effectEventIds) {
      const effect = eventById.get(effectId);
      if (!effect) {
        addIssue(ctx, `Unknown effect event: ${effectId}`, [...path, "effectEventIds"]);
      } else if (effect.continuityId !== event.continuityId) {
        addIssue(ctx, "Effect event continuity mismatch", [...path, "effectEventIds"]);
      }
      if (effectId === event.eventId) {
        addIssue(ctx, "Event cannot be its own effect", [...path, "effectEventIds"]);
      }
    }
  });

  corpus.causalEdges.forEach((edge, index) => {
    const path = ["corpus", "causalEdges", index];
    const cause = eventById.get(edge.causeEventId);
    const effect = eventById.get(edge.effectEventId);
    if (!cause) addIssue(ctx, "Unknown cause event", [...path, "causeEventId"]);
    if (!effect) addIssue(ctx, "Unknown effect event", [...path, "effectEventId"]);
    if (edge.causeEventId === edge.effectEventId) {
      addIssue(ctx, "Causal edge cannot self-reference", path);
    }
    if (!continuityById.has(edge.continuityId)) {
      addIssue(ctx, "Unknown causal edge continuity", [...path, "continuityId"]);
    }
    if (cause && cause.continuityId !== edge.continuityId) {
      addIssue(ctx, "Cause event continuity mismatch", [...path, "continuityId"]);
    }
    if (effect && effect.continuityId !== edge.continuityId) {
      addIssue(ctx, "Effect event continuity mismatch", [...path, "continuityId"]);
    }
    if (cause && effect && cause.firstNarratedChapter > effect.firstNarratedChapter) {
      addIssue(ctx, "Cause cannot be first narrated after its effect", path);
    }
    for (const evidenceId of edge.evidenceIds) {
      if (!evidenceById.has(evidenceId)) {
        addIssue(ctx, `Unknown causal evidence: ${evidenceId}`, [
          ...path, "evidenceIds",
        ]);
      }
    }
  });

  const edges = corpus.causalEdges.map(
    (edge) => [edge.causeEventId, edge.effectEventId] as [string, string],
  );
  if (hasDirectedCycle(edges)) {
    addIssue(ctx, "Causal graph must be acyclic", ["corpus", "causalEdges"]);
  }
}
