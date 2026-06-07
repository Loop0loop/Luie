import { describe, expect, it } from "vitest";
import {
  filterFactsValidAtChapter,
  isMemoryFactValidAtChapter,
} from "../../../../../src/main/services/features/memory/temporal/memoryTemporalFact.js";

const baseFact = {
  id: "fact-1",
  status: "confirmed",
  validFromChapterOrder: 5,
  validToChapterOrder: null,
  observedAtChapterOrder: 5,
  invalidatedByFactId: null,
};

describe("memory temporal fact helpers", () => {
  it("does not use future facts for past-time answers", () => {
    expect(
      isMemoryFactValidAtChapter(
        {
          ...baseFact,
          validFromChapterOrder: 11,
          observedAtChapterOrder: 11,
        },
        10,
      ),
    ).toBe(false);
  });

  it("excludes facts after their valid-to chapter", () => {
    expect(
      isMemoryFactValidAtChapter(
        {
          ...baseFact,
          validToChapterOrder: 8,
        },
        9,
      ),
    ).toBe(false);
  });

  it("excludes rejected, deprecated, and invalidated facts", () => {
    expect(
      filterFactsValidAtChapter(
        [
          { ...baseFact, id: "confirmed" },
          { ...baseFact, id: "rejected", status: "rejected" },
          { ...baseFact, id: "deprecated", status: "deprecated" },
          { ...baseFact, id: "invalidated", invalidatedByFactId: "fact-new" },
        ],
        7,
      ).map((fact) => fact.id),
    ).toEqual(["confirmed"]);
  });
});
