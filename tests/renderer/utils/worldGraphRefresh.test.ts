// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";

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
    vi.clearAllMocks();
    mockedWorldStore.loadGraph.mockResolvedValue(undefined);
  });

  it("refreshes the graph immediately for each request", async () => {
    const first = refreshWorldGraph("project-1");
    const second = refreshWorldGraph("project-1");

    await Promise.all([first, second]);

    expect(mockedWorldStore.loadGraph).toHaveBeenCalledTimes(2);
    expect(mockedWorldStore.loadGraph).toHaveBeenCalledWith("project-1");
  });
});
