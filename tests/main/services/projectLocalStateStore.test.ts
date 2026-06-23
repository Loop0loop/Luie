import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  deleteMany: vi.fn(async () => ({ count: 0 })),
  disconnect: vi.fn(async () => undefined),
  initialize: vi.fn(async () => undefined),
  projectLocalStateFindMany: vi.fn(),
  projectLocalStateFindUnique: vi.fn(),
  projectLocalStateUpsert: vi.fn(),
}));

vi.mock("../../../src/main/database/index.js", () => ({
  db: {
    disconnect: mocked.disconnect,
    getClient: () => ({
      projectLocalState: {
        deleteMany: mocked.deleteMany,
        findMany: mocked.projectLocalStateFindMany,
        findUnique: mocked.projectLocalStateFindUnique,
        upsert: mocked.projectLocalStateUpsert,
      },
    }),
    initialize: mocked.initialize,
  },
}));

import {
  getProjectLastOpenedAt,
  hydrateProjectsWithLocalState,
  markProjectOpened,
  sortProjectsByRecentLocalState,
} from "../../../src/main/services/core/project/projectLocalStateStore.js";

describe("projectLocalStateStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("hydrates projects with app-local lastOpenedAt metadata", async () => {
    mocked.projectLocalStateFindMany.mockResolvedValue([
      {
        projectId: "project-2",
        lastOpenedAt: new Date("2026-03-12T00:00:00.000Z"),
      },
    ]);

    await expect(
      hydrateProjectsWithLocalState([
        {
          id: "project-1",
          title: "One",
          updatedAt: new Date("2026-03-10T00:00:00.000Z"),
        },
        {
          id: "project-2",
          title: "Two",
          updatedAt: new Date("2026-03-09T00:00:00.000Z"),
        },
      ]),
    ).resolves.toEqual([
      {
        id: "project-1",
        title: "One",
        updatedAt: new Date("2026-03-10T00:00:00.000Z"),
        lastOpenedAt: null,
      },
      {
        id: "project-2",
        title: "Two",
        updatedAt: new Date("2026-03-09T00:00:00.000Z"),
        lastOpenedAt: new Date("2026-03-12T00:00:00.000Z"),
      },
    ]);
  });

  it("marks a project as opened", async () => {
    mocked.projectLocalStateUpsert.mockResolvedValue({
      projectId: "project-1",
      lastOpenedAt: new Date("2026-03-12T01:00:00.000Z"),
    });
    const openedAt = new Date("2026-03-12T01:00:00.000Z");

    await expect(markProjectOpened("project-1", openedAt)).resolves.toEqual(
      openedAt,
    );

    expect(mocked.projectLocalStateUpsert).toHaveBeenCalledWith({
      where: { projectId: "project-1" },
      create: {
        projectId: "project-1",
        lastOpenedAt: openedAt,
      },
      update: {
        lastOpenedAt: openedAt,
      },
    });
  });

  it("reads a single project's lastOpenedAt", async () => {
    mocked.projectLocalStateFindUnique.mockResolvedValue({
      lastOpenedAt: new Date("2026-03-12T02:00:00.000Z"),
    });

    await expect(getProjectLastOpenedAt("project-1")).resolves.toEqual(
      new Date("2026-03-12T02:00:00.000Z"),
    );
  });

  it("sorts projects by lastOpenedAt before updatedAt", () => {
    const sorted = sortProjectsByRecentLocalState([
      {
        id: "project-1",
        updatedAt: "2026-03-10T00:00:00.000Z",
        lastOpenedAt: "2026-03-11T00:00:00.000Z",
      },
      {
        id: "project-2",
        updatedAt: "2026-03-12T00:00:00.000Z",
        lastOpenedAt: null,
      },
      {
        id: "project-3",
        updatedAt: "2026-03-09T00:00:00.000Z",
        lastOpenedAt: "2026-03-13T00:00:00.000Z",
      },
    ]);

    expect(sorted.map((project) => project.id)).toEqual([
      "project-3",
      "project-1",
      "project-2",
    ]);
  });
});
