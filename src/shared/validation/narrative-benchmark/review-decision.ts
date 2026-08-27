import {
  addIssue,
  type NarrativeCorpus,
  type ValidationContext,
} from "./context";

type HumanReview = NarrativeCorpus["humanReviews"][number];

function decisionKey(review: HumanReview): string {
  return `${review.stage}:${review.targetType}:${review.targetId}`;
}

function groupCurrentReviews(
  reviews: HumanReview[],
  targetRevisions: Map<string, string>,
): Map<string, HumanReview[]> {
  const groups = new Map<string, HumanReview[]>();
  for (const review of reviews) {
    const targetRevision = targetRevisions.get(
      `${review.targetType}:${review.targetId}`,
    );
    if (targetRevision !== review.reviewedRevision || review.status === "stale") {
      continue;
    }
    const key = decisionKey(review);
    const group = groups.get(key) ?? [];
    group.push(review);
    groups.set(key, group);
  }
  return groups;
}

export function resolveApprovedGoodTargets(
  reviews: HumanReview[],
  targetRevisions: Map<string, string>,
  ctx: ValidationContext,
): Set<string> {
  const approved = new Set<string>();
  for (const [key, group] of groupCurrentReviews(reviews, targetRevisions)) {
    const labels = new Set(group.map((review) => review.label));
    const adjudicators = group.filter(
      (review) => review.reviewerRole === "adjudicator",
    );

    if (adjudicators.length > 1) {
      addIssue(ctx, `Review target has multiple adjudicator decisions: ${key}`, [
        "corpus",
        "humanReviews",
      ]);
      continue;
    }
    if (labels.size > 1 && adjudicators.length === 0) {
      addIssue(ctx, `Conflicting reviews require adjudication: ${key}`, [
        "corpus",
        "humanReviews",
      ]);
      continue;
    }

    const decision = adjudicators[0] ?? group[0];
    if (decision.label === "GOOD" && decision.status === "approved") {
      approved.add(key);
    }
  }
  return approved;
}
