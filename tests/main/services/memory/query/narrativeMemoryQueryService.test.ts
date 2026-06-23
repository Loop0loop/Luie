import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchTemporalFactsMock = vi.fn();
const fetchFactEvidenceMock = vi.fn();
const fetchConflictFactPairsMock = vi.fn();
const fetchNarrativeSummaryFactsMock = vi.fn();
const fetchChapterSummaryFactsMock = vi.fn();
const resolveChapterOrderMock = vi.fn();
const resolveChapterOrderByChapterIdMock = vi.fn();
const resolveMemoryEntityIdsMock = vi.fn();
const loadEntityProfilesMock = vi.fn();
const classifyNarrativeMemoryQueryPlanWithLlmMock = vi.fn();
const isLlmNarrativeMemoryIntentClassifierEnabledMock = vi.fn();

vi.mock(
  "../../../../../src/main/services/features/memory/query/internal/temporal.js",
  () => ({
    fetchTemporalFacts: fetchTemporalFactsMock,
  }),
);

vi.mock(
  "../../../../../src/main/services/features/memory/query/internal/evidence.js",
  () => ({
    fetchFactEvidence: fetchFactEvidenceMock,
  }),
);

vi.mock(
  "../../../../../src/main/services/features/memory/query/internal/conflicts.js",
  () => ({
    fetchConflictFactPairs: fetchConflictFactPairsMock,
  }),
);

vi.mock(
  "../../../../../src/main/services/features/memory/query/internal/summaries.js",
  () => ({
    fetchNarrativeSummaryFacts: fetchNarrativeSummaryFactsMock,
    fetchChapterSummaryFacts: fetchChapterSummaryFactsMock,
  }),
);

vi.mock(
  "../../../../../src/main/services/features/memory/query/internal/chapter.js",
  () => ({
    resolveChapterOrder: resolveChapterOrderMock,
    resolveChapterOrderByChapterId: resolveChapterOrderByChapterIdMock,
  }),
);

vi.mock(
  "../../../../../src/main/services/features/memory/query/internal/entity.js",
  () => ({
    resolveMemoryEntityIds: resolveMemoryEntityIdsMock,
    loadEntityProfiles: loadEntityProfilesMock,
    loadEntityInfo: vi.fn(),
    resolveRelatedEntity: vi.fn(),
  }),
);

vi.mock(
  "../../../../../src/main/services/features/memory/query/internal/llmIntentClassifier.js",
  () => ({
    classifyNarrativeMemoryQueryPlanWithLlm:
      classifyNarrativeMemoryQueryPlanWithLlmMock,
    isLlmNarrativeMemoryIntentClassifierEnabled:
      isLlmNarrativeMemoryIntentClassifierEnabledMock,
  }),
);

const modulePath =
  "../../../../../src/main/services/features/memory/query/narrativeMemoryQueryService.js";
const queryModule = await import(modulePath);

const {
  buildNarrativeMemoryQueryPlan,
  extractEntityNamesFromQuestion,
  formatNarrativeMemoryQueryResult,
  narrativeMemoryQueryService,
} = queryModule;

beforeEach(() => {
  vi.clearAllMocks();
  resolveChapterOrderMock.mockResolvedValue(10);
  resolveChapterOrderByChapterIdMock.mockResolvedValue(10);
  fetchTemporalFactsMock.mockResolvedValue([]);
  fetchFactEvidenceMock.mockResolvedValue([]);
  fetchConflictFactPairsMock.mockResolvedValue([]);
  fetchNarrativeSummaryFactsMock.mockResolvedValue([]);
  fetchChapterSummaryFactsMock.mockResolvedValue([]);
  isLlmNarrativeMemoryIntentClassifierEnabledMock.mockReturnValue(false);
});

