import { describe, expect, it } from "vitest";
import { buildEntityVisualBundleFromNarrativeMemory } from "../../src/renderer/src/features/research/components/wiki/visual/useEntityVisualData.js";
import type { NarrativeMemoryQueryResult } from "../../src/shared/types/search.js";

describe("entity visual memory profile", () => {
  it("preserves canonical aliases and mention range for identity integration UI", () => {
    const result: NarrativeMemoryQueryResult = {
      intent: "entity-profile",
      status: "found",
      trace: [],
      facts: [
        {
          id: "fact-1",
          subjectEntityId: "entity-arin",
          predicate: "belongs_to",
          objectEntityId: "entity-baekya",
          objectValue: null,
          valueType: "entity",
          validFromChapterOrder: 3,
          validToChapterOrder: null,
          observedAtChapterOrder: 4,
          confidence: 91,
          status: "confirmed",
          evidenceCount: 2,
          relatedEntityId: "entity-baekya",
          relatedEntityName: "백야회",
          relatedEntityType: "faction",
        },
      ],
      evidence: [],
      profiles: [
        {
          id: "entity-arin",
          canonicalName: "아린",
          entityType: "character",
          status: "confirmed",
          aliases: ["검은 기사", "북부의 그림자"],
          aliasCount: 2,
          mentionCount: 12,
          firstMentionChapterOrder: 1,
          lastMentionChapterOrder: 8,
        },
      ],
    };

    const bundle = buildEntityVisualBundleFromNarrativeMemory(result);

    expect(bundle.identityLine).toBe("confirmed · 2개 별칭 · 출현 12회 · 1~8화");
    expect(bundle.profile).toEqual({
      canonicalName: "아린",
      status: "confirmed",
      aliases: ["검은 기사", "북부의 그림자"],
      aliasCount: 2,
      mentionCount: 12,
      firstMentionChapterOrder: 1,
      lastMentionChapterOrder: 8,
    });
    expect(bundle.related).toEqual([
      {
        kind: "faction",
        name: "백야회",
        role: "belongs_to · confirmed · 근거 있음",
      },
    ]);
  });
});
