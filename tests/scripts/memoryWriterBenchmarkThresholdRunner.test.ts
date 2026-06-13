import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("memory writer benchmark threshold runner", () => {
  it("exposes persisted writer benchmark threshold assessment through pnpm", () => {
    const source = readFileSync(
      resolve(process.cwd(), "scripts/assess-memory-writer-benchmark-thresholds.ts"),
      "utf8",
    );
    const packageJson = JSON.parse(
      readFileSync(resolve(process.cwd(), "package.json"), "utf8"),
    ) as { scripts?: Record<string, string> };

    expect(source).toContain("memoryWriterTaskBenchmarkRun");
    expect(source).toContain("assessMemoryWriterTaskBenchmarkThresholds");
    expect(source).toContain(
      "buildMemoryWriterTaskBenchmarkFinalizationManifest",
    );
    expect(source).toContain("calibrateMemoryWriterTaskBenchmarkThresholds");
    expect(source).toContain("finalizeMemoryWriterTaskBenchmarkThresholds");
    expect(source).toContain("--calibrate-thresholds");
    expect(source).toContain("--finalization-manifest");
    expect(source).toContain("--finalize-thresholds");
    expect(source).toContain("--confirm-real-beta-data");
    expect(source).toContain("--minimum-beta-runs");
    expect(source).toContain("--assert-thresholds");
    expect(source).toContain("--project-id");
    expect(source).toContain("--out");
    expect(packageJson.scripts?.["memory:assess-writer-benchmark"]).toBe(
      "tsx scripts/assess-memory-writer-benchmark-thresholds.ts",
    );
  });
});
