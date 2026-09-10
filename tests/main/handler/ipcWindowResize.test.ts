import { beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorCode } from "../../../src/shared/constants/errors/index.js";
import { IPC_CHANNELS } from "../../../src/shared/ipc/channels.js";

const mocked = await vi.hoisted(async () => {
  const { EventEmitter } = await import("node:events");
  const handlerMap = new Map<
    string,
    (event: unknown, ...args: unknown[]) => Promise<unknown>
  >();
  const createExportWindow = vi.fn();
  const wizard = Object.assign(new EventEmitter(), {
    isDestroyed: vi.fn(() => false),
    getBounds: vi.fn(() => ({ x: 100, y: 100, width: 500, height: 600 })),
    setBounds:
      vi.fn<
        (
          bounds: { x: number; y: number; width: number; height: number },
          animate?: boolean,
        ) => void
      >(),
  });
  const getStartupWizardWindow = vi.fn<() => typeof wizard | null>(
    () => wizard,
  );
  const getDisplayMatching = vi.fn(() => ({
    workArea: { x: -1920, y: 30, width: 1920, height: 1080 },
  }));
  const appQuit = vi.fn();
  const getAnimationSettings = vi.fn(() => ({
    prefersReducedMotion: false,
    shouldRenderRichAnimation: true,
  }));
  const appGetVersion = vi.fn(() => "1.2.3-test");
  const appGetPath = vi.fn(() => `/tmp/luie-vitest-${process.pid}`);
  let appIsPackaged = false;
  const logger = {
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  };

  return {
    handlerMap,
    createExportWindow,
    wizard,
    getStartupWizardWindow,
    getDisplayMatching,
    appQuit,
    getAnimationSettings,
    appGetVersion,
    appGetPath,
    get appIsPackaged() {
      return appIsPackaged;
    },
    set appIsPackaged(next: boolean) {
      appIsPackaged = next;
    },
    logger,
  };
});

vi.mock("electron", () => ({
  app: {
    quit: (...args: unknown[]) => mocked.appQuit(...args),
    getVersion: (...args: unknown[]) => mocked.appGetVersion(...args),
    getPath: (...args: unknown[]) => mocked.appGetPath(...args),
    get isPackaged() {
      return mocked.appIsPackaged;
    },
  },
  BrowserWindow: {
    getAllWindows: () => [],
  },
  screen: { getDisplayMatching: mocked.getDisplayMatching },
  systemPreferences: { getAnimationSettings: mocked.getAnimationSettings },
  ipcMain: {
    handle: vi.fn(
      (
        channel: string,
        handler: (event: unknown, ...args: unknown[]) => Promise<unknown>,
      ) => {
        mocked.handlerMap.set(channel, handler);
      },
    ),
  },
}));

vi.mock("../../../src/main/app/windows/index.js", () => ({
  windowManager: {
    getMainWindow: () => null,
    getStartupWizardWindow: mocked.getStartupWizardWindow,
    createExportWindow: (...args: unknown[]) =>
      mocked.createExportWindow(...args),
  },
}));

