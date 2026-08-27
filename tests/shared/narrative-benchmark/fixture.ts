import { createHash } from "node:crypto";
import {
  NARRATIVE_BENCHMARK_SCHEMA_VERSION,
  type NarrativeBenchmarkValidationInput,
} from "../../../src/shared/schemas/narrativeBenchmark";
import { validateNarrativeBenchmark } from "../../../src/shared/validation/narrativeBenchmark";

export const sha = (value: string): string =>
  createHash("sha256").update(value, "utf8").digest("hex");

export const revision = (value: string): string => sha(`revision:${value}`);

function evidenceRange(content: string, quote: string) {
  const utf16Index = content.indexOf(quote);
  if (utf16Index < 0) throw new Error(`Quote not found: ${quote}`);
  const startOffset = [...content.slice(0, utf16Index)].length;
  return { startOffset, endOffset: startOffset + [...quote].length };
}

export function createValidInput(): NarrativeBenchmarkValidationInput {
  const chapter1Content = "해준은 기록의 출처를 숨겼다. 세연은 대답하지 않았다.";
  const chapter2Content = "세연은 비공개 번호를 발견하고 해준의 제안을 거절했다.";
  const quote1 = "해준은 기록의 출처를 숨겼다.";
  const quote2 = "세연은 비공개 번호를 발견하고 해준의 제안을 거절했다.";
  const retrievalRevision = revision("retrieval-query");
  const reasoningRevision = revision("reasoning-query");

  return {
    corpus: {
      manifest: {
        schemaVersion: NARRATIVE_BENCHMARK_SCHEMA_VERSION,
        corpusId: "mystery-s-pilot", title: "닫힌 기록실", language: "ko-KR",
        scaleTier: "S", genres: ["mystery"], seed: "mystery-s-pilot-v1",
        revision: revision("manifest"), benchmarkEligibility: true,
        humanReviewStatus: "approved",
      },
      world: {
        worldId: "world-archive", name: "기록도시",
        rules: [{ ruleId: "rule-private-record", statement: "비공개 기록에는 접근 번호가 필요하다." }],
        revision: revision("world"),
      },
      continuities: [{
        continuityId: "prime", label: "본편", parentContinuityId: null,
        divergenceChapter: null,
      }],
      characters: [
        {
          characterId: "char-seyeon", canonicalName: "한세연", aliases: [],
          introducedChapter: 1, revision: revision("char-seyeon"),
        },
        {
          characterId: "char-haejun", canonicalName: "윤해준", aliases: [],
          introducedChapter: 1, revision: revision("char-haejun"),
        },
      ],
      goals: [{
        goalId: "goal-find-source", characterId: "char-seyeon",
        description: "숨겨진 기록의 출처를 찾는다.", validFromChapter: 1,
        validToChapter: null, continuityId: "prime",
      }],
      conflicts: [{
        conflictId: "conflict-hidden-source",
        participantIds: ["char-seyeon", "char-haejun"],
        description: "기록 출처 공개를 두고 충돌한다.", introducedChapter: 1,
        resolvedChapter: null, continuityId: "prime",
      }],
      propositions: [
        {
          propositionId: "prop-source-is-private",
          statement: "해준이 사용한 기록 번호는 비공개 번호다.",
          canonicalStatus: "confirmed", continuityId: "prime",
          validFromChapter: 1, validToChapter: null,
          evidenceIds: ["evidence-private-number"],
        },
        {
          propositionId: "prop-haejun-hid-source",
          statement: "해준은 기록의 출처를 숨겼다.",
          canonicalStatus: "confirmed", continuityId: "prime",
          validFromChapter: 1, validToChapter: null,
          evidenceIds: ["evidence-hidden-source"],
        },
      ],
      events: [
        {
          eventId: "event-hidden-source", continuityId: "prime",
          eventTime: "day-001-evening", firstNarratedChapter: 1,
          participantIds: ["char-haejun", "char-seyeon"], preconditionEventIds: [],
          effectEventIds: ["event-private-number-found"],
          description: "해준이 기록 출처를 숨긴다.", canonicalStatus: "confirmed",
          revision: revision("event-hidden-source"),
        },
        {
          eventId: "event-private-number-found", continuityId: "prime",
          eventTime: "day-002-morning", firstNarratedChapter: 2,
          participantIds: ["char-seyeon"], preconditionEventIds: ["event-hidden-source"],
          effectEventIds: [], description: "세연이 비공개 기록 번호를 발견한다.",
          canonicalStatus: "confirmed", revision: revision("event-private-number-found"),
        },
      ],
      causalEdges: [{
        causalEdgeId: "causal-source-to-discovery", causeEventId: "event-hidden-source",
        effectEventId: "event-private-number-found", continuityId: "prime", strength: "direct",
        evidenceIds: ["evidence-hidden-source", "evidence-private-number"],
      }],
      relationshipStates: [
        {
          relationshipStateId: "relationship-trust-before",
          sourceCharacterId: "char-seyeon", targetCharacterId: "char-haejun",
          dimension: "trust", value: 0.2, label: "유보적 협력",
          validFromChapter: 1, validToChapter: 1, continuityId: "prime",
          evidenceIds: ["evidence-hidden-source"],
        },
        {
          relationshipStateId: "relationship-trust-after",
          sourceCharacterId: "char-seyeon", targetCharacterId: "char-haejun",
          dimension: "trust", value: -0.6, label: "불신",
          validFromChapter: 2, validToChapter: null, continuityId: "prime",
          evidenceIds: ["evidence-private-number"],
        },
      ],
      relationshipTransitions: [{
        transitionId: "transition-trust-collapse",
        beforeStateId: "relationship-trust-before", afterStateId: "relationship-trust-after",
        triggerEventIds: ["event-private-number-found"], validFromChapter: 2,
        continuityId: "prime", revision: revision("transition-trust-collapse"),
      }],
      knowledgeStates: [{
        knowledgeStateId: "knowledge-private-number", characterId: "char-seyeon",
        propositionId: "prop-source-is-private", state: "known", confidence: 1,
        acquiredByEventId: "event-private-number-found", validFromChapter: 2,
        validToChapter: null, continuityId: "prime",
        evidenceIds: ["evidence-private-number"], revision: revision("knowledge-private-number"),
      }],
      timeline: [
        {
          timelineEntryId: "timeline-hidden-source", eventId: "event-hidden-source",
          continuityId: "prime", eventTime: "day-001-evening", narrativeChapter: 1,
          mode: "present",
        },
        {
          timelineEntryId: "timeline-private-number", eventId: "event-private-number-found",
          continuityId: "prime", eventTime: "day-002-morning", narrativeChapter: 2,
          mode: "present",
        },
      ],
      foreshadowing: [{
        foreshadowId: "foreshadow-record-number", continuityId: "prime",
        setupEvidenceIds: ["evidence-hidden-source"], reminderEvidenceIds: [],
        payoffEvidenceIds: ["evidence-private-number"],
        interpretationBefore: "해준이 출처를 말하지 않는 이유는 불명확하다.",
        interpretationAfter: "해준이 비공개 기록을 사용했다는 사실이 드러난다.",
        status: "resolved", revision: revision("foreshadow-record-number"),
      }],
      chapters: [
        {
          chapterId: "chapter-one", chapterNumber: 1, title: "멈춘 손",
          continuityId: "prime", eventIds: ["event-hidden-source"],
          cliffhanger: "기록 번호가 공개 목록에 없다.", sourceId: "source-chapter-one",
        },
        {
          chapterId: "chapter-two", chapterNumber: 2, title: "비공개 번호",
          continuityId: "prime", eventIds: ["event-private-number-found"],
          cliffhanger: null, sourceId: "source-chapter-two",
        },
      ],
      scenes: [
        {
          sceneId: "scene-one", chapterId: "chapter-one", sceneOrder: 1,
          continuityId: "prime", eventIds: ["event-hidden-source"],
          participantIds: ["char-seyeon", "char-haejun"], locationId: "location-archive",
        },
        {
          sceneId: "scene-two", chapterId: "chapter-two", sceneOrder: 1,
          continuityId: "prime", eventIds: ["event-private-number-found"],
          participantIds: ["char-seyeon"], locationId: "location-archive",
        },
      ],
      evidence: [
        {
          evidenceId: "evidence-hidden-source", sourceId: "source-chapter-one",
          chapterId: "chapter-one", sceneId: "scene-one", continuityId: "prime",
          ...evidenceRange(chapter1Content, quote1), quote: quote1,
          sourceSha256: sha(chapter1Content),
        },
        {
          evidenceId: "evidence-private-number", sourceId: "source-chapter-two",
          chapterId: "chapter-two", sceneId: "scene-two", continuityId: "prime",
          ...evidenceRange(chapter2Content, quote2), quote: quote2,
          sourceSha256: sha(chapter2Content),
        },
      ],
      retrievalQueries: [{
        queryId: "query-find-hidden-source", taxonomy: "fact_retrieval",
        secondaryTaxonomies: ["entity_retrieval"],
        question: "해준은 기록의 출처를 어떻게 했는가?", genre: "mystery",
        difficulty: "single_hop", scope: {
          allowedUntilChapter: 1, includeFuture: false,
          allowedContinuityIds: ["prime"], forbiddenContinuityIds: [],
        },
        revision: retrievalRevision, benchmarkLayer: "retrieval",
        expectedAnswer: {
          answerKind: "fact", propositionIds: ["prop-haejun-hid-source"],
        },
        expectedEvidenceIds: ["evidence-hidden-source"],
      }],
      reasoningQueries: [{
        queryId: "query-why-trust-collapsed", taxonomy: "relationship_change",
        secondaryTaxonomies: ["character_knowledge", "event_causality"],
        question: "세연이 해준을 불신하게 된 과정은 무엇인가?", genre: "mystery",
        difficulty: "multi_hop", scope: {
          allowedUntilChapter: 2, includeFuture: false,
          allowedContinuityIds: ["prime"], forbiddenContinuityIds: [],
        },
        revision: reasoningRevision, benchmarkLayer: "reasoning",
        modes: ["oracle_context", "end_to_end"],
        expectedAnswer: {
          answerKind: "relationship_change",
          relationshipTransitionIds: ["transition-trust-collapse"],
        },
        requiredEvidenceIds: ["evidence-hidden-source", "evidence-private-number"],
        forbiddenClaimIds: [],
      }],
      humanReviews: [
        {
          reviewId: "review-world-blueprint", targetType: "world", targetId: "world-archive",
          stage: "blueprint", reviewerId: "reviewer-narrative", reviewerRole: "narrative",
          label: "GOOD", status: "approved", reasonCodes: [],
          comment: "세계 규칙과 사건 구조가 일관된다.", reviewedRevision: revision("world"),
          reviewedAt: "2026-08-27T14:00:00.000Z",
        },
        {
          reviewId: "review-manuscript-one", targetType: "source_document",
          targetId: "source-chapter-one", stage: "manuscript",
          reviewerId: "reviewer-narrative", reviewerRole: "narrative", label: "GOOD",
          status: "approved", reasonCodes: [],
          comment: "첫 원고가 blueprint 사건을 자연스럽게 표현한다.",
          reviewedRevision: sha(chapter1Content), reviewedAt: "2026-08-27T14:00:00.000Z",
        },
        {
          reviewId: "review-manuscript-two", targetType: "source_document",
          targetId: "source-chapter-two", stage: "manuscript",
          reviewerId: "reviewer-narrative", reviewerRole: "narrative", label: "GOOD",
          status: "approved", reasonCodes: [],
          comment: "둘째 원고가 지식 획득과 관계 변화를 표현한다.",
          reviewedRevision: sha(chapter2Content), reviewedAt: "2026-08-27T14:00:00.000Z",
        },
        {
          reviewId: "review-retrieval-query", targetType: "retrieval_query",
          targetId: "query-find-hidden-source", stage: "query_gold",
          reviewerId: "reviewer-benchmark", reviewerRole: "benchmark", label: "GOOD",
          status: "approved", reasonCodes: [], comment: "단일 근거가 질문을 직접 지지한다.",
          reviewedRevision: retrievalRevision, reviewedAt: "2026-08-27T14:00:00.000Z",
        },
        {
          reviewId: "review-reasoning-query", targetType: "reasoning_query",
          targetId: "query-why-trust-collapsed", stage: "query_gold",
          reviewerId: "reviewer-narrative", reviewerRole: "narrative", label: "GOOD",
          status: "approved", reasonCodes: [],
          comment: "두 화의 근거가 관계 변화의 원인과 결과를 지지한다.",
          reviewedRevision: reasoningRevision, reviewedAt: "2026-08-27T14:00:00.000Z",
        },
      ],
    },
    sourceDocuments: [
      {
        sourceId: "source-chapter-one", chapterId: "chapter-one",
        content: chapter1Content, sha256: sha(chapter1Content),
      },
      {
        sourceId: "source-chapter-two", chapterId: "chapter-two",
        content: chapter2Content, sha256: sha(chapter2Content),
      },
    ],
  };
}

export function issueMessages(input: NarrativeBenchmarkValidationInput): string[] {
  const result = validateNarrativeBenchmark(input);
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
}
