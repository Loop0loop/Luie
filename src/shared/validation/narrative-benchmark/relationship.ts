import {
  addIssue,
  checkInterval,
  findOverlappingIntervals,
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
      const evidence = evidenceById.get(evidenceId);
      if (!evidence) {
        addIssue(ctx, `Unknown relationship evidence: ${evidenceId}`, [
          ...path, "evidenceIds",
        ]);
      } else if (evidence.continuityId !== record.continuityId) {
        addIssue(ctx, `Relationship evidence continuity mismatch: ${evidenceId}`, [
          ...path,
          "evidenceIds",
        ]);
      }
    }
  });

  for (const [left, right] of findOverlappingIntervals(
    corpus.relationshipStates,
    (record) =>
      `${record.sourceCharacterId}:${record.targetCharacterId}:${record.dimension}:${record.continuityId}`,
    (record) => record.validFromChapter,
    (record) => record.validToChapter,
  )) {
    addIssue(
      ctx,
      `Relationship state intervals overlap: ${left.relationshipStateId}, ${right.relationshipStateId}`,
      ["corpus", "relationshipStates"],
    );
  }

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
      // Overlap alone is not enough: a directed dimension must have exactly one
      // defined state at every chapter between its first and last state. If the
      // before state ends earlier than the transition chapter, the chapters in
      // between have NO relationship state, so a relationship_state query at
      // time T inside that hole would have no gold answer.
      if (
        before.validToChapter === null ||
        before.validToChapter !== transition.validFromChapter - 1
      ) {
        addIssue(ctx, "Before state must end immediately before the transition chapter", [
          ...path, "beforeStateId",
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
      } else {
        if (event.continuityId !== transition.continuityId) {
          addIssue(ctx, `Transition event continuity mismatch: ${eventId}`, [
            ...path,
            "triggerEventIds",
          ]);
        }
        if (event.firstNarratedChapter > transition.validFromChapter) {
          addIssue(ctx, "Transition trigger occurs after the transition", [
            ...path, "triggerEventIds",
          ]);
        }
      }
    }
  });
}
