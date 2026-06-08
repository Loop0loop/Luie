import { describe, expect, it, vi } from "vitest";

const generateTextMock = vi.hoisted(() => vi.fn());

vi.mock("../../../../../src/main/services/features/utility/utilityProcessBridge.js", () => ({
  utilityProcessBridge: {
    generateText: generateTextMock,
  },
}));

describe("classifyNarrativeMemoryQueryPlanWithLlm", () => {
  it("returns a validated route plan from LLM JSON", async () => {
    generateTextMock.mockReset();
    generateTextMock.mockResolvedValue({
      providerName: "test-provider",
      text: JSON.stringify({
        intent: "relationship-at-chapter",
        sources: ["memory_relation_state", "memory_fact_evidence"],
        reason: "question asks relationship at bounded chapter",
      }),
    });

    const { classifyNarrativeMemoryQueryPlanWithLlm } = await import(
      "../../../../../src/main/services/features/memory/query/internal/llmIntentClassifier.js"
    );
    const result = await classifyNarrativeMemoryQueryPlanWithLlm({
      projectId: "project-1",
      question: "10화 기준 아린과 백야회는 어떤 관계인가?",
    });

    expect(result).toEqual({
      intent: "relationship-at-chapter",
      sources: ["memory_relation_state", "memory_fact_evidence"],
      reason: "question asks relationship at bounded chapter",
    });
    expect(generateTextMock).toHaveBeenCalledWith(
      "project-1",
      expect.stringContaining("10화 기준 아린과 백야회"),
      { maxTokens: 500, temperature: 0 },
    );
    expect(generateTextMock.mock.calls[0]?.[1]).toContain(
      "relationship-at-chapter => memory_relation_state, memory_fact_evidence",
    );
    expect(generateTextMock.mock.calls[0]?.[1]).toContain(
      "contradiction-check => memory_fact_invalidation, memory_fact",
    );
  });

  it("rejects unknown memory sources", async () => {
    generateTextMock.mockReset();
    generateTextMock.mockResolvedValue({
      providerName: "test-provider",
      text: JSON.stringify({
        intent: "relationship-at-chapter",
        sources: ["unknown_source"],
        reason: "bad source",
      }),
    });

    const { classifyNarrativeMemoryQueryPlanWithLlm } = await import(
      "../../../../../src/main/services/features/memory/query/internal/llmIntentClassifier.js"
    );

    await expect(
      classifyNarrativeMemoryQueryPlanWithLlm({
        projectId: "project-1",
        question: "관계 알려줘",
      }),
    ).rejects.toThrow("Invalid input");
  });
});
