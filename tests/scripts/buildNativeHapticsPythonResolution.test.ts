import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { resolvePythonExecutable } from "../../scripts/build-native-haptics.mjs";

describe("build-native-haptics python resolution", () => {
  it("prefers the pyenv-local interpreter from .python-version", () => {
    const tempRoot = mkdtempSync(
      path.join(os.tmpdir(), "luie-build-native-haptics-"),
    );
    const repoRoot = path.join(tempRoot, "repo");
    const pyenvRoot = path.join(tempRoot, "pyenv");
    const pythonPath = path.join(pyenvRoot, "versions", "3.11.9", "bin", "python");

    try {
      mkdirSync(path.dirname(pythonPath), { recursive: true });
      mkdirSync(repoRoot, { recursive: true });
      writeFileSync(path.join(repoRoot, ".python-version"), "3.11.9\n");
      writeFileSync(pythonPath, "");

      expect(
        resolvePythonExecutable({
          repoRootPath: repoRoot,
          env: {
            PYENV_ROOT: pyenvRoot,
          },
        }),
      ).toBe(pythonPath);
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});