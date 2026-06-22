import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("memory benchmark latency runner", () => {
  it("exposes writer-facing latency reports through pnpm", () => {
    const source = readFileSync(
      resolve(process.cwd(), "scripts/run-memory-benchmark-latency.ts"),
      "utf8",
    );
    const packageJson = JSON.parse(
      readFileSync(resolve(process.cwd(), "package.json"), "utf8"),
    ) as { scripts?: Record<string, string> };

    expect(source).toContain("runMemoryBenchmarkLatencyReport");
    expect(source).toContain("--project-id");
    expect(source).toContain("--profile");
    expect(source).toContain("--materialize");
    expect(source).toContain("--query");
    expect(source).toContain("--optimization-mode");
    expect(source).toContain("--out");
    expect(source).toContain("--assert-thresholds");
    expect(source).toContain("summarizeMemoryBenchmarkLatencyFailures");
    expect(packageJson.scripts?.["memory:benchmark-latency"]).toBe(
      "tsx scripts/run-memory-benchmark-latency.ts",
    );
  });
});
