import {
  narrativeBenchmarkValidationInputSchema,
  type NarrativeBenchmarkValidationInput,
} from "../../schemas/narrativeBenchmark";
import { createValidationState } from "./context";
import { validateEvidence } from "./evidence";
import { validateIdentity } from "./identity";
import { validateManuscript } from "./manuscript";
import { validateNarrativeRecords } from "./narrative";
import { validateQueries } from "./query";
import { validateReviews } from "./review";

export const narrativeBenchmarkCorpusSchema =
  narrativeBenchmarkValidationInputSchema.superRefine((input, ctx) => {
    const state = createValidationState(input.corpus, input.sourceDocuments);
    validateIdentity(state, ctx);
    validateNarrativeRecords(state, ctx);
    validateManuscript(state, ctx);
    validateEvidence(state, ctx);
    validateQueries(state, ctx);
    validateReviews(state, ctx);
  });

export type ValidatedNarrativeBenchmark = NarrativeBenchmarkValidationInput;

export function validateNarrativeBenchmark(input: unknown) {
  return narrativeBenchmarkCorpusSchema.safeParse(input);
}