describe("ipcWindowResize", () => {
  beforeEach(() => {
    mocked.handlerMap.clear();
    mocked.createExportWindow.mockReset();
    mocked.wizard.isDestroyed.mockReset().mockReturnValue(false);
    mocked.wizard.getBounds
      .mockReset()
      .mockReturnValue({ x: 100, y: 100, width: 500, height: 600 });
    mocked.wizard.removeAllListeners();
    mocked.wizard.setBounds
      .mockReset()
      .mockImplementation((bounds, animate) => {
        mocked.wizard.getBounds.mockReturnValue({ ...bounds });
        if (animate) mocked.wizard.emit("resized");
      });
    mocked.getStartupWizardWindow.mockReset().mockReturnValue(mocked.wizard);
    mocked.getDisplayMatching.mockClear();
    mocked.appQuit.mockReset();
    mocked.getAnimationSettings.mockReset().mockReturnValue({
      prefersReducedMotion: false,
      shouldRenderRichAnimation: true,
    });
    mocked.appGetVersion.mockReset();
    mocked.appGetVersion.mockReturnValue("1.2.3-test");
    mocked.appGetPath.mockReset();
    mocked.appGetPath.mockReturnValue(`/tmp/luie-vitest-${process.pid}`);
    mocked.appIsPackaged = false;
    delete process.env.LUIE_UPDATE_FEED_URL;
    vi.unstubAllGlobals();
    mocked.logger.info.mockReset();
    mocked.logger.debug.mockReset();
    mocked.logger.error.mockReset();
  });

  describe("wizard resize work budget", () => {
    const registerResize = async () => {
      const { registerWindowIPCHandlers } =
        await import("../../../src/main/handler/system/window/index.js");
      registerWindowIPCHandlers(mocked.logger);
      const handler = mocked.handlerMap.get(
        IPC_CHANNELS.WINDOW_SET_STARTUP_WIZARD_SIZE,
      );
      if (!handler) throw new Error("resize handler missing");
      return handler;
    };

    it.each([
      ["darwin", true, false, true, "native"],
      ["darwin", false, false, true, "instant"],
      ["darwin", true, true, true, "instant"],
      ["darwin", true, false, false, "instant"],
      ["win32", true, false, true, "stepped"],
      ["win32", false, false, true, "instant"],
      ["win32", true, true, true, "instant"],
      ["win32", true, false, false, "instant"],
      ["linux", true, false, true, "instant"],
    ] as const)(
      "respects motion policy: OS=%s animate=%s reduced=%s rich=%s mode=%s",
      async (platform, animate, reduced, rich, mode) => {
        const handler = await registerResize();
        const platformDescriptor = Object.getOwnPropertyDescriptor(
          process,
          "platform",
        )!;
        Object.defineProperty(process, "platform", { value: platform });
        mocked.getAnimationSettings.mockReturnValue({
          prefersReducedMotion: reduced,
          shouldRenderRichAnimation: rich,
        });
        vi.useFakeTimers({
          toFake: ["setTimeout", "clearTimeout", "performance"],
        });
        try {
          const response = handler({}, 800, 600, animate);
          if (mode === "stepped") {
            expect(mocked.wizard.setBounds).not.toHaveBeenCalled();
            await vi.advanceTimersByTimeAsync(200);
            expect(mocked.wizard.setBounds.mock.calls.length).toBeGreaterThan(
              1,
            );
            expect(
              mocked.wizard.setBounds.mock.calls.length,
            ).toBeLessThanOrEqual(13);
          } else {
            expect(mocked.wizard.setBounds).toHaveBeenCalledTimes(1);
          }
          expect(await response).toMatchObject({
            success: true,
            data: true,
          });
          expect(mocked.wizard.setBounds).toHaveBeenLastCalledWith(
            { x: -1360, y: 270, width: 800, height: 600 },
            mode === "native",
          );
          expect(vi.getTimerCount()).toBe(0);
          const calls = mocked.wizard.setBounds.mock.calls.length;
          await handler({}, 800, 600, animate);
          expect(mocked.wizard.setBounds).toHaveBeenCalledTimes(calls);
          expect(mocked.getAnimationSettings).toHaveBeenCalledTimes(
            platform !== "linux" && animate ? 1 : 0,
          );
        } finally {
          vi.useRealTimers();
          Object.defineProperty(process, "platform", platformDescriptor);
        }
      },
    );

    it.each([
      "complete",
      "closed",
      "destroyed",
      "superseded",
      "error",
      "closed-in-setBounds",
      "late",
      "rounding",
    ])("bounds Windows work and clears lifecycle on %s", async (outcome) => {
      const handler = await registerResize();
      const descriptor = Object.getOwnPropertyDescriptor(process, "platform")!;
      Object.defineProperty(process, "platform", { value: "win32" });
      vi.useFakeTimers({
        toFake: ["setTimeout", "clearTimeout", "performance"],
      });
      const now = vi.spyOn(performance, "now");
      try {
        if (outcome === "rounding") {
          mocked.wizard.getBounds.mockReturnValue({
            x: -1361,
            y: 270,
            width: 800,
            height: 600,
          });
        }
        if (outcome === "closed-in-setBounds") {
          mocked.wizard.setBounds.mockImplementation(() => {
            mocked.wizard.isDestroyed.mockReturnValue(true);
            mocked.wizard.emit("closed");
          });
        }
        const settled = vi.fn();
        const response = handler({}, 800, 600, true).then((result) => {
          settled();
          return result;
        });
        expect(mocked.wizard.setBounds).not.toHaveBeenCalled();
        expect(vi.getTimerCount()).toBe(1);
        expect(mocked.wizard.listenerCount("resized")).toBe(0);
        if (outcome === "late") now.mockReturnValue(600);
        await vi.advanceTimersByTimeAsync(16);
        if (outcome === "complete" || outcome === "rounding") {
          if (outcome === "rounding")
            expect(mocked.wizard.setBounds).not.toHaveBeenCalled();
          await vi.advanceTimersByTimeAsync(183);
          expect(settled).not.toHaveBeenCalled();
          await vi.advanceTimersByTimeAsync(1);
        } else if (outcome === "closed") {
          mocked.wizard.emit("closed");
        } else if (outcome === "destroyed") {
          mocked.wizard.isDestroyed.mockReturnValue(true);
          await vi.advanceTimersByTimeAsync(16);
        } else if (outcome === "superseded") {
          const replacement = handler({}, 900, 700, true);
          await vi.advanceTimersByTimeAsync(200);
          expect(await replacement).toMatchObject({
            success: true,
            data: true,
          });
          expect(mocked.wizard.getBounds()).toEqual({
            x: -1410,
            y: 220,
            width: 900,
            height: 700,
          });
        } else if (outcome === "error") {
          mocked.wizard.setBounds.mockImplementation(() => {
            throw new Error("native frame failed");
          });
          await vi.advanceTimersByTimeAsync(16);
        }
        const completed = ["complete", "late", "rounding"].includes(outcome);
        expect(await response).toMatchObject(
          outcome === "error"
            ? { success: false }
            : { success: true, data: completed },
        );
        expect(mocked.wizard.listenerCount("closed")).toBe(0);
        expect(mocked.wizard.listenerCount("resized")).toBe(0);
        expect(vi.getTimerCount()).toBe(0);
        if (completed) {
          expect(mocked.wizard.setBounds).toHaveBeenLastCalledWith(
            { x: -1360, y: 270, width: 800, height: 600 },
            false,
          );
          expect(mocked.wizard.setBounds.mock.calls.length).toBeLessThanOrEqual(
            13,
          );
          if (outcome !== "complete")
            expect(mocked.wizard.setBounds).toHaveBeenCalledTimes(1);
        }
        const calls = mocked.wizard.setBounds.mock.calls.length;
        await vi.advanceTimersByTimeAsync(3000);
        expect(mocked.wizard.setBounds).toHaveBeenCalledTimes(calls);
      } finally {
        now.mockRestore();
        vi.useRealTimers();
        Object.defineProperty(process, "platform", descriptor);
      }
    });

    it.each(["resized", "closed", "timeout", "superseded", "timeout-error"])(
      "cleans up native resize waiting on %s",
      async (outcome) => {
        const handler = await registerResize();
        const descriptor = Object.getOwnPropertyDescriptor(
          process,
          "platform",
        )!;
        Object.defineProperty(process, "platform", { value: "darwin" });
        vi.useFakeTimers();
        try {
          mocked.wizard.setBounds.mockImplementation((bounds) => {
            mocked.wizard.getBounds.mockReturnValue({ ...bounds });
          });
          const settled = vi.fn();
          const response = handler({}, 800, 600, true).then((result) => {
            settled();
            return result;
          });
          await Promise.resolve();
          expect(settled).not.toHaveBeenCalled();
          expect(mocked.wizard.listenerCount("resized")).toBe(1);
          expect(mocked.wizard.listenerCount("closed")).toBe(1);
          expect(vi.getTimerCount()).toBe(1);
          if (outcome === "resized") mocked.wizard.emit("resized");
          else if (outcome === "closed") {
            mocked.wizard.isDestroyed.mockReturnValue(true);
            mocked.wizard.emit("closed");
          } else if (outcome === "superseded") {
            expect(await handler({}, 900, 700, false)).toMatchObject({
              success: true,
              data: true,
            });
          } else {
            await vi.advanceTimersByTimeAsync(1999);
            expect(settled).not.toHaveBeenCalled();
            if (outcome === "timeout-error") {
              mocked.wizard.setBounds.mockImplementation(() => {
                throw new Error("fallback failed");
              });
            }
            await vi.advanceTimersByTimeAsync(1);
          }
          expect(await response).toMatchObject(
            outcome === "timeout-error"
              ? { success: false }
              : {
                  success: true,
                  data: outcome === "resized" || outcome === "timeout",
                },
          );
          expect(mocked.wizard.listenerCount("resized")).toBe(0);
          expect(mocked.wizard.listenerCount("closed")).toBe(0);
          expect(vi.getTimerCount()).toBe(0);
          if (outcome === "timeout") {
            expect(mocked.wizard.setBounds).toHaveBeenLastCalledWith(
              { x: -1360, y: 270, width: 800, height: 600 },
              false,
            );
          }
          const calls = mocked.wizard.setBounds.mock.calls.length;
          await vi.advanceTimersByTimeAsync(3000);
          expect(mocked.wizard.setBounds).toHaveBeenCalledTimes(calls);
        } finally {
          vi.useRealTimers();
          Object.defineProperty(process, "platform", descriptor);
        }
      },
    );

    it("settles rapid requests with the last bounds and no delayed overwrite", async () => {
      const handler = await registerResize();
      vi.useFakeTimers();
      try {
        const results = await Promise.all([
          handler({}, 800, 600, true),
          handler({}, 900, 700, false),
        ]);
        expect(results).toMatchObject([
          { success: true, data: process.platform !== "win32" },
          { success: true, data: true },
        ]);
        expect(mocked.wizard.getBounds()).toEqual({
          x: -1410,
          y: 220,
          width: 900,
          height: 700,
        });
        expect(mocked.wizard.setBounds).toHaveBeenCalledTimes(
          process.platform === "win32" ? 1 : 2,
        );
        expect(vi.getTimerCount()).toBe(0);
      } finally {
        vi.useRealTimers();
      }
    });

    it.each(["missing", "destroyed"])(
      "does not resize a %s window",
      async (state) => {
        const handler = await registerResize();
        if (state === "missing")
          mocked.getStartupWizardWindow.mockReturnValue(null);
        else mocked.wizard.isDestroyed.mockReturnValue(true);
        expect(await handler({}, 800, 600, true)).toMatchObject({
          success: true,
          data: false,
        });
        expect(mocked.wizard.setBounds).not.toHaveBeenCalled();
      },
    );

    it.each([
      [-1, -1, { x: -1229, y: 219, width: 538, height: 702 }],
      [1300, 800, { x: -1747, y: 127, width: 1574, height: 886 }],
      [4096, 4096, { x: -1920, y: 30, width: 1920, height: 1080 }],
    ])(
      "preserves compact/preview/work-area sizing for %s×%s",
      async (width, height, expected) => {
        const handler = await registerResize();
        expect(await handler({}, width, height, true)).toMatchObject({
          success: true,
          data: true,
        });
        expect(mocked.wizard.setBounds).toHaveBeenLastCalledWith(
          expected,
          process.platform === "darwin",
        );
      },
    );

    it.each([
      [NaN, 600, true],
      [800, Infinity, true],
      [800, 600, "true"],
    ])("rejects invalid resize arguments %s/%s/%s", async (...args) => {
      const handler = await registerResize();
      expect(await handler({}, ...args)).toMatchObject({
        success: false,
        error: { code: ErrorCode.INVALID_INPUT },
      });
      expect(mocked.wizard.setBounds).not.toHaveBeenCalled();
    });

    it("returns an IPC error if native bounds application throws", async () => {
      const handler = await registerResize();
      mocked.wizard.setBounds.mockImplementation(() => {
        throw new Error("window closed during resize");
      });
      expect(await handler({}, 800, 600, true)).toMatchObject({
        success: false,
      });
    });
  });
});
