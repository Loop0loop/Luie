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
        "src/renderer/src/features/research/components/analysisSection/MemoryEvalReportPanel.tsx",
      ),
      "utf8",
    );

    expect(analysisSource).toContain("MemoryEvalReportPanel");
    expect(analysisSource).toContain("api.memoryAdmin.runEvalSuite");
    expect(analysisSource).toContain("api.memoryAdmin.runIntentCalibration");
    expect(analysisSource).toContain("api.memoryAdmin.runEpisodeCalibration");
    expect(analysisSource).toContain("useLlm: true");
    expect(panelSource).toContain("메모리 평가");
    expect(panelSource).toContain("LLM intent calibration");
    expect(panelSource).toContain("LLM episode calibration");
    expect(panelSource).toContain("averageContextRecallAtK");
    expect(panelSource).toContain("totalP0FailureCount");
  });
});
