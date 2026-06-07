import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = () =>
  readFileSync(
    resolve(process.cwd(), "src/main/services/features/rag/contextAssembler.ts"),
    "utf8",
  );

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
});
