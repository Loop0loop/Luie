import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  analyzeStartupBundle,
  staticModuleSpecifiers,
} from "../../scripts/check-startup-wizard-bundle.mjs";

describe("P1 wizard static loading boundary", () => {
  it("P1-BUNDLE-01: parses imports/re-exports but not dynamic imports or strings", () => {
    expect(
      staticModuleSpecifiers(
        'import "./a.js"; export { x } from "./b.js"; export * from "./c.js"; import("./lazy.js"); const s = "import fake";',
      ),
    ).toEqual(["./a.js", "./b.js", "./c.js"]);
    expect(() => staticModuleSpecifiers("import {")).toThrow("Invalid JS");
  });
  it("P1-BUNDLE-02: handles shared dependencies/cycles and detects eager preview regression", () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "luie-p1-bundle-"));
    const chunks = path.join(root, "assets/chunks");
    mkdirSync(chunks, { recursive: true });
    const wizard = path.join(chunks, "StartupWizard-test.js");
    try {
      writeFileSync(
        path.join(root, "index.html"),
        '<script type="module" src="./assets/boot.js"></script>',
      );
      writeFileSync(
        path.join(root, "assets/boot.js"),
        'import "./chunks/shared.js";',
      );
      writeFileSync(path.join(chunks, "shared.js"), 'import "../boot.js";');
      writeFileSync(
        path.join(chunks, "vendor-prosemirror-test.js"),
        "export const x = 1;",
      );
      writeFileSync(
        wizard,
        'import "./shared.js"; import("./vendor-prosemirror-test.js");',
      );
      const deferred = analyzeStartupBundle(root);
      expect(deferred.boot.files).toBe(2);
      expect(deferred.eagerEditorChunks).toEqual([]);
      expect(deferred.union.bytes).toBe(
        deferred.boot.bytes + deferred.extra.bytes,
      );
      writeFileSync(wizard, 'export * from "./vendor-prosemirror-test.js";');
      expect(analyzeStartupBundle(root).eagerEditorChunks).toHaveLength(1);
      writeFileSync(wizard, 'import "../../../outside.js";');
      expect(() => analyzeStartupBundle(root)).toThrow("outside renderer");
    } finally {
      rmSync(root, { recursive: true });
    }
  });
});
