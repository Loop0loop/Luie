import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("memory phase status runner", () => {
  it("exposes the phase status report through pnpm", () => {
    const source = readFileSync(
      resolve(process.cwd(), "scripts/memory-phase-status.ts"),
      "utf8",
    );
    const packageJson = JSON.parse(
      readFileSync(resolve(process.cwd(), "package.json"), "utf8"),
    ) as { scripts?: Record<string, string> };

    expect(source).toContain("getMemoryPhaseStatusReport");
    expect(source).toContain("--project-id");
    expect(source).toContain("--out");
    expect(source).toContain('arg === "--"');
    expect(packageJson.scripts?.["memory:phase-status"]).toBe(
      "tsx scripts/memory-phase-status.ts",
    );
  });
});
