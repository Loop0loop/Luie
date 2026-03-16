import { promises as fs } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("appearance cache isolation boundary", () => {
  it("keeps rebuildable appearance models out of the main runtime schema", async () => {
    const root = process.cwd();
    const [mainSchema, cacheSchema, packagedSchema, cachePackagedSchema, packageJson] = await Promise.all([
      fs.readFile(path.join(root, "prisma", "schema.prisma"), "utf8"),
      fs.readFile(path.join(root, "prisma-cache", "schema.prisma"), "utf8"),
      fs.readFile(
        path.join(root, "src", "main", "database", "packagedSchema.ts"),
        "utf8",
      ),
      fs.readFile(
        path.join(root, "src", "main", "database", "cachePackagedSchema.ts"),
        "utf8",
      ),
      fs.readFile(path.join(root, "package.json"), "utf8"),
    ]);

    expect(mainSchema).not.toMatch(/\bmodel\s+CharacterAppearance\b/);
    expect(mainSchema).not.toMatch(/\bmodel\s+TermAppearance\b/);
    expect(mainSchema).not.toMatch(/\bmodel\s+ChapterSearchDocument\b/);
    expect(cacheSchema).toMatch(/\bmodel\s+CharacterAppearance\b/);
    expect(cacheSchema).toMatch(/\bmodel\s+TermAppearance\b/);
    expect(cacheSchema).toMatch(/\bmodel\s+ChapterSearchDocument\b/);
    expect(packagedSchema).not.toContain('"CharacterAppearance"');
    expect(packagedSchema).not.toContain('"TermAppearance"');
    expect(cachePackagedSchema).toContain('CREATE VIRTUAL TABLE IF NOT EXISTS "ChapterSearchDocumentFts"');
    expect(packageJson).toContain("prisma generate --schema=prisma-cache/schema.prisma");
  });
});
