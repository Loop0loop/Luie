import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { promises as fs } from "node:fs";
import path from "node:path";

const mocked = vi.hoisted(() => {
  const appHandlers = new Map<string, (...args: unknown[]) => void>();
  const appOn = vi.fn((event: string, handler: (...args: unknown[]) => void) => {
    appHandlers.set(event, handler);
  });
  const userDataPath = `/tmp/luie-crash-report-${process.pid}`;
  return {
    appHandlers,
    appOn,
    userDataPath,
  };
});

vi.mock("electron", () => ({
  app: {
    on: (...args: unknown[]) => mocked.appOn(...args),
    getPath: () => mocked.userDataPath,
    getVersion: () => "1.2.3-test",
    isPackaged: false,
  },
}));

describe("crashReporting", () => {
  beforeEach(async () => {
    vi.resetModules();
    mocked.appHandlers.clear();
    mocked.appOn.mockClear();
    await fs.rm(mocked.userDataPath, { recursive: true, force: true });
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await fs.rm(mocked.userDataPath, { recursive: true, force: true });
  });

  it("registers crash hooks once even when called multiple times", async () => {
    const processHandlers = new Map<string, (...args: unknown[]) => void>();
    const processOnSpy = vi
      .spyOn(process, "on")
      .mockImplementation(
        ((event: string, handler: (...args: unknown[]) => void) => {
          processHandlers.set(event, handler);
          return process;
        }) as typeof process.on,
      );

    const { registerCrashReporting } = await import(
      "../../../src/main/lifecycle/crashReporting.js"
    );
    const logger = {
      warn: vi.fn(),
      info: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };

    registerCrashReporting(logger as never);
    registerCrashReporting(logger as never);

    expect(processOnSpy).toHaveBeenCalledTimes(2);
    expect(processHandlers.has("uncaughtExceptionMonitor")).toBe(true);
    expect(processHandlers.has("unhandledRejection")).toBe(true);
    expect(mocked.appOn).toHaveBeenCalledTimes(2);
    expect(mocked.appHandlers.has("render-process-gone")).toBe(true);
    expect(mocked.appHandlers.has("child-process-gone")).toBe(true);
  });

  it("writes redacted crash report for unhandled rejection", async () => {
    const processHandlers = new Map<string, (...args: unknown[]) => void>();
    vi.spyOn(process, "on").mockImplementation(
      ((event: string, handler: (...args: unknown[]) => void) => {
        processHandlers.set(event, handler);
        return process;
      }) as typeof process.on,
    );

    const { registerCrashReporting } = await import(
      "../../../src/main/lifecycle/crashReporting.js"
    );
    const logger = {
      warn: vi.fn(),
      info: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };

    registerCrashReporting(logger as never);

    const listener = processHandlers.get("unhandledRejection");
    expect(listener).toBeDefined();
    listener?.(new Error("Bearer sk-secret-super-token"));

    const reportDir = path.join(mocked.userDataPath, "crash-reports");
    await vi.waitFor(async () => {
      const files = await fs.readdir(reportDir);
      expect(files.length).toBeGreaterThan(0);
    });

    const files = await fs.readdir(reportDir);
    const latest = files.sort().at(-1);
    expect(latest).toBeDefined();
    const reportRaw = await fs.readFile(path.join(reportDir, latest ?? ""), "utf-8");

    expect(reportRaw).toContain("unhandled-rejection");
    expect(reportRaw).toContain("[REDACTED_TOKEN]");
    expect(reportRaw).not.toContain("sk-secret-super-token");
  });
});
