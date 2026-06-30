import { promises as fs } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const IMMEDIATE_DURABILITY_TARGETS = [
  "src/main/services/features/manuscript/chapterService.ts",
  "src/main/services/features/world/entities/characterService.ts",
  "src/main/services/features/world/entities/termService.ts",
  "src/main/services/features/world/entities/eventService.ts",
  "src/main/services/features/world/entities/factionService.ts",
  "src/main/services/features/world/entities/worldEntityService.ts",
  "src/main/services/features/world/graph/entityRelationService.ts",
];

describe("canonical write durability boundary", () => {
  it("does not reintroduce debounce-only package export in canonical write services", async () => {
    const violations = (
      await Promise.all(
        IMMEDIATE_DURABILITY_TARGETS.map(async (relativePath) => {
          const absolutePath = path.join(process.cwd(), relativePath);
          const source = await fs.readFile(absolutePath, "utf8");
          return source.includes("schedulePackageExport(") ? relativePath : null;
        }),
      )
    ).filter((value): value is string => Boolean(value));

    expect(
      violations,
      "Canonical write services should use the immediate durability helper instead of debounce-only export.",
    ).toEqual([]);
  });
});
