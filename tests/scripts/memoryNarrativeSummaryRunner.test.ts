import { describe, expect, it } from "vitest";
import packageJson from "../../package.json";

describe("memory narrative summary runner", () => {
  it("exposes narrative summary materialization through pnpm", () => {
    expect(packageJson.scripts?.["memory:process-narrative-summaries"]).toBe(
      "tsx scripts/process-memory-narrative-summaries.ts",
    );
  });
});
