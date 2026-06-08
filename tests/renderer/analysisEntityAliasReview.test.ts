import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("AnalysisSection entity alias review UI", () => {
  it("exposes suggested alias review, confirm, and rejection actions", () => {
    const analysisSource = readFileSync(
      resolve(process.cwd(), "src/renderer/src/features/research/components/AnalysisSection.tsx"),
      "utf8",
    );
    const panelSource = readFileSync(
      resolve(
        process.cwd(),
        "src/renderer/src/features/research/components/analysisSection/EntityAliasReviewPanel.tsx",
      ),
      "utf8",
    );

    expect(analysisSource).toContain("EntityAliasReviewPanel");
    expect(analysisSource).toContain("getEntityAliasReviewQueue");
    expect(analysisSource).toContain("confirmEntityAlias");
    expect(analysisSource).toContain("rejectEntityAlias");
    expect(analysisSource).toContain("splitEntityAlias");
    expect(analysisSource).toContain("mergeEntity");
    expect(panelSource).toContain("검토할 별칭");
    expect(panelSource).toContain("확정");
    expect(panelSource).toContain("거절");
    expect(panelSource).toContain("통합");
    expect(panelSource).toContain("분리");
    expect(panelSource).toContain("canonicalName");
    expect(panelSource).toContain("targetEntityId");
    expect(panelSource).toContain("normalizedAlias");
  });
});
