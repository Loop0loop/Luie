import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("AnalysisSection runtime status UI", () => {
  it("uses route/backend terminology and exposes runtime resolution fields", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/renderer/src/features/research/components/AnalysisSection.tsx"),
      "utf8",
    );

    expect(source).not.toContain("llama(sidecar)");
    expect(source).toContain("Requested:");
    expect(source).toContain("Resolved:");
    expect(source).toContain("fallbackUsed");
    expect(source).toContain("skipped");
    expect(source).toContain("sidecarStatusSummary");
    expect(source).toContain("getSidecarStatus");
    expect(source).toContain("onSidecarStatusChanged");
    expect(source).toContain("Sidecar: cooldown");
  });
});
