// TEST_LEVEL: SCRIPT_INTEGRATION
// PROVES: 실제 실행 함수의 timeout/실패 판정, JSON 집계, 종료 코드 설정.
// DOES_NOT_PROVE: Electron/OS 종료, 실제 시간 정확도, 렌더링·CPU/GPU 성능.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import path from "node:path";
import { main } from "../../scripts/benchmark-startup.mjs";

const mocked = vi.hoisted(() => ({
  launch: vi.fn(),
  writeFile: vi.fn(),
  screenshot: vi.fn(),
  close: vi.fn(),
  kill: vi.fn(),
}));

vi.mock("@playwright/test", () => ({ _electron: { launch: mocked.launch } }));
vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(async () => "test artifact"),
  mkdtemp: vi.fn(async () => path.resolve("virtual-p0-evidence")),
  mkdir: vi.fn(async () => undefined),
  writeFile: mocked.writeFile,
}));
vi.mock("node:fs", () => ({ writeFileSync: vi.fn() }));
vi.mock("node:child_process", () => ({
  execFileSync: vi.fn((_command, args) =>
    args[0] === "rev-parse" ? "test-commit" : "",
  ),
}));

type Report = {
  runs: Array<{
    status: string;
    phase: string;
    error?: string;
    cleanupError?: string;
  }>;
  summary: {
    attempted: number;
    passed: number;
    failed: number;
    successfulIntroMedianMs: number | null;
  };
};

const lastReport = (): Report => {
  const writes = mocked.writeFile.mock.calls.filter(([name]) =>
    name.endsWith("report.json"),
  );
  expect(writes.length).toBeGreaterThanOrEqual(2);
  return JSON.parse(writes.at(-1)![1]);
};

