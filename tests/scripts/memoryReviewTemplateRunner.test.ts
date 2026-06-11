import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("memory review template runner", () => {
  it("exposes an intentionally non-mutating review decision template through pnpm", () => {
    const source = readFileSync(
      resolve(process.cwd(), "scripts/generate-memory-review-template.ts"),
      "utf8",
    );
    const packageJson = JSON.parse(
      readFileSync(resolve(process.cwd(), "package.json"), "utf8"),
    ) as { scripts?: Record<string, string> };

    expect(source).toContain("getMemoryReviewBacklogReport");
    expect(source).toContain("--out");
    expect(source).toContain("TODO is intentionally invalid");
    expect(source).toContain("staleEvidence");
    expect(source).toContain('action: "TODO"');
    expect(packageJson.scripts?.["memory:review-template"]).toBe(
      "tsx scripts/generate-memory-review-template.ts",
    );
  });
});
