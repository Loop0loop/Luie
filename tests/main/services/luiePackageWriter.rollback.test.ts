// TEST_LEVEL: HYBRID_INTEGRATION
// PROVES: atomic file replacement rollback on real temp files with injected rename failures
// DOES_NOT_PROVE: full unmocked filesystem crash resilience

import os from "node:os";
import path from "node:path";
import * as fsp from "node:fs/promises";
import { afterEach, describe, expect, it, vi } from "vitest";
import { makeMixedNarrativeText } from "../luieFixtures.js";

const actualRename = vi.hoisted(() => ({
  fn: null as null | typeof fsp.rename,
  rename: vi.fn(),
}));

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  actualRename.fn = actual.rename;
  return {
    ...actual,
    rename: (...args: Parameters<typeof actual.rename>) =>
      actualRename.rename(...args),
  };
});

const logger = {
  info: () => undefined,
  debug: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

describe("luiePackageWriter rollback behavior", () => {
  let tempRoot = "";

  afterEach(async () => {
    if (tempRoot) {
      await fsp.rm(tempRoot, { recursive: true, force: true });
      tempRoot = "";
    }
    vi.restoreAllMocks();
  });

  it("restores the original file when atomic replace fails after backup rename", async () => {
    await vi.resetModules();
    const { atomicReplace } = await import(
      "../../../src/main/services/io/luiePackageWriter.js"
    );

    tempRoot = await fsp.mkdtemp(
      path.join(os.tmpdir(), "luie-writer-rollback-"),
    );
    const tempPath = path.join(tempRoot, "next.tmp");
    const targetPath = path.join(tempRoot, "target.luie");
    const originalContent = makeMixedNarrativeText(800, 0);

    await fsp.writeFile(tempPath, "new content", "utf8");
    await fsp.writeFile(targetPath, originalContent, "utf8");

    if (!actualRename.fn) {
      throw new Error("Original fs.rename is unavailable");
    }

    let renameCalls = 0;
    actualRename.rename.mockImplementation(async (from: string, to: string) => {
      renameCalls += 1;
      if (renameCalls === 1) {
        const error = new Error("target exists") as NodeJS.ErrnoException;
        error.code = "EEXIST";
        throw error;
      }
      if (renameCalls === 3) {
        const error = new Error("forced atomic replace failure") as NodeJS.ErrnoException;
        error.code = "EIO";
        throw error;
      }
      return await actualRename.fn!(from, to);
    });

    await expect(
      atomicReplace(tempPath, targetPath, logger),
    ).rejects.toThrow("forced atomic replace failure");

    expect(await fsp.readFile(targetPath, "utf8")).toBe(originalContent);
    const entries = await fsp.readdir(tempRoot);
    expect(entries.some((name) => name.includes(".bak-"))).toBe(false);
  });

  it("removes tmp debris when container writing fails before atomic replace", async () => {
    await vi.resetModules();
    const { writeLuieContainer } = await import(
      "../../../src/main/services/io/luieContainer.js"
    );

    tempRoot = await fsp.mkdtemp(
      path.join(os.tmpdir(), "luie-writer-cleanup-"),
    );
    const packagePath = path.join(tempRoot, "cleanup.luie");

    await expect(
      writeLuieContainer({
        targetPath: packagePath,
        payload: {
          meta: {
            format: "bad-format",
            title: "Cleanup",
          },
          chapters: [],
          characters: [],
          terms: [],
          synopsis: { synopsis: "", status: "draft" },
          plot: { columns: [] },
          drawing: { paths: [] },
          mindmap: { nodes: [], edges: [] },
          memos: { memos: [] },
          graph: { nodes: [], edges: [] },
          snapshots: [],
        },
        logger,
      }),
    ).rejects.toBeTruthy();

    const entries = await fsp.readdir(tempRoot);
    expect(entries.some((name) => name.includes(".tmp-"))).toBe(false);
    expect(entries.some((name) => name.includes(".bak-"))).toBe(false);
  });
});
