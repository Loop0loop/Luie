import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("searchService embedding process boundary", () => {
  it("uses utilityProcessBridge for query embeddings instead of main runtime materialization", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/main/services/features/searchService.ts"),
      "utf8",
    );

    expect(source).toContain('from "./utility/utilityProcessBridge.js"');
    expect(source).toContain("utilityProcessBridge.embed");
    expect(source).not.toContain("resolveEmbeddingRuntimeClient");
    expect(source).not.toContain("../llm/modelRuntimeFactory");
  });
});
