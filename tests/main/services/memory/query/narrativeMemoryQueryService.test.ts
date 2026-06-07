import { describe, expect, it } from "vitest";
import {
  buildNarrativeMemoryQueryPlan,
  formatNarrativeMemoryQueryResult,
} from "../../../../../src/main/services/features/memory/query/narrativeMemoryQueryService.js";

describe("narrative memory query service", () => {
  it("routes relationship-at-chapter questions to temporal relation sources", () => {
    const plan = buildNarrativeMemoryQueryPlan("10화 기준 A와 B는 어떤 관계인가?");

    expect(plan.intent).toBe("relationship-at-chapter");
    expect(plan.sources).toEqual(["memory_relation_state", "memory_fact_evidence"]);
  });

  it("routes knowledge/state-at-chapter questions to state sources", () => {
    const plan = buildNarrativeMemoryQueryPlan("8화 기준 A는 C의 정체를 아는가?");

    expect(plan.intent).toBe("entity-state-at-chapter");
    expect(plan.sources).toEqual([
      "memory_character_state",
      "memory_knowledge_state",
      "memory_fact_evidence",
    ]);
  });

  it("routes contradiction checks away from generic chunk retrieval", () => {
    const plan = buildNarrativeMemoryQueryPlan("현재 설정 충돌 검사해줘");

    expect(plan.intent).toBe("contradiction-check");
    expect(plan.sources).toEqual(["memory_fact_invalidation", "memory_fact"]);
  });

  it("routes evidence trace questions to raw memory chunk evidence", () => {
    const plan = buildNarrativeMemoryQueryPlan("A가 처음 말한 근거 원문을 찾아줘");

    expect(plan.intent).toBe("evidence-trace");
    expect(plan.sources).toEqual(["memory_chunk_evidence"]);
  });

  it("routes event causality questions to episode and state-change sources", () => {
    const plan = buildNarrativeMemoryQueryPlan("A가 B를 떠난 원인은 왜인가?");

    expect(plan.intent).toBe("event-causality");
    expect(plan.sources).toEqual(["memory_episode", "memory_state_change_candidate"]);
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
    const plan = buildNarrativeMemoryQueryPlan("검은 기사는 누구야? 별칭도 알려줘");

    expect(plan.intent).toBe("entity-profile");
    expect(plan.sources).toEqual(["memory_entity", "memory_entity_mention", "memory_fact_evidence"]);
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
});
