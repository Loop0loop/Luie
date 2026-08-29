// Plan-stage structural validation harness for contemporary-romance-s-001.
//
// WHY THIS EXISTS: the full corpus validator (validateNarrativeBenchmark) requires
// evidence, source documents, and queries, none of which exist at plan stage
// (SSOT 4.1: evidence alignment and queries come only AFTER the manuscript).
// This harness runs the REAL per-record Zod schemas and the REAL cross-object
// validators (world/causality/relationship/knowledge/timeline/chapter/scene),
// with empty evidence arrays. Evidence-existence and knowledge "requires evidence"
// findings are the only expected/allowed relaxations and are reported separately.
//
// Run: pnpm vitest run tests/shared/narrative-benchmark/plan-contemporary-romance-s-001.test.ts

import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  narrativeWorldSchema,
  narrativeContinuitySchema,
  narrativeCharacterSchema,
  narrativeGoalSchema,
  narrativeConflictSchema,
  narrativePropositionSchema,
} from "../../../src/shared/schemas/narrative-benchmark/world";
import {
  narrativeEventSchema,
  narrativeCausalEdgeSchema,
  narrativeRelationshipStateSchema,
  narrativeRelationshipTransitionSchema,
  narrativeKnowledgeStateSchema,
  narrativeTimelineEntrySchema,
} from "../../../src/shared/schemas/narrative-benchmark/narrative";
import {
  narrativeChapterPlanSchema,
  narrativeSceneSchema,
} from "../../../src/shared/schemas/narrative-benchmark/evidence";

import { createValidationState } from "../../../src/shared/validation/narrative-benchmark/context";
import { validateWorldRecords } from "../../../src/shared/validation/narrative-benchmark/world";
import { validateCausality } from "../../../src/shared/validation/narrative-benchmark/causality";
import { validateRelationships } from "../../../src/shared/validation/narrative-benchmark/relationship";
import { validateKnowledgeAndTimeline } from "../../../src/shared/validation/narrative-benchmark/knowledge";
import { validateManuscript } from "../../../src/shared/validation/narrative-benchmark/manuscript";
import { validateIdentity } from "../../../src/shared/validation/narrative-benchmark/identity";

const NARRATIVE_DIR = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../corpus/contemporary-romance-s-001/narrative",
);

function readJson(name: string): unknown {
  return JSON.parse(readFileSync(resolve(NARRATIVE_DIR, name), "utf8"));
}
function readJsonl(name: string): unknown[] {
  return readFileSync(resolve(NARRATIVE_DIR, name), "utf8")
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line));
}

// Collected issues from a manual RefinementCtx-like shim.
type Issue = { message: string; path: PropertyKey[] };
function makeCtx(issues: Issue[]) {
  return {
    addIssue: (issue: { message: string; path?: PropertyKey[] }) =>
      issues.push({ message: issue.message, path: issue.path ?? [] }),
  } as unknown as import("zod").RefinementCtx;
}

// Evidence-existence relaxations that are EXPECTED at plan stage.
const PLAN_STAGE_RELAXATIONS = [
  /^Unknown .*evidence: /,
  / evidence continuity mismatch: /,
  /knowledge requires evidence$/,
];
function isRelaxed(message: string): boolean {
  return PLAN_STAGE_RELAXATIONS.some((re) => re.test(message));
}

