import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("main embedding runtime boundary", () => {
  it("does not materialize the local embedding sidecar from modelRuntimeFactory", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/main/services/llm/modelRuntimeFactory.ts"),
      "utf8",
    );

    expect(source).not.toContain("resolveEmbeddingRuntimeClient");
    expect(source).not.toContain("embeddingSidecarManager");
  });

  it("does not expose the removed main embedding sidecar manager", () => {
    expect(existsSync(resolve(process.cwd(), "src/main/services/llm/embeddingSidecarManager.ts"))).toBe(false);

    const barrelSource = readFileSync(resolve(process.cwd(), "src/main/services/llm/index.ts"), "utf8");
    const analysisDomainSource = readFileSync(resolve(process.cwd(), "src/main/domains/analysis/index.ts"), "utf8");

    expect(barrelSource).not.toContain("embeddingSidecarManager");
    expect(analysisDomainSource).not.toContain("resolveEmbeddingRuntimeClient");
  });
});
