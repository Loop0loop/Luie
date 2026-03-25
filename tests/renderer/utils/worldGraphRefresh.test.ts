// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockedWorldStore = vi.hoisted(() => ({
  loadGraph: vi.fn(),
}));

vi.mock(
  "../../../src/renderer/src/features/research/stores/worldBuildingStore.js",
  () => ({
    useWorldBuildingStore: {
      getState: () => ({
        loadGraph: mockedWorldStore.loadGraph,
      }),
    },
  }),
);

vi.mock("@shared/api", () => ({
  api: {
    logger: {
      warn: vi.fn(),
    },
  },
}));

import { refreshWorldGraph } from "../../../src/renderer/src/features/research/utils/worldGraphRefresh.js";

describe("worldGraphRefresh", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockedWorldStore.loadGraph.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("coalesces rapid refresh requests into one loadGraph call", async () => {
    const first = refreshWorldGraph("project-1");
    const second = refreshWorldGraph("project-1");

    await vi.advanceTimersByTimeAsync(80);
    await Promise.all([first, second]);

    expect(mockedWorldStore.loadGraph).toHaveBeenCalledTimes(1);
    expect(mockedWorldStore.loadGraph).toHaveBeenCalledWith("project-1");
  });
});
