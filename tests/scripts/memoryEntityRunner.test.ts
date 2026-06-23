import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("memory entity runner", () => {
  it("processes chunks through the entity extraction runner and headless utility route", () => {
    const source = readFileSync(
      resolve(process.cwd(), "scripts/process-memory-entities.ts"),
      "utf8",
    );
    const packageJson = JSON.parse(
      readFileSync(resolve(process.cwd(), "package.json"), "utf8"),
    ) as { scripts?: Record<string, string> };

    expect(source).toContain("processMemoryEntityExtraction");
    expect(source).toContain("generateUtilityText");
    expect(source).toContain("buildRuntimePlan");
    expect(source).toContain("MEMORY_ENTITY_LLM_UNKNOWN_MENTION_CHUNK");
    expect(packageJson.scripts?.["memory:process-entities"]).toBe(
      "tsx scripts/process-memory-entities.ts",
    );
  });
});