describe("narrative memory query service", () => {
  it("routes relationship-at-chapter questions to temporal relation sources", () => {
    const plan = buildNarrativeMemoryQueryPlan(
      "10화 기준 A와 B는 어떤 관계인가?",
    );

    expect(plan.intent).toBe("relationship-at-chapter");
    expect(plan.sources).toEqual([
      "memory_relation_state",
      "memory_fact_evidence",
    ]);
  });

  it("routes knowledge/state-at-chapter questions to state sources", () => {
    const plan = buildNarrativeMemoryQueryPlan(
      "8화 기준 A는 C의 정체를 아는가?",
    );

    expect(plan.intent).toBe("entity-state-at-chapter");
    expect(plan.sources).toEqual([
      "memory_character_state",
      "memory_knowledge_state",
      "memory_fact_evidence",
    ]);
  });

  it("extracts entity names from Korean state and identity questions", () => {
    expect(
      extractEntityNamesFromQuestion("8화 기준 아린은 백야회의 정체를 아는가?"),
    ).toEqual(["아린", "백야회"]);
    expect(
      extractEntityNamesFromQuestion("검은 기사는 누구야? 별칭도 알려줘"),
    ).toEqual(["검은 기사"]);
  });

  it("uses extracted entity names when resolving memory entities", async () => {
    resolveMemoryEntityIdsMock.mockResolvedValue([
      "entity-arin",
      "entity-baekya",
    ]);

    await narrativeMemoryQueryService.query({
      projectId: "project-1",
      question: "8화 기준 아린은 백야회의 정체를 아는가?",
    });

    expect(resolveMemoryEntityIdsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        entityNames: ["아린", "백야회"],
      }),
    );
  });

  it("uses the LLM intent classifier when the classifier flag is enabled", async () => {
    isLlmNarrativeMemoryIntentClassifierEnabledMock.mockReturnValue(true);
    classifyNarrativeMemoryQueryPlanWithLlmMock.mockResolvedValue({
      intent: "contradiction-check",
      sources: ["memory_fact_invalidation", "memory_fact"],
      reason: "LLM classified the question as a contradiction check",
    });

    const result = await narrativeMemoryQueryService.query({
      projectId: "project-1",
      question: "이 설정 이상한 부분 있어?",
    });

    expect(classifyNarrativeMemoryQueryPlanWithLlmMock).toHaveBeenCalledWith({
      projectId: "project-1",
      question: "이 설정 이상한 부분 있어?",
    });
    expect(fetchConflictFactPairsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: "project-1",
      }),
    );
    expect(result.intent).toBe("contradiction-check");
    expect(result.trace[0]).toMatchObject({
      source: "memory_fact_invalidation",
      reason: "LLM classified the question as a contradiction check",
    });
  });

  it("routes contradiction checks away from generic chunk retrieval", () => {
    const plan = buildNarrativeMemoryQueryPlan("현재 설정 충돌 검사해줘");

    expect(plan.intent).toBe("contradiction-check");
    expect(plan.sources).toEqual(["memory_fact_invalidation", "memory_fact"]);
  });

  it("routes evidence trace questions to raw memory chunk evidence", () => {
    const plan = buildNarrativeMemoryQueryPlan(
      "A가 처음 말한 근거 원문을 찾아줘",
    );

    expect(plan.intent).toBe("evidence-trace");
    expect(plan.sources).toEqual(["memory_chunk_evidence"]);
  });

  it("routes event causality questions to episode and state-change sources", () => {
    const plan = buildNarrativeMemoryQueryPlan("A가 B를 떠난 원인은 왜인가?");

    expect(plan.intent).toBe("event-causality");
    expect(plan.sources).toEqual([
      "memory_episode",
      "memory_state_change_candidate",
    ]);
  });

  it("routes unresolved thread questions to episode and fact sources", () => {
    const plan = buildNarrativeMemoryQueryPlan("아직 미회수 떡밥은 뭐야?");

    expect(plan.intent).toBe("unresolved-thread-check");
    expect(plan.sources).toEqual(["memory_episode", "memory_fact"]);
  });

  it("routes global summary questions to summary sources", () => {
    const plan = buildNarrativeMemoryQueryPlan("전체 흐름 요약해줘");

    expect(plan.intent).toBe("global-summary");
    expect(plan.sources).toEqual(["chapter_summary", "world_document"]);
  });

  it("routes entity profile questions to entity sources", () => {
    const plan = buildNarrativeMemoryQueryPlan(
      "검은 기사는 누구야? 별칭도 알려줘",
    );

    expect(plan.intent).toBe("entity-profile");
    expect(plan.sources).toEqual([
      "memory_entity",
      "memory_entity_mention",
      "memory_fact_evidence",
    ]);
  });

  it("returns entity profile rows for entity-profile query", async () => {
    resolveMemoryEntityIdsMock.mockResolvedValue(["entity-black"]);
    loadEntityProfilesMock.mockResolvedValue([
      {
        id: "entity-black",
        canonicalName: "검은 기사",
        entityType: "character",
        status: "confirmed",
        aliases: ["그림자기사", "어둠의 검"],
        aliasCount: 2,
        mentionCount: 12,
        firstMentionChapterOrder: 1,
        lastMentionChapterOrder: 4,
      },
    ]);

    const result = await narrativeMemoryQueryService.query({
      projectId: "project-1",
      question: "검은 기사는 누구야? 별칭도 알려줘",
      entityName: "검은 기사",
      entityType: "character",
    });

    expect(result.intent).toBe("entity-profile");
    expect(result.status).toBe("found");
    expect(result.profiles).toHaveLength(1);
    expect(result.profiles?.[0]).toMatchObject({
      id: "entity-black",
      canonicalName: "검은 기사",
      aliases: ["그림자기사", "어둠의 검"],
    });
  });

  it("falls back to evidence trace for ambiguous questions", () => {
    const plan = buildNarrativeMemoryQueryPlan("그 장면 다시 알려줘");

    expect(plan.intent).toBe("evidence-trace");
    expect(plan.sources).toEqual(["memory_chunk_evidence"]);
  });

  it("formats insufficient evidence as a successful traced memory result", () => {
    const section = formatNarrativeMemoryQueryResult({
      intent: "relationship-at-chapter",
      status: "insufficient_evidence",
      trace: [
        {
          source: "memory_relation_state",
          decision: "selected",
          reason: "relationship question",
        },
      ],
      facts: [],
      evidence: [],
    });

    expect(section).toContain("intent=relationship-at-chapter");
    expect(section).toContain("status=insufficient_evidence");
    expect(section).toContain("No sufficient narrative memory evidence");
  });

  it("formats fact-level evidence count and related entity metadata", () => {
    const section = formatNarrativeMemoryQueryResult({
      intent: "relationship-at-chapter",
      status: "found",
      trace: [],
      facts: [
        {
          id: "fact-1",
          subjectEntityId: "entity-a",
          predicate: "belongs_to",
          objectEntityId: "entity-b",
          objectValue: null,
          valueType: "entity",
          validFromChapterOrder: 1,
          validToChapterOrder: null,
          observedAtChapterOrder: 2,
          confidence: 90,
          status: "confirmed",
          evidenceCount: 2,
          relatedEntityId: "entity-b",
          relatedEntityName: "청룡문",
          relatedEntityType: "faction",
        },
      ],
      evidence: [],
    });

    expect(section).toContain("related=청룡문");
    expect(section).toContain("evidence=2");
  });
});
