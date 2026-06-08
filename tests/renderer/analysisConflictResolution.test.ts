import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("AnalysisSection conflict resolution UI", () => {
  it("exposes conflict pair resolution actions", () => {
    const analysisSource = readFileSync(
      resolve(process.cwd(), "src/renderer/src/features/research/components/AnalysisSection.tsx"),
      "utf8",
    );
    const panelSource = readFileSync(
      resolve(
        process.cwd(),
        "src/renderer/src/features/research/components/analysisSection/ConflictQueuePanel.tsx",
      ),
      "utf8",
    );

    expect(analysisSource).toContain("resolveFactConflict");
    expect(analysisSource).toContain("handleResolveConflict");
    expect(panelSource).toContain("채택");
    expect(panelSource).toContain("onResolve");
    expect(panelSource).toContain("invalidatedFact.id");
    expect(panelSource).toContain("invalidatingFact.id");
  });
});
