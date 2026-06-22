import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("memory chunk rebuild runner", () => {
  it("uses the main Drizzle services and is exposed through pnpm scripts", () => {
    const source = readFileSync(
      resolve(process.cwd(), "scripts/rebuild-memory-chunks.ts"),
      "utf8",
    );
    const packageJson = JSON.parse(
      readFileSync(resolve(process.cwd(), "package.json"), "utf8"),
    ) as { scripts?: Record<string, string> };

    expect(source).toContain("rebuildMemoryChunks");
    expect(source).toContain("memoryProjectionService.processPendingChunkJobs");
    expect(source).toContain(
      "../src/main/services/features/dbMaintenance/dbMaintenanceMemory.js",
    );
    expect(source).not.toContain(
      "../src/main/services/features/dbMaintenanceService.js",
    );
    expect(source).toContain("missingContextLabel");
    expect(source).toContain("missingSourceHash");
    expect(packageJson.scripts?.["memory:rebuild-chunks"]).toBe(
      "tsx scripts/rebuild-memory-chunks.ts",
    );
  });
});
