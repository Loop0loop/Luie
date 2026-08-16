import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("app ready deferred worker startup", () => {
  it("starts the derived worker after the main window is shown", () => {
    const source = readFileSync(
      "src/main/lifecycle/app-ready/appReady.ts",
      "utf8",
    );
    const mainWindowShown = source.indexOf(
      'logger.info("Startup checkpoint: main window shown"',
    );
    const workerStart = source.indexOf(
      "void loadDerivedJobWorker()",
      mainWindowShown,
    );

    expect(mainWindowShown).toBeGreaterThan(-1);
    expect(workerStart).toBeGreaterThan(mainWindowShown);
  });
});
