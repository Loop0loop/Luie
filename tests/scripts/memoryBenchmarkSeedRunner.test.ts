import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("memory benchmark seed runner", () => {
  it("exposes deterministic longform benchmark seed generation through pnpm", () => {
    const source = readFileSync(
      resolve(process.cwd(), "scripts/generate-memory-benchmark-seed.ts"),
      "utf8",
    );
    const packageJson = JSON.parse(
      readFileSync(resolve(process.cwd(), "package.json"), "utf8"),
    ) as { scripts?: Record<string, string> };

    expect(source).toContain("buildMemoryLongformBenchmarkSeed");
    expect(source).toContain("--profile");
    expect(source).toContain("--seed");
    expect(source).toContain("--out");
    expect(source).toContain("--materialize");
    expect(source).toContain("--project-id");
    expect(source).toContain("materializeMemoryLongformBenchmark");
    expect(source).toContain("ci-1000");
    expect(packageJson.scripts?.["memory:benchmark-seed"]).toBe(
      "tsx scripts/generate-memory-benchmark-seed.ts",
    );
  });
});
