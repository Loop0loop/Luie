import type { AnalysisConflictItem } from "./types";

export const formatConflictFact = (
  fact: AnalysisConflictItem["invalidatedFact"],
): string => {
  const subject = fact.subjectEntityName ?? fact.subjectEntityId;
  const object =
    fact.objectEntityName ??
    fact.objectValue ??
    fact.objectEntityId ??
    fact.subjectEntityId;
  return `${subject} → ${fact.predicate} → ${object} (${fact.status})`;
};
