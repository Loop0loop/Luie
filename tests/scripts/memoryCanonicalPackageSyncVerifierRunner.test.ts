import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("memory canonical package sync verifier runner", () => {
  it("exposes canonical package sync verification through pnpm", () => {
    const source = readFileSync(
      resolve(process.cwd(), "scripts/verify-memory-canonical-package-sync.ts"),
      "utf8",
    );
    const packageJson = JSON.parse(
      readFileSync(resolve(process.cwd(), "package.json"), "utf8"),
    ) as { scripts?: Record<string, string> };

    expect(source).toContain("verifyMemoryCanonicalPackageSync");
    expect(source).toContain("process.exitCode = 2");
    expect(packageJson.scripts?.["memory:verify-canonical-package-sync"]).toBe(
      "tsx scripts/verify-memory-canonical-package-sync.ts",
    );
  });
});
