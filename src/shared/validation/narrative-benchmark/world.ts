import {
  addIssue,
  checkInterval,
  type ValidationContext,
  type ValidationState,
} from "./context";

export function validateWorldRecords(
  state: ValidationState,
  ctx: ValidationContext,
): void {
  const { corpus, characterById, continuityById, evidenceById } = state;
  corpus.goals.forEach((goal, index) => {
    if (!characterById.has(goal.characterId)) {
      addIssue(ctx, "Unknown goal character", ["corpus", "goals", index, "characterId"]);
    }
    if (!continuityById.has(goal.continuityId)) {
      addIssue(ctx, "Unknown goal continuity", ["corpus", "goals", index, "continuityId"]);
    }
    checkInterval(goal.validFromChapter, goal.validToChapter, ["corpus", "goals", index], ctx);
  });

  corpus.conflicts.forEach((conflict, index) => {
    for (const participantId of conflict.participantIds) {
      if (!characterById.has(participantId)) {
        addIssue(ctx, `Unknown conflict participant: ${participantId}`, [
          "corpus", "conflicts", index, "participantIds",
        ]);
      }
    }
    if (new Set(conflict.participantIds).size !== conflict.participantIds.length) {
      addIssue(ctx, "Conflict participants must be unique", [
        "corpus", "conflicts", index, "participantIds",
      ]);
    }
    if (!continuityById.has(conflict.continuityId)) {
      addIssue(ctx, "Unknown conflict continuity", [
        "corpus", "conflicts", index, "continuityId",
      ]);
    }
    if (
      conflict.resolvedChapter !== null &&
      conflict.resolvedChapter < conflict.introducedChapter
    ) {
      addIssue(ctx, "Conflict cannot resolve before introduction", [
        "corpus", "conflicts", index, "resolvedChapter",
      ]);
    }
  });

  corpus.propositions.forEach((proposition, index) => {
    if (!continuityById.has(proposition.continuityId)) {
      addIssue(ctx, "Unknown proposition continuity", [
        "corpus", "propositions", index, "continuityId",
      ]);
    }
    checkInterval(
      proposition.validFromChapter,
      proposition.validToChapter,
      ["corpus", "propositions", index],
      ctx,
    );
    for (const evidenceId of proposition.evidenceIds) {
      const evidence = evidenceById.get(evidenceId);
      if (!evidence) {
        addIssue(ctx, `Unknown proposition evidence: ${evidenceId}`, [
          "corpus",
          "propositions",
          index,
          "evidenceIds",
        ]);
      } else if (evidence.continuityId !== proposition.continuityId) {
        addIssue(ctx, `Proposition evidence continuity mismatch: ${evidenceId}`, [
          "corpus",
          "propositions",
          index,
          "evidenceIds",
        ]);
      }
    }
  });
}
