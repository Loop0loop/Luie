import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("memory review backlog runner", () => {
  it("exposes the review backlog report through pnpm", () => {
    const source = readFileSync(
      resolve(process.cwd(), "scripts/memory-review-backlog.ts"),
      "utf8",
    );
    const packageJson = JSON.parse(
      readFileSync(resolve(process.cwd(), "package.json"), "utf8"),
    ) as { scripts?: Record<string, string> };

    expect(source).toContain("getMemoryReviewBacklogReport");
    expect(source).toContain("--evidence-limit");
    expect(source).toContain("--out");
    expect(packageJson.scripts?.["memory:review-backlog"]).toBe(
      "tsx scripts/memory-review-backlog.ts",
    );
  });
});
