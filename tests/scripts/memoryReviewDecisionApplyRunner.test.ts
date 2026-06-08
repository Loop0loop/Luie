import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("memory review decision apply runner", () => {
  it("exposes review decision application through pnpm", () => {
    const source = readFileSync(
      resolve(process.cwd(), "scripts/apply-memory-review-decisions.ts"),
      "utf8",
    );
    const packageJson = JSON.parse(
      readFileSync(resolve(process.cwd(), "package.json"), "utf8"),
    ) as { scripts?: Record<string, string> };

    expect(source).toContain("applyMemoryReviewDecisions");
    expect(source).toContain("validateMemoryReviewDecisionsAgainstDb");
    expect(source).toContain("--dry-run");
    expect(source).toContain("persistPackageAfterMutation");
    expect(packageJson.scripts?.["memory:apply-review-decisions"]).toBe(
      "tsx scripts/apply-memory-review-decisions.ts",
    );
  });
});