describe("P0 runner outcome integrity", () => {
  const originalArgv = process.argv;
  const originalExitCode = process.exitCode;
  let originalListeners: ReturnType<typeof process.listeners>;
  let screenshot: ReturnType<typeof Promise.withResolvers<void>>;
  let closed: ReturnType<typeof Promise.withResolvers<void>>;

  beforeEach(() => {
    originalListeners = process.listeners("uncaughtExceptionMonitor");
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    process.argv = [
      "node",
      "test-runner",
      "--runs",
      "1",
      "--timeout-ms",
      "1000",
    ];
    process.exitCode = undefined;
    screenshot = Promise.withResolvers<void>();
    closed = Promise.withResolvers<void>();
    mocked.writeFile.mockResolvedValue(undefined);
    mocked.screenshot.mockReset().mockImplementation(() => screenshot.promise);
    mocked.close.mockReset().mockImplementation(() => closed.promise);
    mocked.launch.mockReset().mockImplementation(async ({ env }) => {
      const { profile } = JSON.parse(env.LUIE_P0_CONFIG);
      const heading = {
        waitFor: async () => undefined,
        click: async () => undefined,
        elementHandle: async () => ({ dispose: async () => undefined }),
      };
      return {
        firstWindow: async () => ({
          setDefaultTimeout: () => undefined,
          getByRole: () => heading,
          waitForFunction: async () => undefined,
          evaluate: async () => ({}),
          screenshot: mocked.screenshot,
        }),
        evaluate: async () => ({ userData: profile }),
        waitForEvent: mocked.close,
        process: () => ({ kill: mocked.kill }),
      };
    });
  });

  afterEach(() => {
    process.argv = originalArgv;
    process.exitCode = originalExitCode;
    for (const listener of process.listeners("uncaughtExceptionMonitor")) {
      if (!originalListeners.includes(listener))
        process.removeListener("uncaughtExceptionMonitor", listener);
    }
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const startAtScreenshot = async () => {
    const done = main();
    await vi.advanceTimersByTimeAsync(0);
    expect(mocked.screenshot).toHaveBeenCalledOnce();
    expect(mocked.close).not.toHaveBeenCalled();
    return { done };
  };

  it("P0-OUTCOME-01: 999ms 완료는 종료 확인 후 성공으로 기록한다", async () => {
    const { done } = await startAtScreenshot();
    await vi.advanceTimersByTimeAsync(999);
    screenshot.resolve();
    await vi.advanceTimersByTimeAsync(0);
    expect(mocked.close).toHaveBeenCalledWith("close", { timeout: 10000 });
    closed.resolve();
    await done;
    expect(lastReport().runs[0]).toMatchObject({
      status: "passed",
      phase: "complete",
    });
    expect(lastReport().runs[0].error).toBeUndefined();
    expect(lastReport().summary).toMatchObject({
      attempted: 1,
      passed: 1,
      failed: 0,
    });
    expect(process.exitCode ?? 0).toBe(0);
    expect(mocked.kill).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(["resolve", "reject"])(
    "P0-OUTCOME-02: 1000ms timeout → 1001ms 늦은 %s는 실패를 뒤집지 않는다",
    async (outcome) => {
      const { done } = await startAtScreenshot();
      await vi.advanceTimersByTimeAsync(1000);
      expect(mocked.close).toHaveBeenCalledOnce();
      await vi.advanceTimersByTimeAsync(1);
      if (outcome === "resolve") screenshot.resolve();
      else screenshot.reject(new Error("late screenshot rejection"));
      await vi.advanceTimersByTimeAsync(0);
      closed.resolve();
      await done;
      expect(lastReport().runs[0]).toMatchObject({
        status: "failed",
        phase: "snapshot",
        error: "Error: Timeout after 1000ms",
      });
      expect(lastReport().summary).toEqual({
        attempted: 1,
        passed: 0,
        failed: 1,
        successfulIntroMedianMs: null,
        successfulIntroP95Ms: null,
      });
      expect(process.exitCode).toBe(1);
      expect(mocked.kill).not.toHaveBeenCalled();
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it("P0-OUTCOME-03: timeout 전 screenshot 오류를 보존한다", async () => {
    const { done } = await startAtScreenshot();
    screenshot.reject(new Error("screenshot failed"));
    await vi.advanceTimersByTimeAsync(0);
    closed.resolve();
    await done;
    expect(lastReport().runs[0]).toMatchObject({
      status: "failed",
      error: "Error: screenshot failed",
      phase: "snapshot",
    });
    expect(lastReport().summary).toMatchObject({ passed: 0, failed: 1 });
    expect(process.exitCode).toBe(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("P0-OUTCOME-04: launch 거부도 실패 표본에 남긴다", async () => {
    mocked.launch.mockRejectedValueOnce(new Error("launch failed"));
    await main();
    expect(lastReport().runs[0]).toMatchObject({
      status: "failed",
      phase: "launch",
      error: "Error: launch failed",
    });
    expect(lastReport().summary).toMatchObject({ passed: 0, failed: 1 });
    expect(mocked.close).not.toHaveBeenCalled();
    expect(mocked.kill).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
  });

  it("P0-OUTCOME-05: 관찰 성공 뒤 종료 실패는 실패 처리하고 반복을 중지한다", async () => {
    process.argv[3] = "2";
    const { done } = await startAtScreenshot();
    screenshot.resolve();
    await vi.advanceTimersByTimeAsync(0);
    closed.reject(new Error("close timeout"));
    await done;
    expect(lastReport().runs[0]).toMatchObject({
      status: "failed",
      cleanupError: "Error: close timeout",
    });
    expect(lastReport().summary).toMatchObject({
      attempted: 1,
      passed: 0,
      failed: 1,
    });
    expect(mocked.launch).toHaveBeenCalledOnce();
    expect(mocked.kill).toHaveBeenCalledExactlyOnceWith("SIGKILL");
    expect(process.exitCode).toBe(1);
    expect(vi.getTimerCount()).toBe(0);
  });
});
