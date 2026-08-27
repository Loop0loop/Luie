import { sha256Utf8 } from "../../utils/sha256";
import {
  addIssue,
  type ValidationContext,
  type ValidationState,
} from "./context";

function validateSourceDocuments(
  state: ValidationState,
  ctx: ValidationContext,
): void {
  state.sourceDocuments.forEach((source, index) => {
    if (sha256Utf8(source.content) !== source.sha256) {
      addIssue(ctx, "Source document content hash mismatch", [
        "sourceDocuments",
        index,
        "sha256",
      ]);
    }
  });
}

function validateEvidenceRows(
  state: ValidationState,
  ctx: ValidationContext,
): void {
  const { corpus, chapterById, sceneById, sourceById } = state;
  corpus.evidence.forEach((evidence, index) => {
    const path = ["corpus", "evidence", index];
    const source = sourceById.get(evidence.sourceId);
    const chapter = chapterById.get(evidence.chapterId);
    const scene = sceneById.get(evidence.sceneId);
    if (!source) addIssue(ctx, "Unknown evidence source", [...path, "sourceId"]);
    if (!chapter) addIssue(ctx, "Unknown evidence chapter", [...path, "chapterId"]);
    if (!scene) addIssue(ctx, "Unknown evidence scene", [...path, "sceneId"]);
    if (scene && scene.chapterId !== evidence.chapterId) {
      addIssue(ctx, "Evidence scene belongs to another chapter", [...path, "sceneId"]);
    }
    if (scene && scene.continuityId !== evidence.continuityId) {
      addIssue(ctx, "Evidence continuity must match scene", [...path, "continuityId"]);
    }
    if (chapter && chapter.continuityId !== evidence.continuityId) {
      addIssue(ctx, "Evidence continuity must match chapter", [...path, "continuityId"]);
    }
    if (evidence.endOffset <= evidence.startOffset) {
      addIssue(ctx, "Evidence endOffset must exceed startOffset", [...path, "endOffset"]);
    }
    if (!source) return;
    if (source.chapterId !== evidence.chapterId) {
      addIssue(ctx, "Evidence source belongs to another chapter", [...path, "sourceId"]);
    }
    if (source.sha256 !== evidence.sourceSha256) {
      addIssue(ctx, "Evidence source hash mismatch", [...path, "sourceSha256"]);
    }
    const quote = [...source.content]
      .slice(evidence.startOffset, evidence.endOffset)
      .join("");
    if (quote !== evidence.quote) {
      addIssue(ctx, "Evidence quote does not match code-point offsets", [
        ...path,
        "quote",
      ]);
    }
  });
}

function validateForeshadowing(
  state: ValidationState,
  ctx: ValidationContext,
): void {
  const { corpus, chapterById, evidenceById } = state;
  corpus.foreshadowing.forEach((record, index) => {
    const path = ["corpus", "foreshadowing", index];
    const setupChapters: number[] = [];
    const payoffChapters: number[] = [];
    const collectEvidenceChapters = (
      ids: string[],
      target: number[],
      field: string,
    ): void => {
      for (const evidenceId of ids) {
        const evidence = evidenceById.get(evidenceId);
        if (!evidence) {
          addIssue(ctx, `Unknown foreshadow evidence: ${evidenceId}`, [
            ...path,
            field,
          ]);
          continue;
        }
        if (evidence.continuityId !== record.continuityId) {
          addIssue(ctx, "Foreshadow evidence continuity mismatch", [
            ...path,
            field,
          ]);
        }
        const chapter = chapterById.get(evidence.chapterId);
        if (chapter) target.push(chapter.chapterNumber);
      }
    };

    collectEvidenceChapters(record.setupEvidenceIds, setupChapters, "setupEvidenceIds");
    collectEvidenceChapters(record.payoffEvidenceIds, payoffChapters, "payoffEvidenceIds");
    collectEvidenceChapters(record.reminderEvidenceIds, [], "reminderEvidenceIds");
    if (record.status === "resolved" && record.payoffEvidenceIds.length === 0) {
      addIssue(ctx, "Resolved foreshadowing requires payoff evidence", [
        ...path,
        "payoffEvidenceIds",
      ]);
    }
    if (
      setupChapters.length > 0 &&
      payoffChapters.length > 0 &&
      Math.min(...payoffChapters) < Math.min(...setupChapters)
    ) {
      addIssue(ctx, "Foreshadowing payoff cannot precede setup", path);
    }
  });
}

export function validateEvidence(
  state: ValidationState,
  ctx: ValidationContext,
): void {
  validateSourceDocuments(state, ctx);
  validateEvidenceRows(state, ctx);
  validateForeshadowing(state, ctx);
}
