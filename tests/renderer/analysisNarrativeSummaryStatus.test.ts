import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("AnalysisSection narrative summary status UI", () => {
  it("wires the narrative summary status panel to the analysis section", () => {
    const analysisSource = readFileSync(
      resolve(process.cwd(), "src/renderer/src/features/research/components/AnalysisSection.tsx"),
      "utf8",
    );
    const panelSource = readFileSync(
      resolve(
        process.cwd(),
        "src/renderer/src/features/research/components/analysisSection/review/summary/NarrativeSummaryStatusPanel.tsx",
      ),
      "utf8",
    );

    expect(analysisSource).toContain("NarrativeSummaryStatusPanel");
    expect(analysisSource).toContain("loadNarrativeSummaryStatus");
    expect(panelSource).toContain("analysis.review.summary.title");
    expect(panelSource).toContain("staleCount");
    expect(panelSource).toContain("summary.summary");
  });
});
