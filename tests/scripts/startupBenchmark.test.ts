import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { parseOptions, summarize } from "../../scripts/benchmark-startup.mjs";

const { configureProbe } = createRequire(import.meta.url)(
  "../../scripts/startup-probe.cjs",
);
const directories: string[] = [];
const initialEnv = { ...process.env };
afterEach(() => {
  process.env = { ...initialEnv };
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true });
});

describe("P0 measurement contract", () => {
  it("P0-CLI-01: accepts boundary values and defaults", () => {
    expect(parseOptions([])).toEqual({
      runs: 3,
      profile: "fresh",
      timeoutMs: 30000,
      scenario: "intro",
    });
    expect(
      parseOptions([
        "--runs",
        "1",
        "--profile",
        "repeat",
        "--timeout-ms",
        "1000",
      ]).runs,
    ).toBe(1);
    expect(
      parseOptions(["--runs", "100", "--timeout-ms", "120000"]).timeoutMs,
    ).toBe(120000);
    expect(parseOptions(["--scenario", "resize"]).scenario).toBe("resize");
  });
  it.each([
    ["--runs", "0"],
    ["--runs", "101"],
    ["--runs", "1.5"],
    ["--runs"],
    ["--timeout-ms", "999"],
    ["--timeout-ms", "120001"],
    ["--profile", "cold"],
    ["--scenario", "unknown"],
    ["--user-data", "/real/profile"],
    ["--unknown", "1"],
  ])("P0-CLI-02: rejects invalid options %j", (...args) => {
    expect(() => parseOptions(args)).toThrow("Invalid option");
  });
  it("P0-STAT-01: keeps failed runs and does not publish small-sample p95", () => {
    expect(
      summarize([
        { status: "passed", introObservedMs: 3000 },
        { status: "failed" },
        { status: "passed", introObservedMs: 1000 },
      ]),
    ).toEqual({
      attempted: 3,
      passed: 2,
      failed: 1,
      successfulIntroMedianMs: 2000,
      successfulIntroP95Ms: null,
    });
    expect(
      summarize([{ status: "failed" }]).successfulIntroMedianMs,
    ).toBeNull();
    expect(summarize([]).attempted).toBe(0);
    expect(
      summarize(
        Array.from({ length: 20 }, (_, index) => ({
          status: "passed",
          introObservedMs: index + 1,
        })),
      ).successfulIntroP95Ms,
    ).toBe(19);
    expect(() =>
      summarize([{ status: "passed", introObservedMs: NaN }]),
    ).toThrow("Invalid measurement");
  });
  it("P0-SAFE-01: isolates before app import and never registers the OS protocol", () => {
    const profile = mkdtempSync(path.join(os.tmpdir(), "luie-p0-test-"));
    directories.push(profile);
    writeFileSync(path.join(profile, ".luie-p0-owner"), "owned");
    const registrar = vi.fn();
    const app = {
      isPackaged: false,
      setPath: vi.fn(),
      setAppPath: vi.fn(),
      setAsDefaultProtocolClient: registrar,
    };
    configureProbe(app, { profile, token: "owned", repo: "/repo" });
    expect(app.setPath.mock.calls).toEqual([
      ["userData", profile],
      ["sessionData", profile],
    ]);
    expect(process.env.LUIE_RUNTIME_DATABASE_URL).toBe(
      `file:${path.join(profile, "main.db")}`,
    );
    expect(process.env.LUIE_RUNTIME_CACHE_DATABASE_URL).toBe(
      `file:${path.join(profile, "cache.db")}`,
    );
    expect(process.env.LUIE_USER_DATA_PATH).toBe(profile);
    expect(process.env.LUIE_DISABLE_SYNC).toBe("1");
    expect(app.setAsDefaultProtocolClient()).toBe(false);
    expect(registrar).not.toHaveBeenCalled();
  });
  it("P0-SAFE-02: rejects unowned, relative and packaged profiles before mutation", () => {
    const profile = mkdtempSync(path.join(os.tmpdir(), "luie-p0-test-"));
    directories.push(profile);
    writeFileSync(path.join(profile, ".luie-p0-owner"), "someone-else");
    const app = { isPackaged: false, setPath: vi.fn() };
    expect(() => configureProbe(app, { profile, token: "owned" })).toThrow(
      "ownership mismatch",
    );
    expect(() => configureProbe(app, { profile: "relative" })).toThrow(
      "absolute owned profile",
    );
    expect(() =>
      configureProbe({ ...app, isPackaged: true }, { profile }),
    ).toThrow("unpackaged");
    expect(app.setPath).not.toHaveBeenCalled();
  });
});
