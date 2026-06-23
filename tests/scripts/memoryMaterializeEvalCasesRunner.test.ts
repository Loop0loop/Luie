import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("memory eval case materialization runner", () => {
  it("exposes writer pain point taxonomy repair through pnpm", () => {
    const source = readFileSync(
      resolve(process.cwd(), "scripts/materialize-memory-eval-cases.ts"),
      "utf8",
    );
    const packageJson = JSON.parse(
      readFileSync(resolve(process.cwd(), "package.json"), "utf8"),
    ) as { scripts?: Record<string, string> };

    expect(source).toContain("repairWriterPainPointTaxonomyEvalCases");
    expect(source).toContain("auditMemoryEvalCaseQuality");
    expect(source).toContain("materializeTemporalChapterEvalCasesFromChunks");
    expect(source).toContain("--temporal-chapter");
    expect(source).toContain("--quality-audit");
    expect(source).toContain("--repair-quality");
    expect(source).toContain("--repair-taxonomy");
    expect(source).toContain("--limit must be an integer from 1 to 1000");
    expect(packageJson.scripts?.["memory:materialize-eval-cases"]).toBe(
      "tsx scripts/materialize-memory-eval-cases.ts",
    );
  });
});
