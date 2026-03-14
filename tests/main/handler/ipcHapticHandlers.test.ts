import { beforeEach, describe, expect, it, vi } from "vitest";
import { IPC_CHANNELS } from "../../../src/shared/ipc/channels.js";

const mocked = vi.hoisted(() => {
  const handlerMap = new Map<
    string,
    (event: unknown, ...args: unknown[]) => Promise<unknown>
  >();

  return {
    handlerMap,
    performAlignmentFeedback: vi.fn(() => true),
    logger: {
      info: vi.fn(),
      debug: vi.fn(),
      error: vi.fn(),
    },
  };
});

vi.mock("electron", () => ({
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

vi.mock("../../../src/main/services/features/macosHapticsService.js", () => ({
  macosHapticsService: {
    performAlignmentFeedback: (...args: unknown[]) =>
      mocked.performAlignmentFeedback(...args),
  },
}));

describe("ipcHapticHandlers", () => {
  beforeEach(() => {
    mocked.handlerMap.clear();
    mocked.performAlignmentFeedback.mockReset();
    mocked.performAlignmentFeedback.mockReturnValue(true);
    mocked.logger.info.mockReset();
    mocked.logger.debug.mockReset();
    mocked.logger.error.mockReset();
  });

  it("registers world graph haptic handler and returns service result", async () => {
    const { registerHapticIPCHandlers } = await import(
      "../../../src/main/handler/system/ipcHapticHandlers.js"
    );

    registerHapticIPCHandlers(mocked.logger);

    const handler = mocked.handlerMap.get(IPC_CHANNELS.WORLD_GRAPH_HAPTIC_FEEDBACK);
    expect(handler).toBeDefined();

    const response = await handler?.({});
    const typed = response as { success: boolean; data?: boolean };

    expect(typed.success).toBe(true);
    expect(typed.data).toBe(true);
    expect(mocked.performAlignmentFeedback).toHaveBeenCalledTimes(1);
  });
});
