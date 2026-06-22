import packageJson from "../../package.json";
import { describe, expect, it } from "vitest";

const PLAYWRIGHT_TEST_CLI = "node node_modules/@playwright/test/cli.js test";

describe("Playwright CLI scripts", () => {
  it("uses the @playwright/test CLI entrypoint for runnable E2E projects", () => {
    expect(packageJson.scripts["test:e2e"]).toContain(PLAYWRIGHT_TEST_CLI);
    expect(packageJson.scripts["test:stress"]).toContain(PLAYWRIGHT_TEST_CLI);
    expect(packageJson.scripts["test:vr"]).toContain(PLAYWRIGHT_TEST_CLI);
    expect(packageJson.scripts["test:smoke"]).toContain(PLAYWRIGHT_TEST_CLI);
    expect(packageJson.scripts["bench:writing-loop:fullprod"]).toContain(
      PLAYWRIGHT_TEST_CLI,
    );
  });
});
