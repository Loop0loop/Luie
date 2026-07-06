import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { normalizeSearchTokens } from "../../../../src/main/services/features/search/tokenNormalization.js";

describe("chunk search token normalization", () => {
  it("keeps Korean suffix normalization in the search layer", () => {
    expect(normalizeSearchTokens("루디우스는 주인공이랑")).toEqual(
      expect.arrayContaining(["루디우스", "주인공"]),
    );
  });

  it("does not duplicate Korean suffix tables in RAG layer3", () => {
    const source = readFileSync(
      resolve(
        process.cwd(),
        "src/main/services/features/rag/internal/contextAssembler.layer3.ts",
      ),
      "utf8",
    );

    expect(source).not.toContain("KOREAN_SUFFIXES");
  });

  it("keeps hybrid chunk ranking in the search layer", () => {
    const chunkOperations = readFileSync(
      resolve(process.cwd(), "src/main/services/features/search/chunkOperations.ts"),
      "utf8",
    );
    const ragSearch = readFileSync(
      resolve(
        process.cwd(),
        "src/main/services/features/rag/internal/contextAssembler.search.ts",
      ),
      "utf8",
    );

    expect(chunkOperations).toContain("searchHybridChunkRanks");
    expect(ragSearch).toContain("searchHybridChunkRanks");
    expect(ragSearch).not.toContain("searchByShortTokens");
    expect(ragSearch).not.toContain("searchByVector");
  });
});
