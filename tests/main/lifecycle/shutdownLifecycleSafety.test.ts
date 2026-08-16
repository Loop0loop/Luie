import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  pauseSync: vi.fn(async () => undefined),
  resumeSync: vi.fn(),
  pauseMaintenance: vi.fn(async () => undefined),
  resumeMaintenance: vi.fn(),
  stopUtility: vi.fn(async () => undefined),
}));

vi.mock("../../../src/main/domains/sync/index.js", () => ({
  syncService: {
    pauseForShutdown: mocked.pauseSync,
    resumeAfterShutdownCancel: mocked.resumeSync,
  },
}));

vi.mock("../../../src/main/lifecycle/app-ready/index.js", () => ({
  pauseDeferredStartupMaintenance: mocked.pauseMaintenance,
  resumeDeferredStartupMaintenance: mocked.resumeMaintenance,
}));

vi.mock("../../../src/main/infra/utility-process/index.js", () => ({
  utilityProcessBridge: { stop: mocked.stopUtility },
}));

import {
  pauseShutdownBackgroundWork,
  resumeShutdownBackgroundWork,
  stopUtilityProcess,
} from "../../../src/main/lifecycle/shutdown/runtimeLifecycle.js";

describe("shutdown lifecycle safety", () => {
  it("keeps lifecycle ordering and ownership explicit", () => {
    const main = readFileSync("src/main/index.ts", "utf8");
    const shutdown = readFileSync(
      "src/main/lifecycle/shutdown/shutdown.ts",
      "utf8",
    );

    expect(main).not.toContain("utilityProcessBridge.stop()");
    expect(shutdown.indexOf("event.preventDefault()")).toBeLessThan(
      shutdown.indexOf("if (isQuitting) return"),
    );
    const pauseIndex = shutdown.indexOf("await pauseShutdownBackgroundWork()");
    expect(pauseIndex).toBeLessThan(
      shutdown.indexOf("await requestRendererFlush(mainWindow)", pauseIndex),
    );
    expect(
      shutdown.indexOf("await stopShutdownRuntimeServices(logger)"),
    ).toBeLessThan(shutdown.indexOf("app.exit(0)"));
  });

  it("pauses, resumes, and stops the owned runtime services", async () => {
    await pauseShutdownBackgroundWork();
    resumeShutdownBackgroundWork();
    await stopUtilityProcess();

    expect(mocked.pauseSync).toHaveBeenCalledOnce();
    expect(mocked.pauseMaintenance).toHaveBeenCalledOnce();
    expect(mocked.resumeSync).toHaveBeenCalledOnce();
    expect(mocked.resumeMaintenance).toHaveBeenCalledOnce();
    expect(mocked.stopUtility).toHaveBeenCalledOnce();
  });
});
