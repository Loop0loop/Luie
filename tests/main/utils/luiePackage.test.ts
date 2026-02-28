import os from "node:os";
import path from "node:path";
import { promises as fs } from "node:fs";
import { describe, expect, it } from "vitest";
import { readLuieEntry } from "../../../src/main/utils/luiePackage.js";

const createTempDir = async (name: string): Promise<string> =>
  await fs.mkdtemp(path.join(os.tmpdir(), `${name}-`));

describe("luiePackage readLuieEntry", () => {
  it("reads an entry from directory package", async () => {
    const root = await createTempDir("luie-read");
    const packageDir = path.join(root, "project.luie");
    const entryPath = path.join(packageDir, "manuscript", "chapter-1.md");
    await fs.mkdir(path.dirname(entryPath), { recursive: true });
    await fs.writeFile(entryPath, "# chapter", "utf-8");

    try {
      const content = await readLuieEntry(packageDir, "manuscript/chapter-1.md");
      expect(content).toBe("# chapter");
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("rejects symlink entries escaping package root", async () => {
    const root = await createTempDir("luie-symlink");
    const packageDir = path.join(root, "project.luie");
    const outsideFile = path.join(root, "secret.txt");
    const linkPath = path.join(packageDir, "manuscript", "link.md");

    await fs.mkdir(path.dirname(linkPath), { recursive: true });
    await fs.writeFile(outsideFile, "secret", "utf-8");

    try {
      try {
        await fs.symlink(outsideFile, linkPath);
      } catch (error) {
        const err = error as NodeJS.ErrnoException;
        if (err?.code === "EPERM") return;
        throw error;
      }

      await expect(readLuieEntry(packageDir, "manuscript/link.md")).rejects.toThrow(
        "INVALID_RELATIVE_PATH",
      );
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });
});
