import { afterEach, describe, expect, it } from "vitest";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const SCRIPT_PATH = path.resolve("scripts/check-source-loc.mjs");
const DEBT_PATH = path.resolve("scripts/source-loc-debt.json");
const debtBaseline = JSON.parse(readFileSync(DEBT_PATH, "utf8")) as Record<
  string,
  number
>;
const temporaryRoots: string[] = [];

const writeLines = (root: string, relativePath: string, loc: number): void => {
  const filePath = path.join(root, relativePath);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, Array.from({ length: loc }, () => "// line").join("\n"));
};

const createFixture = (
  relativePath: string,
  loc: number,
  omitDebtPath?: string,
): string => {
  const root = mkdtempSync(path.join(tmpdir(), "luie-source-loc-"));
  temporaryRoots.push(root);
  for (const directory of ["src", "tests"]) {
    mkdirSync(path.join(root, directory), { recursive: true });
  }
  for (const [debtPath, debtLoc] of Object.entries(debtBaseline)) {
    if (debtPath !== omitDebtPath) writeLines(root, debtPath, debtLoc);
  }
  writeLines(root, relativePath, loc);
  return root;
};

const runCheck = (cwd: string) =>
  spawnSync(process.execPath, [SCRIPT_PATH], { cwd, encoding: "utf8" });

describe("check-source-loc", () => {
  afterEach(() => {
    for (const root of temporaryRoots.splice(0)) {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it.each(["src/main/newService.ts", "tests/newService.test.ts"])(
    "rejects a new over-limit file: %s",
    (relativePath) => {
      const result = runCheck(createFixture(relativePath, 501));

      expect(result.status).toBe(1);
      expect(result.stderr).toContain("LOC policy violation(s)");
      expect(result.stderr).toContain(`501 ${relativePath}`);
    },
  );

  it("allows existing debt only up to its recorded LOC", () => {
    const relativePath = "src/main/services/features/project/projectService.ts";

    expect(runCheck(createFixture(relativePath, 526)).status).toBe(0);
    const grown = runCheck(createFixture(relativePath, 527));
    expect(grown.status).toBe(1);
    expect(grown.stderr).toContain("grew from 526 to 527 LOC");
  });

  it("rejects a stale debt entry after the file reaches the limit", () => {
    const relativePath = "src/main/services/features/project/projectService.ts";
    const result = runCheck(createFixture(relativePath, 500));

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("remove its stale debt baseline");
  });

  it.each(["src/preload/boundary.ts", "src/types/boundary.ts"])(
    "checks the exact production boundary under %s",
    (relativePath) => {
      expect(runCheck(createFixture(relativePath, 500)).status).toBe(0);
      expect(runCheck(createFixture(relativePath, 501)).status).toBe(1);
    },
  );

  it("rejects a debt baseline whose file is missing", () => {
    const missingPath = "src/main/services/features/project/projectService.ts";
    const result = runCheck(
      createFixture("src/main/placeholder.ts", 1, missingPath),
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(`0 ${missingPath}`);
    expect(result.stderr).toContain("missing debt baseline file");
  });
});
