import { describe, expect, it } from "vitest";
import {
  extractImports,
  toPackageName,
} from "../../scripts/check-deps.mjs";

describe("check-deps helpers", () => {
  it("extracts import specifiers from static, dynamic and require forms", () => {
    const source = `
      import { a } from "@shared/api";
      import type { X } from "./types.js";
      const p = import("zod");
      const c = require("node:crypto");
    `;
    const imports = extractImports(source);
    expect(imports).toEqual(["@shared/api", "./types.js", "zod", "node:crypto"]);
  });

  it("maps specifier to package root name", () => {
    expect(toPackageName("react")).toBe("react");
    expect(toPackageName("react/jsx-runtime")).toBe("react");
    expect(toPackageName("@scope/pkg/subpath")).toBe("@scope/pkg");
  });
});
