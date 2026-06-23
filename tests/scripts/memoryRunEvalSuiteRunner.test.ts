import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("memory eval suite runner", () => {
  it("runs live memory eval through RAG context evidence retrieval", () => {
    const source = readFileSync(
      resolve(process.cwd(), "scripts/run-memory-eval-suite.ts"),
      "utf8",
    );
    const packageJson = JSON.parse(
      readFileSync(resolve(process.cwd(), "package.json"), "utf8"),
    ) as { scripts?: Record<string, string> };

    expect(source).toContain("runLiveMemoryEvalSuite");
    expect(source).toContain("buildLayer3Evidence");
    expect(source).not.toContain("assembleRagContext");
    expect(source).toContain("buildRagGrounding");
    expect(source).toContain("--min-recall");
    expect(source).toContain("--max-p0-failures");
    expect(source).toContain("--optimization-mode");
    expect(source).toContain("--assert-optimized-recall");
    expect(source).toContain("resolveSearchOptimizationPolicy");
    expect(source).toContain("optimizationPolicy");
    expect(source).toContain("summarizeMemoryEvalOptimizationFailures");
    expect(source).toContain("buildMemoryWriterTaskBenchmarkRealBetaRunLabel");
    expect(source).toContain("MEMORY_WRITER_TASK_REAL_BETA_LABEL_PREFIX");
    expect(source).toContain("--real-beta-run-id");
    expect(packageJson.scripts?.["memory:run-eval-suite"]).toBe(
      "tsx scripts/run-memory-eval-suite.ts",
    );
  });
});
