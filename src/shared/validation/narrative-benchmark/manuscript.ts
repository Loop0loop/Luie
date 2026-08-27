import {
  addIssue,
  type ValidationContext,
  type ValidationState,
} from "./context";

export function validateManuscript(
  state: ValidationState,
  ctx: ValidationContext,
): void {
  const {
    corpus,
    sourceDocuments,
    characterById,
    continuityById,
    eventById,
    chapterById,
    sourceById,
  } = state;
  const narratedChaptersByEvent = new Map<string, number[]>();

  corpus.chapters.forEach((chapter, index) => {
    const path = ["corpus", "chapters", index];
    if (!continuityById.has(chapter.continuityId)) {
      addIssue(ctx, "Unknown chapter continuity", [...path, "continuityId"]);
    }
    for (const eventId of chapter.eventIds) {
      const event = eventById.get(eventId);
      if (!event) {
        addIssue(ctx, `Unknown chapter event: ${eventId}`, [...path, "eventIds"]);
        continue;
      }
      if (event.continuityId !== chapter.continuityId) {
        addIssue(ctx, `Chapter event continuity mismatch: ${eventId}`, [
          ...path,
          "eventIds",
        ]);
      }
      const chapters = narratedChaptersByEvent.get(eventId) ?? [];
      chapters.push(chapter.chapterNumber);
      narratedChaptersByEvent.set(eventId, chapters);
    }
    const source = sourceById.get(chapter.sourceId);
    if (!source) {
      addIssue(ctx, "Missing chapter source document", [...path, "sourceId"]);
    } else if (source.chapterId !== chapter.chapterId) {
      addIssue(ctx, "Source document chapter mismatch", [...path, "sourceId"]);
    }
  });

  sourceDocuments.forEach((source, index) => {
    const chapter = chapterById.get(source.chapterId);
    if (!chapter) {
      addIssue(ctx, "Unknown source document chapter", [
        "sourceDocuments",
        index,
        "chapterId",
      ]);
    } else if (chapter.sourceId !== source.sourceId) {
      addIssue(ctx, "Source document is not selected by its chapter", [
        "sourceDocuments",
        index,
        "sourceId",
      ]);
    }
  });

  const sceneOrders = new Set<string>();
  corpus.scenes.forEach((scene, index) => {
    const path = ["corpus", "scenes", index];
    const chapter = chapterById.get(scene.chapterId);
    if (!chapter) {
      addIssue(ctx, "Unknown scene chapter", [...path, "chapterId"]);
    } else if (chapter.continuityId !== scene.continuityId) {
      addIssue(ctx, "Scene continuity must match chapter", [...path, "continuityId"]);
    }
    const orderKey = `${scene.chapterId}:${scene.sceneOrder}`;
    if (sceneOrders.has(orderKey)) {
      addIssue(ctx, "Scene order must be unique within a chapter", [
        ...path,
        "sceneOrder",
      ]);
    }
    sceneOrders.add(orderKey);

    for (const eventId of scene.eventIds) {
      const event = eventById.get(eventId);
      if (!event) {
        addIssue(ctx, `Unknown scene event: ${eventId}`, [...path, "eventIds"]);
        continue;
      }
      if (event.continuityId !== scene.continuityId) {
        addIssue(ctx, `Scene event continuity mismatch: ${eventId}`, [
          ...path,
          "eventIds",
        ]);
      }
      if (chapter && !chapter.eventIds.includes(eventId)) {
        addIssue(ctx, `Scene event is absent from chapter plan: ${eventId}`, [
          ...path,
          "eventIds",
        ]);
      }
    }
    for (const participantId of scene.participantIds) {
      if (!characterById.has(participantId)) {
        addIssue(ctx, `Unknown scene participant: ${participantId}`, [
          ...path,
          "participantIds",
        ]);
      }
    }
  });

  corpus.events.forEach((event, index) => {
    const chapters = narratedChaptersByEvent.get(event.eventId) ?? [];
    if (chapters.length === 0) {
      addIssue(ctx, "Event is not assigned to any chapter", [
        "corpus",
        "events",
        index,
        "firstNarratedChapter",
      ]);
    } else if (Math.min(...chapters) !== event.firstNarratedChapter) {
      addIssue(ctx, "Event firstNarratedChapter must match its earliest chapter", [
        "corpus",
        "events",
        index,
        "firstNarratedChapter",
      ]);
    }
  });
}
