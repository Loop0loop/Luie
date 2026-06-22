import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("AnalysisSection temporal fact review UI", () => {
  it("exposes suggested fact review, confirm, and rejection actions", () => {
    const analysisSource = readFileSync(
      resolve(process.cwd(), "src/renderer/src/features/research/components/AnalysisSection.tsx"),
      "utf8",
    );
    const panelSource = readFileSync(
      resolve(
        process.cwd(),
        "src/renderer/src/features/research/components/analysisSection/FactReviewPanel.tsx",
      ),
      "utf8",
    );

    expect(analysisSource).toContain("FactReviewPanel");
    expect(analysisSource).toContain("getFactReviewQueue");
    expect(analysisSource).toContain("confirmFact");
    expect(analysisSource).toContain("rejectFact");
    expect(panelSource).toContain("검토할 사실");
    expect(panelSource).toContain("canonical memory로 승인");
    expect(analysisSource).toContain("canonical memory로 승인했습니다.");
    expect(panelSource).toContain("거절");
    expect(panelSource).toContain("evidenceCount");
  });
});
