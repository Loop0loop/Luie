import {
  addIssue,
  checkInterval,
  type ValidationContext,
  type ValidationState,
} from "./context";

export function validateRelationships(
  state: ValidationState,
  ctx: ValidationContext,
): void {
  const {
    corpus,
    characterById,
    continuityById,
    eventById,
    evidenceById,
    relationshipStateById,
  } = state;
  corpus.relationshipStates.forEach((record, index) => {
    const path = ["corpus", "relationshipStates", index];
    if (!characterById.has(record.sourceCharacterId)) {
      addIssue(ctx, "Unknown relationship source", [...path, "sourceCharacterId"]);
    }
    if (!characterById.has(record.targetCharacterId)) {
      addIssue(ctx, "Unknown relationship target", [...path, "targetCharacterId"]);
    }
    if (record.sourceCharacterId === record.targetCharacterId) {
      addIssue(ctx, "Relationship cannot self-reference", path);
    }
    if (!continuityById.has(record.continuityId)) {
      addIssue(ctx, "Unknown relationship continuity", [...path, "continuityId"]);
    }
    checkInterval(record.validFromChapter, record.validToChapter, path, ctx);
    for (const evidenceId of record.evidenceIds) {
      if (!evidenceById.has(evidenceId)) {
        addIssue(ctx, `Unknown relationship evidence: ${evidenceId}`, [
          ...path, "evidenceIds",
        ]);
      }
    }
  });

  corpus.relationshipTransitions.forEach((transition, index) => {
    const path = ["corpus", "relationshipTransitions", index];
    const before = relationshipStateById.get(transition.beforeStateId);
    const after = relationshipStateById.get(transition.afterStateId);
    if (!before) addIssue(ctx, "Unknown before relationship state", [...path, "beforeStateId"]);
    if (!after) addIssue(ctx, "Unknown after relationship state", [...path, "afterStateId"]);
    if (transition.beforeStateId === transition.afterStateId) {
      addIssue(ctx, "Relationship transition requires distinct states", path);
    }
    if (before && after) {
      const sameDimension =
        before.sourceCharacterId === after.sourceCharacterId &&
        before.targetCharacterId === after.targetCharacterId &&
        before.dimension === after.dimension;
      if (!sameDimension) {
        addIssue(ctx, "Relationship transition states must describe the same directed dimension", path);
      }
      if (
        before.continuityId !== transition.continuityId ||
        after.continuityId !== transition.continuityId
      ) {
        addIssue(ctx, "Relationship transition continuity mismatch", [
          ...path, "continuityId",
        ]);
      }
      if (before.value === after.value) {
        addIssue(ctx, "Relationship transition must change value", path);
      }
      if (after.validFromChapter !== transition.validFromChapter) {
        addIssue(ctx, "After state must start at transition chapter", [
          ...path, "validFromChapter",
        ]);
      }
    }
    if (!continuityById.has(transition.continuityId)) {
      addIssue(ctx, "Unknown transition continuity", [...path, "continuityId"]);
    }
    for (const eventId of transition.triggerEventIds) {
      const event = eventById.get(eventId);
      if (!event) {
        addIssue(ctx, `Unknown transition event: ${eventId}`, [
          ...path, "triggerEventIds",
        ]);
      } else if (event.firstNarratedChapter > transition.validFromChapter) {
        addIssue(ctx, "Transition trigger occurs after the transition", [
          ...path, "triggerEventIds",
        ]);
      }
    }
  });
}
