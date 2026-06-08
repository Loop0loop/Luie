import { describe, expect, it } from "vitest";
import packageJson from "../../package.json";

describe("memory evidence link repair runner", () => {
  it("exposes the evidence link repair script through pnpm", () => {
    expect(packageJson.scripts?.["memory:repair-evidence-links"]).toBe(
      "tsx scripts/repair-memory-evidence-links.ts",
    );
  });
});
