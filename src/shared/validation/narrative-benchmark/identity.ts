import {
  addIssue,
  checkInterval,
  checkUniqueIds,
  hasDirectedCycle,
  type ValidationContext,
  type ValidationState,
} from "./context";

const scaleTierChapterMax: Record<
  "S" | "M" | "ML" | "L" | "XL",
  number | null
> = {
  S: 20,
  M: 40,
  ML: 60,
  L: 100,
  XL: null,
};

function validateUniqueIds(state: ValidationState, ctx: ValidationContext): void {
  const { corpus, sourceDocuments } = state;
  checkUniqueIds(corpus.continuities, (item) => item.continuityId, "continuities", ctx);
  checkUniqueIds(corpus.characters, (item) => item.characterId, "characters", ctx);
  checkUniqueIds(corpus.goals, (item) => item.goalId, "goals", ctx);
  checkUniqueIds(corpus.conflicts, (item) => item.conflictId, "conflicts", ctx);
  checkUniqueIds(corpus.propositions, (item) => item.propositionId, "propositions", ctx);
  checkUniqueIds(corpus.events, (item) => item.eventId, "events", ctx);
  checkUniqueIds(corpus.causalEdges, (item) => item.causalEdgeId, "causalEdges", ctx);
  checkUniqueIds(
    corpus.relationshipStates,
    (item) => item.relationshipStateId,
    "relationshipStates",
    ctx,
  );
  checkUniqueIds(
    corpus.relationshipTransitions,
    (item) => item.transitionId,
    "relationshipTransitions",
    ctx,
  );
  checkUniqueIds(
    corpus.knowledgeStates,
    (item) => item.knowledgeStateId,
    "knowledgeStates",
    ctx,
  );
  checkUniqueIds(corpus.timeline, (item) => item.timelineEntryId, "timeline", ctx);
  checkUniqueIds(corpus.foreshadowing, (item) => item.foreshadowId, "foreshadowing", ctx);
  checkUniqueIds(corpus.chapters, (item) => item.chapterId, "chapters", ctx);
  checkUniqueIds(corpus.scenes, (item) => item.sceneId, "scenes", ctx);
  checkUniqueIds(corpus.evidence, (item) => item.evidenceId, "evidence", ctx);
  checkUniqueIds(
    corpus.retrievalQueries,
    (item) => item.queryId,
    "retrievalQueries",
    ctx,
  );
  checkUniqueIds(
    corpus.reasoningQueries,
    (item) => item.queryId,
    "reasoningQueries",
    ctx,
  );
  checkUniqueIds(corpus.humanReviews, (item) => item.reviewId, "humanReviews", ctx);
  checkUniqueIds(sourceDocuments, (item) => item.sourceId, "sourceDocuments", ctx);

  const queryIds = new Set<string>();
  [...corpus.retrievalQueries, ...corpus.reasoningQueries].forEach((query) => {
    if (queryIds.has(query.queryId)) {
      addIssue(ctx, `Query ID is shared across layers: ${query.queryId}`, ["corpus"]);
    }
    queryIds.add(query.queryId);
  });

  const chapterNumbers = new Set<number>();
  corpus.chapters.forEach((chapter, index) => {
    if (chapterNumbers.has(chapter.chapterNumber)) {
      addIssue(ctx, `Duplicate chapter number: ${chapter.chapterNumber}`, [
        "corpus",
        "chapters",
        index,
      ]);
    }
    chapterNumbers.add(chapter.chapterNumber);
  });
}

function validateScale(state: ValidationState, ctx: ValidationContext): void {
  const { corpus } = state;
  const maxChapters = scaleTierChapterMax[corpus.manifest.scaleTier];
  if (maxChapters !== null && corpus.chapters.length > maxChapters) {
    addIssue(
      ctx,
      `${corpus.manifest.scaleTier} tier allows at most ${maxChapters} chapters`,
      ["corpus", "manifest", "scaleTier"],
    );
  }
  if (corpus.manifest.scaleTier === "XL" && corpus.chapters.length < 120) {
    addIssue(ctx, "XL tier requires at least 120 chapters", [
      "corpus",
      "manifest",
      "scaleTier",
    ]);
  }
}

function validateContinuities(
  state: ValidationState,
  ctx: ValidationContext,
): void {
  const { corpus, continuityById } = state;
  corpus.continuities.forEach((continuity, index) => {
    const path = ["corpus", "continuities", index];
    if (continuity.parentContinuityId === null) {
      if (continuity.divergenceChapter !== null) {
        addIssue(ctx, "Root continuity cannot have divergenceChapter", [
          ...path,
          "divergenceChapter",
        ]);
      }
      return;
    }

    if (!continuityById.has(continuity.parentContinuityId)) {
      addIssue(ctx, "Unknown parent continuity", [...path, "parentContinuityId"]);
    }
    if (continuity.parentContinuityId === continuity.continuityId) {
      addIssue(ctx, "Continuity cannot parent itself", [
        ...path,
        "parentContinuityId",
      ]);
    }
    if (continuity.divergenceChapter === null) {
      addIssue(ctx, "Child continuity requires divergenceChapter", [
        ...path,
        "divergenceChapter",
      ]);
    }
  });

  const parentEdges = corpus.continuities.flatMap((continuity) =>
    continuity.parentContinuityId === null
      ? []
      : [[continuity.parentContinuityId, continuity.continuityId] as [string, string]],
  );
  if (hasDirectedCycle(parentEdges)) {
    addIssue(ctx, "Continuity parent graph must be acyclic", [
      "corpus",
      "continuities",
    ]);
  }
}

function validateAliases(state: ValidationState, ctx: ValidationContext): void {
  const { corpus, continuityById } = state;
  corpus.characters.forEach((character, characterIndex) => {
    checkUniqueIds(
      character.aliases,
      (item) => item.aliasId,
      `characters.${characterIndex}.aliases`,
      ctx,
    );
    character.aliases.forEach((alias, aliasIndex) => {
      const path = [
        "corpus",
        "characters",
        characterIndex,
        "aliases",
        aliasIndex,
      ];
      if (!continuityById.has(alias.continuityId)) {
        addIssue(ctx, "Unknown alias continuity", [...path, "continuityId"]);
      }
      checkInterval(alias.validFromChapter, alias.validToChapter, path, ctx);
    });
  });
}

export function validateIdentity(
  state: ValidationState,
  ctx: ValidationContext,
): void {
  validateUniqueIds(state, ctx);
  validateScale(state, ctx);
  validateContinuities(state, ctx);
  validateAliases(state, ctx);
}
