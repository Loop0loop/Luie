import { describe, expect, it } from "vitest";
import {
  buildWarningKey,
  extractWarningObjects,
  normalizeWarningPath,
  parseWarningLine,
} from "../../scripts/check-build-warning-regression.mjs";

describe("build warning normalization", () => {
  it("normalizes POSIX absolute paths to repository-relative paths", () => {
    const normalized = normalizeWarningPath(
      "/Users/user/Luie/src/main/database/index.ts",
      "/Users/user/Luie",
    );
    expect(normalized).toBe("src/main/database/index.ts");
  });

  it("normalizes Windows absolute paths to repository-relative paths", () => {
    const normalized = normalizeWarningPath(
      "C:\\work\\Luie\\src\\main\\database\\index.ts",
      "C:\\work\\Luie",
    );
    expect(normalized).toBe("src/main/database/index.ts");
  });

  it("parses and sorts importer lists for dynamic/static mix warning", () => {
    const line =
      "(!) /Users/user/Luie/src/main/database/index.ts is dynamically imported by /Users/user/Luie/src/main/lifecycle/shutdown.ts, /Users/user/Luie/src/main/lifecycle/shutdown.ts but also statically imported by /Users/user/Luie/src/main/services/core/projectService.ts, /Users/user/Luie/src/main/lifecycle/bootstrap.ts, dynamic import will not move module into another chunk.";

    const parsed = parseWarningLine(line, "/Users/user/Luie");
    expect(parsed).toEqual({
      kind: "dynamic-static-mix",
      module: "src/main/database/index.ts",
      dynamicImporters: ["src/main/lifecycle/shutdown.ts"],
      staticImporters: [
        "src/main/lifecycle/bootstrap.ts",
        "src/main/services/core/projectService.ts",
      ],
    });
  });

  it("deduplicates warnings regardless of importer order", () => {
    const output = [
      "(!) /Users/user/Luie/src/main/database/index.ts is dynamically imported by /Users/user/Luie/src/main/lifecycle/shutdown.ts but also statically imported by /Users/user/Luie/src/main/lifecycle/bootstrap.ts, /Users/user/Luie/src/main/services/core/projectService.ts, dynamic import will not move module into another chunk.",
      "(!) /Users/user/Luie/src/main/database/index.ts is dynamically imported by /Users/user/Luie/src/main/lifecycle/shutdown.ts but also statically imported by /Users/user/Luie/src/main/services/core/projectService.ts, /Users/user/Luie/src/main/lifecycle/bootstrap.ts, dynamic import will not move module into another chunk.",
    ].join("\n");

    const warnings = extractWarningObjects(output, "/Users/user/Luie");
    expect(warnings).toHaveLength(1);
    expect(buildWarningKey(warnings[0])).toContain(
      "src/main/database/index.ts",
    );
  });
});
