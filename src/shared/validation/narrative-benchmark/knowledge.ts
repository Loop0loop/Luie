import {
  addIssue,
  checkInterval,
  type ValidationContext,
  type ValidationState,
} from "./context";

export function validateKnowledgeAndTimeline(
  state: ValidationState,
  ctx: ValidationContext,
): void {
  const { corpus, characterById, continuityById, eventById, evidenceById, propositionById } = state;
  corpus.knowledgeStates.forEach((record, index) => {
    const path = ["corpus", "knowledgeStates", index];
    if (!characterById.has(record.characterId)) {
      addIssue(ctx, "Unknown knowledge character", [...path, "characterId"]);
    }
    const proposition = propositionById.get(record.propositionId);
    if (!proposition) {
      addIssue(ctx, "Unknown knowledge proposition", [...path, "propositionId"]);
    } else if (proposition.continuityId !== record.continuityId) {
      addIssue(ctx, "Knowledge proposition continuity mismatch", [...path, "continuityId"]);
    }
    if (!continuityById.has(record.continuityId)) {
      addIssue(ctx, "Unknown knowledge continuity", [...path, "continuityId"]);
    }
    checkInterval(record.validFromChapter, record.validToChapter, path, ctx);
    if (record.state === "unknown" && record.acquiredByEventId !== null) {
      addIssue(ctx, "Unknown knowledge cannot have acquisition event", [
        ...path, "acquiredByEventId",
      ]);
    }
    if (
      ["known", "believed", "misinformed"].includes(record.state) &&
      record.acquiredByEventId === null
    ) {
      addIssue(ctx, `${record.state} knowledge requires acquisition event`, [
        ...path, "acquiredByEventId",
      ]);
    }
    if (record.acquiredByEventId !== null) {
      const event = eventById.get(record.acquiredByEventId);
      if (!event) {
        addIssue(ctx, "Unknown knowledge acquisition event", [
          ...path, "acquiredByEventId",
        ]);
      } else {
        if (event.continuityId !== record.continuityId) {
          addIssue(ctx, "Knowledge acquisition continuity mismatch", [
            ...path, "continuityId",
          ]);
        }
        if (event.firstNarratedChapter > record.validFromChapter) {
          addIssue(ctx, "Knowledge cannot start before acquisition event", [
            ...path, "validFromChapter",
          ]);
        }
      }
    }
    for (const evidenceId of record.evidenceIds) {
      if (!evidenceById.has(evidenceId)) {
        addIssue(ctx, `Unknown knowledge evidence: ${evidenceId}`, [
          ...path, "evidenceIds",
        ]);
      }
    }
  });

  corpus.timeline.forEach((entry, index) => {
    const path = ["corpus", "timeline", index];
    const event = eventById.get(entry.eventId);
    if (!event) addIssue(ctx, "Unknown timeline event", [...path, "eventId"]);
    if (!continuityById.has(entry.continuityId)) {
      addIssue(ctx, "Unknown timeline continuity", [...path, "continuityId"]);
    }
    if (event && event.continuityId !== entry.continuityId) {
      addIssue(ctx, "Timeline continuity mismatch", [...path, "continuityId"]);
    }
  });
}
