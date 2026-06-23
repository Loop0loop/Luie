import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = () =>
  [
    "src/main/services/features/rag/contextAssembler.ts",
    "src/main/services/features/rag/internal/contextAssembler.layers.ts",
    "src/main/services/features/rag/internal/contextAssembler.layer2.ts",
  ]
    .map((filePath) =>
      readFileSync(resolve(process.cwd(), filePath), "utf8"),
    )
    .join("\n");

describe("RAG context assembler source boundary", () => {
  it("keeps broad world data in the RAG context layer, not only question-matched entities", () => {
    const contextAssembler = source();

    expect(contextAssembler).toContain("buildLayer2WorldContext");
    expect(contextAssembler).toContain("worldEntity");
    expect(contextAssembler).toContain("entityRelation");
    expect(contextAssembler).toContain("scrapMemo");
    expect(contextAssembler).toContain("[WORLD ENTITIES]");
    expect(contextAssembler).toContain("[RELATIONS]");
    expect(contextAssembler).toContain("[SCRAP MEMOS]");
  });

  it("passes selected chapter scope into narrative memory query", () => {
    const contextAssembler = source();

    expect(contextAssembler).toContain("narrativeMemoryQueryService.query");
    expect(contextAssembler).toContain("chapterId: input.chapterId");
    expect(contextAssembler).toContain("includePriorMemory: input.includePriorMemory");
  });
});
