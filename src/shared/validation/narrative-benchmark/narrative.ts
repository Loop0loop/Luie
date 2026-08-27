import type { ValidationContext, ValidationState } from "./context";
import { validateCausality } from "./causality";
import { validateKnowledgeAndTimeline } from "./knowledge";
import { validateRelationships } from "./relationship";
import { validateWorldRecords } from "./world";

export function validateNarrativeRecords(
  state: ValidationState,
  ctx: ValidationContext,
): void {
  validateWorldRecords(state, ctx);
  validateCausality(state, ctx);
  validateRelationships(state, ctx);
  validateKnowledgeAndTimeline(state, ctx);
}
