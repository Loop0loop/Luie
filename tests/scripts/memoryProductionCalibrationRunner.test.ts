import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("memory production calibration runner", () => {
  it("uses the real utility LLM route for episode and intent calibration", () => {
    const source = readFileSync(
      resolve(process.cwd(), "scripts/run-memory-production-calibration.ts"),
      "utf8",
    );

    expect(source).toContain("generateUtilityText");
    expect(source).toContain("buildCalibrationRuntimePlan");
    expect(source).toContain("runMemoryEpisodeExtractorCalibration");
    expect(source).toContain("runNarrativeMemoryIntentClassifierCalibration");
    expect(source).toContain("runLiveProjectEpisodeCalibration");
    expect(source).toContain("MemoryChunk");
    expect(source).toContain("node:sqlite");
    expect(source).not.toContain("bun:sqlite");
    expect(source).not.toContain("better-sqlite3");
    expect(source).toContain("LUIE_RUNTIME_DATABASE_URL");
    expect(source).toContain("Application Support");
    expect(source).toContain("app-dev.db");
    expect(source).not.toContain("process.env.DATABASE_URL?.trim()");
    expect(source).toContain("providerName");
    expect(source).toContain("phase4");
    expect(source).toContain("phase4-live");
    expect(source).toContain("phase6");
  });

  it("is exposed through the pnpm script surface", () => {
    const packageJson = JSON.parse(
      readFileSync(resolve(process.cwd(), "package.json"), "utf8"),
    ) as { scripts?: Record<string, string> };

    expect(packageJson.scripts?.["memory:calibrate"]).toBe(
      "tsx scripts/run-memory-production-calibration.ts",
    );
  });
});
