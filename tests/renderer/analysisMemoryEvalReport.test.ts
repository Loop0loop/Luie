import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("AnalysisSection memory eval report UI", () => {
  it("wires the memory eval report panel to the analysis section", () => {
    const analysisSource = readFileSync(
      resolve(process.cwd(), "src/renderer/src/features/research/components/AnalysisSection.tsx"),
      "utf8",
    );
    const panelSource = readFileSync(
      resolve(
        process.cwd(),
        "src/renderer/src/features/research/components/analysisSection/review/evaluation/MemoryEvalReportPanel.tsx",
      ),
      "utf8",
    );
    const hookSource = readFileSync(
      resolve(
        process.cwd(),
        "src/renderer/src/features/research/components/analysisSection/review/evaluation/useMemoryEvalPanel.ts",
      ),
      "utf8",
    );

    expect(analysisSource).toContain("MemoryEvalReportPanel");
    expect(analysisSource).toContain("useMemoryEvalPanel");
    expect(hookSource).toContain("api.memoryAdmin.runEvalSuite");
    expect(hookSource).toContain("api.memoryAdmin.runIntentCalibration");
    expect(hookSource).toContain("api.memoryAdmin.runEpisodeCalibration");
    expect(hookSource).toContain("useLlm: true");
    expect(hookSource).toContain("api.memoryAdmin.recordEvalFeedback");
    expect(panelSource).toContain("analysis.review.evaluation.title");
    expect(panelSource).toContain("onRecordAnswerWrong");
    expect(panelSource).toContain("onRecordEvidenceHelpful");
    expect(panelSource).toContain("LLM intent calibration");
    expect(panelSource).toContain("LLM episode calibration");
    expect(panelSource).toContain("averageContextRecallAtK");
    expect(panelSource).toContain("totalP0FailureCount");
  });
});
