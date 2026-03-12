import { promises as fs } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const RENDERER_ROOT = path.join(process.cwd(), "src", "renderer", "src");

const ALLOWED_LOCAL_STORAGE_FILES = new Set([
  "src/renderer/src/app/fontLoader.ts",
  "src/renderer/src/features/research/components/MemoSection.tsx",
  "src/renderer/src/features/research/services/worldPackageStorage.ts",
  "src/renderer/src/features/workspace/stores/projectLayoutStore.ts",
  "src/renderer/src/features/workspace/stores/uiStore.persist.ts",
]);

const LOCAL_STORAGE_PATTERNS = [
  /\blocalStorage\.(getItem|setItem|removeItem)\b/,
  /createJSONStorage\(\(\)\s*=>\s*localStorage\)/,
];

const walkFiles = async (dir: string): Promise<string[]> => {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const nextPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return await walkFiles(nextPath);
      }
      if (!/\.(ts|tsx)$/.test(entry.name)) {
        return [];
      }
      return [nextPath];
    }),
  );
  return files.flat();
};

describe("renderer localStorage boundary", () => {
  it("does not introduce new renderer localStorage durability paths", async () => {
    const files = await walkFiles(RENDERER_ROOT);
    const matchedFiles = (
      await Promise.all(
        files.map(async (filePath) => {
          const source = await fs.readFile(filePath, "utf8");
          if (!LOCAL_STORAGE_PATTERNS.some((pattern) => pattern.test(source))) {
            return null;
          }
          return path.relative(process.cwd(), filePath).replace(/\\/g, "/");
        }),
      )
    ).filter((file): file is string => Boolean(file));

    const unauthorized = matchedFiles.filter(
      (file) => !ALLOWED_LOCAL_STORAGE_FILES.has(file),
    );

    expect(
      unauthorized,
      "New renderer localStorage usage needs an explicit storage-contract decision first.",
    ).toEqual([]);
  });
});
