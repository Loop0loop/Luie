import { promises as fs } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("appearance cache isolation boundary", () => {
  it("keeps rebuildable appearance models out of the main runtime schema", async () => {
    const root = process.cwd();
    const [packagedSchema, cachePackagedSchema] = await Promise.all([
      fs.readFile(
        path.join(root, "src", "main", "database", "packagedSchema.ts"),
        "utf8",
      ),
      fs.readFile(
        path.join(root, "src", "main", "database", "cachePackagedSchema.ts"),
        "utf8",
      ),
    ]);

    expect(packagedSchema).not.toContain('"CharacterAppearance"');
    expect(packagedSchema).not.toContain('"TermAppearance"');
    expect(cachePackagedSchema).toContain('CREATE VIRTUAL TABLE IF NOT EXISTS "ChapterSearchDocumentFts"');
  });
});
