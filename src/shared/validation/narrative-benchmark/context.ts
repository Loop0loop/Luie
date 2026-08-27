import { z } from "zod";
import type { NarrativeBenchmarkValidationInput } from "../../schemas/narrativeBenchmark";

export type ValidationContext = z.RefinementCtx;
export type ValidationPath = PropertyKey[];
export type NarrativeCorpus = NarrativeBenchmarkValidationInput["corpus"];
export type SourceDocuments = NarrativeBenchmarkValidationInput["sourceDocuments"];

export function addIssue(
  ctx: ValidationContext,
  message: string,
  path: ValidationPath,
): void {
  ctx.addIssue({ code: z.ZodIssueCode.custom, message, path });
}

export function indexBy<T>(
  items: T[],
  key: (item: T) => string,
): Map<string, T> {
  return new Map(items.map((item) => [key(item), item]));
}

export function checkUniqueIds<T>(
  items: T[],
  key: (item: T) => string,
  collection: string,
  ctx: ValidationContext,
): void {
  const seen = new Set<string>();
  items.forEach((item, index) => {
    const id = key(item);
    if (seen.has(id)) {
      addIssue(ctx, `Duplicate ID: ${id}`, ["corpus", collection, index]);
    }
    seen.add(id);
  });
}

export function checkInterval(
  from: number,
  to: number | null,
  path: ValidationPath,
  ctx: ValidationContext,
): void {
  if (to !== null && to < from) {
    addIssue(
      ctx,
      "validToChapter must be greater than or equal to validFromChapter",
      path,
    );
  }
}

export function hasDirectedCycle(edges: Array<[string, string]>): boolean {
  const adjacency = new Map<string, string[]>();
  for (const [from, to] of edges) {
    const targets = adjacency.get(from) ?? [];
    targets.push(to);
    adjacency.set(from, targets);
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (node: string): boolean => {
    if (visiting.has(node)) return true;
    if (visited.has(node)) return false;
    visiting.add(node);
    for (const next of adjacency.get(node) ?? []) {
      if (visit(next)) return true;
    }
    visiting.delete(node);
    visited.add(node);
    return false;
  };
  return [...adjacency.keys()].some(visit);
}

export function createValidationState(
  corpus: NarrativeCorpus,
  sourceDocuments: SourceDocuments,
) {
  return {
    corpus,
    sourceDocuments,
    continuityById: indexBy(corpus.continuities, (item) => item.continuityId),
    characterById: indexBy(corpus.characters, (item) => item.characterId),
    propositionById: indexBy(corpus.propositions, (item) => item.propositionId),
    eventById: indexBy(corpus.events, (item) => item.eventId),
    relationshipStateById: indexBy(
      corpus.relationshipStates,
      (item) => item.relationshipStateId,
    ),
    chapterById: indexBy(corpus.chapters, (item) => item.chapterId),
    sceneById: indexBy(corpus.scenes, (item) => item.sceneId),
    evidenceById: indexBy(corpus.evidence, (item) => item.evidenceId),
    sourceById: indexBy(sourceDocuments, (item) => item.sourceId),
  };
}

export type ValidationState = ReturnType<typeof createValidationState>;
