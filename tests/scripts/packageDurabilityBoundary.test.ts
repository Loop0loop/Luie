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

const REVISIONED_WORLD_ENTITY_TARGETS = new Set([
  "src/main/services/features/world/entities/characterService.ts",
  "src/main/services/features/world/entities/termService.ts",
  "src/main/services/features/world/entities/eventService.ts",
  "src/main/services/features/world/entities/factionService.ts",
]);

describe("canonical write durability boundary", () => {
  it("routes canonical writes through a durable export boundary", async () => {
    const violations = (
      await Promise.all(
        IMMEDIATE_DURABILITY_TARGETS.map(async (relativePath) => {
          const absolutePath = path.join(process.cwd(), relativePath);
          const source = await fs.readFile(absolutePath, "utf8");
          const hasExportBoundary =
            source.includes("persistPackageAfterMutation(") ||
            source.includes("schedulePackageExport(");
          const hasRequiredRevision =
            !REVISIONED_WORLD_ENTITY_TARGETS.has(relativePath) ||
            source.includes("bumpProjectRevision(");
          return hasExportBoundary && hasRequiredRevision ? null : relativePath;
        }),
      )
    ).filter((value): value is string => Boolean(value));

    expect(
      violations,
      "Canonical write services must commit their required revision and use a central package export boundary.",
    ).toEqual([]);
  });
});
