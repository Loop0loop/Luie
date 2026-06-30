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
    expect(source).toContain("--shadow-beta-genre-scope");
    expect(source).toContain("--shadow-beta-chapter-scope");
    expect(source).toContain("maxShadowBetaChapter");
    expect(source).toContain("queryChapterOrder");
    expect(source).toContain("requires queryChapterOrder");
    expect(packageJson.scripts?.["memory:run-eval-suite"]).toBe(
      "tsx scripts/run-memory-eval-suite.ts",
    );
  });

  it("imports shadow beta allowedUntilChapter for every task type", () => {
    const source = readFileSync(
      resolve(process.cwd(), "scripts/import-shadow-beta-novel-eval-cases.ts"),
      "utf8",
    );

    expect(source).toContain("queryChapterOrder: question.allowedUntilChapter ?? null");
    expect(source).not.toContain('question.taskType === "chapter_knowledge_state"');
    expect(source).toContain("if (combined.feedback.length > 0)");
  });

  it("keeps Gemini writer answers from adding generic future warnings", () => {
    const source = readFileSync(
      resolve(process.cwd(), "scripts/run-shadow-beta-gemini-faithfulness.ts"),
      "utf8",
    );

    expect(source).toContain("일반적인 '이후 회차 주의' 문장은 쓰지 마라");
    expect(source).toContain("질문 속 집필안이 근거로 직접 지지될 때만");
  });
});
