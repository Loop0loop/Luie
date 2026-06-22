import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("memory canonical package export runner", () => {
  it("exports attached .luie memory payload through pnpm", () => {
    const source = readFileSync(
      resolve(process.cwd(), "scripts/export-memory-canonical-package.ts"),
      "utf8",
    );
    const packageJson = JSON.parse(
      readFileSync(resolve(process.cwd(), "package.json"), "utf8"),
    ) as { scripts?: Record<string, string> };

    expect(source).toContain("exportProjectPackageWithOptions");
    expect(source).not.toContain("projectService");
    expect(source).toContain("readLuieContainerEntry");
    expect(source).toContain("memoryPayloadRows");
    expect(packageJson.scripts?.["memory:export-canonical-package"]).toBe(
      "tsx scripts/export-memory-canonical-package.ts",
    );
  });
});
