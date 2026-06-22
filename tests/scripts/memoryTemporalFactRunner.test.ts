import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("memory temporal fact runner", () => {
  it("processes pending episode evidence through the temporal fact runner and headless utility route", () => {
    const source = readFileSync(
      resolve(process.cwd(), "scripts/process-memory-temporal-facts.ts"),
      "utf8",
    );
    const packageJson = JSON.parse(
      readFileSync(resolve(process.cwd(), "package.json"), "utf8"),
    ) as { scripts?: Record<string, string> };

    expect(source).toContain("processPendingTemporalFactExtraction");
    expect(source).toContain("generateUtilityText");
    expect(source).toContain("buildRuntimePlan");
    expect(source).toContain("MEMORY_TEMPORAL_FACT_LLM_UNKNOWN_ENTITY");
    expect(packageJson.scripts?.["memory:process-temporal-facts"]).toBe(
      "tsx scripts/process-memory-temporal-facts.ts",
    );
  });
});
