import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("AnalysisSection runtime status UI", () => {
  it("uses route/backend terminology and exposes runtime resolution fields", () => {
    const analysisSource = readFileSync(
      resolve(process.cwd(), "src/renderer/src/features/research/components/AnalysisSection.tsx"),
      "utf8",
    );
    const runtimePanelSource = readFileSync(
      resolve(
        process.cwd(),
        "src/renderer/src/features/research/components/analysisSection/runtime/RuntimeStatusPanel.tsx",
      ),
      "utf8",
    );
    const runtimeHelpersSource = readFileSync(
      resolve(
        process.cwd(),
        "src/renderer/src/features/research/components/analysisSection/runtime/runtimeHelpers.ts",
      ),
      "utf8",
    );
    const source = `${analysisSource}\n${runtimePanelSource}\n${runtimeHelpersSource}`;

    expect(source).not.toContain("llama(sidecar)");
    expect(source).toContain("Req:");
    expect(source).toContain("Res:");
    expect(source).toContain("Backend:");
    expect(source).toContain("Model:");
    expect(source).toContain("fallbackUsed");
    expect(source).toContain("skipped");
    expect(source).toContain("RuntimeStatusPanel");
    expect(source).toContain("sidecarStatusTone");
    expect(source).toContain("sidecarStatusSummary");
    expect(source).toContain("Sidecar: cooldown");
    expect(source).not.toContain("/ ${status.lastError}");
  });
});