describe("plan-stage structure: contemporary-romance-s-001", () => {
  // Load and shape-validate every record with the real Zod schemas.
  const world = narrativeWorldSchema.parse(readJson("world.json"));
  const continuities = (readJson("continuities.json") as unknown[]).map((r) =>
    narrativeContinuitySchema.parse(r),
  );
  const characters = readJsonl("characters.jsonl").map((r) => narrativeCharacterSchema.parse(r));
  const goals = readJsonl("goals.jsonl").map((r) => narrativeGoalSchema.parse(r));
  const conflicts = readJsonl("conflicts.jsonl").map((r) => narrativeConflictSchema.parse(r));
  const propositions = readJsonl("propositions.jsonl").map((r) => narrativePropositionSchema.parse(r));
  const events = readJsonl("events.jsonl").map((r) => narrativeEventSchema.parse(r));
  const causalEdges = readJsonl("causal_edges.jsonl").map((r) => narrativeCausalEdgeSchema.parse(r));
  const relationshipStates = readJsonl("relations.jsonl").map((r) =>
    narrativeRelationshipStateSchema.parse(r),
  );
  const relationshipTransitions = readJsonl("relationship_transitions.jsonl").map((r) =>
    narrativeRelationshipTransitionSchema.parse(r),
  );
  const knowledgeStates = readJsonl("knowledge_states.jsonl").map((r) =>
    narrativeKnowledgeStateSchema.parse(r),
  );
  const timeline = readJsonl("timeline.jsonl").map((r) => narrativeTimelineEntrySchema.parse(r));
  const chapters = readJsonl("chapter_plans.jsonl").map((r) => narrativeChapterPlanSchema.parse(r));
  const scenes = readJsonl("scenes.jsonl").map((r) => narrativeSceneSchema.parse(r));
  const plannedEvidence = readJsonl("planned_evidence.jsonl") as Array<{
    evidenceId: string;
    plannedChapterId: string;
    plannedSceneId: string;
    continuityId: string;
  }>;

  // A plan-stage corpus: real evidence rows do not exist yet (created at steps 9-10).
  // We stub evidence rows FROM the planned_evidence registry so the real validators
  // verify that every referenced evidenceId is a DECLARED planned affordance with a
  // continuity that matches its consumer. This upgrades the plan-stage check: a typo
  // or an undeclared evidence reference will surface as a structural failure.
  // sourceDocuments provide a placeholder per chapter so manuscript chapter/scene/
  // event/timeline checks run for real.
  const sourceDocuments = chapters.map((c) => ({
    sourceId: c.sourceId,
    chapterId: c.chapterId,
    content: "",
    sha256: "0".repeat(64),
  }));

  const evidence = plannedEvidence.map((p) => ({
    evidenceId: p.evidenceId,
    sourceId: `source-${p.plannedChapterId}`,
    chapterId: p.plannedChapterId,
    sceneId: p.plannedSceneId,
    continuityId: p.continuityId,
    startOffset: 0,
    endOffset: 1,
    quote: "plan-stage-stub",
    sourceSha256: "0".repeat(64),
  }));

  const corpus = {
    manifest: {
      schemaVersion: "narrative-benchmark/v1" as const,
      corpusId: "contemporary-romance-s-001",
      title: "마감 뒤에 남는 사람",
      language: "ko-KR",
      scaleTier: "S" as const,
      genres: ["contemporary", "romance"] as ("contemporary" | "romance")[],
      seed: "contemporary-romance-s-001-blueprint-v1",
      revision: "0".repeat(64),
      benchmarkEligibility: false,
      humanReviewStatus: "approved" as const,
    },
    world,
    continuities,
    characters,
    goals,
    conflicts,
    propositions,
    events,
    causalEdges,
    relationshipStates,
    relationshipTransitions,
    knowledgeStates,
    timeline,
    foreshadowing: [],
    chapters,
    scenes,
    evidence,
    retrievalQueries: [],
    reasoningQueries: [],
    humanReviews: [],
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const state = createValidationState(corpus as any, sourceDocuments as any);

  function runValidators(): Issue[] {
    const issues: Issue[] = [];
    const ctx = makeCtx(issues);
    validateIdentity(state, ctx);
    validateWorldRecords(state, ctx);
    validateCausality(state, ctx);
    validateRelationships(state, ctx);
    validateKnowledgeAndTimeline(state, ctx);
    validateManuscript(state, ctx);
    return issues;
  }

  const allIssues = runValidators();
  // With planned evidence stubbed in, no evidence-existence relaxation is expected:
  // every referenced evidenceId must resolve to a declared planned affordance.
  const structuralIssues = allIssues.filter((i) => !isRelaxed(i.message));
  const relaxedIssues = allIssues.filter((i) => isRelaxed(i.message));

  it("has 16 events preserving the causal spine", () => {
    expect(events.length).toBe(16);
    // required spine edges from blueprint §8
    const edgeSet = new Set(causalEdges.map((e: any) => `${e.causeEventId}->${e.effectEventId}`));
    for (const req of [
      "event-power-warning->event-unilateral-notice",
      "event-unilateral-notice->event-public-rupture",
      "event-record-review->event-past-meaning",
      "event-contract-close->event-mutual-choice",
    ]) {
      expect(edgeSet.has(req)).toBe(true);
    }
  });

  it("stays within the S tier chapter cap (<= 20)", () => {
    expect(chapters.length).toBeLessThanOrEqual(20);
  });

  // The plan revision digest is quoted in the SSOT, the workflow guide, the corpus
  // README and the human review record. Human review is bound to a digest, so a
  // silent plan edit must not keep the old digest alive: this test is the drift gate.
  it("reproduces the documented plan revision digest", () => {
    const DIGEST_ORDER = [
      "continuities.json",
      "world.json",
      "characters.jsonl",
      "goals.jsonl",
      "conflicts.jsonl",
      "propositions.jsonl",
      "events.jsonl",
      "causal_edges.jsonl",
      "relations.jsonl",
      "relationship_transitions.jsonl",
      "knowledge_states.jsonl",
      "timeline.jsonl",
      "chapter_plans.jsonl",
      "scenes.jsonl",
      "planned_evidence.jsonl",
    ];
    const hash = createHash("sha256");
    for (const name of DIGEST_ORDER) {
      hash.update(readFileSync(resolve(NARRATIVE_DIR, name)));
    }
    expect(hash.digest("hex")).toBe(
      "86cd74936e630f3a761b374940828ce28440e3b18dde1abacccf9d6ec12e9668",
    );
  });

  it("resolves every referenced evidence ID to a declared planned affordance", () => {
    // No evidence-existence relaxation should be needed once planned evidence is
    // registered; an undeclared reference or continuity mismatch would appear here.
    if (relaxedIssues.length > 0) {
      console.error(JSON.stringify(relaxedIssues, null, 2));
    }
    expect(relaxedIssues).toEqual([]);
  });

  it("passes all non-evidence structural validators", () => {
    if (structuralIssues.length > 0) {
      // Surface the actual failures for debugging.
      console.error(JSON.stringify(structuralIssues, null, 2));
    }
    expect(structuralIssues).toEqual([]);
  });
});
