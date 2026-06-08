import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("memory episode job runner", () => {
  it("processes pending jobs through the real processor and headless utility route", () => {
    const source = readFileSync(
      resolve(process.cwd(), "scripts/process-memory-episode-jobs.ts"),
      "utf8",
    );
    const packageJson = JSON.parse(
      readFileSync(resolve(process.cwd(), "package.json"), "utf8"),
    ) as { scripts?: Record<string, string> };

    expect(source).toContain("processPendingEpisodeExtractionJobs");
    expect(source).toContain("generateUtilityText");
    expect(source).toContain("buildRuntimePlan");
    expect(source).toContain("MEMORY_EPISODE_LLM_UNKNOWN_EVIDENCE_CHUNK");
    expect(source).not.toContain("utilityProcessBridge");
    expect(packageJson.scripts?.["memory:process-episodes"]).toBe(
      "tsx scripts/process-memory-episode-jobs.ts",
    );
  });
});
