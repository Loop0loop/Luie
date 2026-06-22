import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => {
  const worldEntityCreate = vi.fn();
  const worldEntityFindUnique = vi.fn();
  const worldEntityUpdate = vi.fn();
  const worldEntityDeleteMany = vi.fn();
  const entityRelationDeleteMany = vi.fn();
  const projectTouch = vi.fn(async () => undefined);
  const projectPersist = vi.fn(async () => undefined);
  const transaction = vi.fn(async (callback: (client: unknown) => unknown) => {
    return await callback({
      entityRelation: {
        deleteMany: entityRelationDeleteMany,
      },
      worldEntity: {
        deleteMany: worldEntityDeleteMany,
      },
    });
  });

  return {
    worldEntityCreate,
    worldEntityFindUnique,
    worldEntityUpdate,
    worldEntityDeleteMany,
    entityRelationDeleteMany,
    projectTouch,
    projectPersist,
    transaction,
  };
});

vi.mock("../../../src/main/services/world/characterService.js", () => ({
  getWorldDbClient: () => ({
    worldEntity: {
      create: mocked.worldEntityCreate,
      findUnique: mocked.worldEntityFindUnique,
      update: mocked.worldEntityUpdate,
      deleteMany: mocked.worldEntityDeleteMany,
    },
    $transaction: mocked.transaction,
  }),
}));

vi.mock("../../../src/main/services/core/projectService.js", () => ({
  projectService: {
    touchProject: (projectId: string) => mocked.projectTouch(projectId),
    persistPackageAfterMutation: (projectId: string, reason: string) =>
      mocked.projectPersist(projectId, reason),
  },
}));

vi.mock("../../../src/main/services/core/chapterKeywords.js", () => ({
  rebuildProjectKeywordAppearances: vi.fn(async () => undefined),
}));

import { WorldEntityService } from "../../../src/main/services/world/worldEntityService.js";

describe("WorldEntityService freshness", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.worldEntityCreate.mockResolvedValue({
      id: "world-entity-1",
      projectId: "project-1",
    });
    mocked.worldEntityFindUnique.mockResolvedValue({
      id: "world-entity-1",
      projectId: "project-1",
    });
    mocked.worldEntityUpdate.mockResolvedValue({
      id: "world-entity-1",
      projectId: "project-1",
    });
  });

  it("touches project freshness after create and delete", async () => {
    const service = new WorldEntityService();

    await service.createWorldEntity({
      projectId: "project-1",
      type: "Place",
      name: "Town",
    });

    await service.deleteWorldEntity("world-entity-1");

    expect(mocked.projectTouch).toHaveBeenCalledWith("project-1");
    expect(mocked.projectPersist).toHaveBeenCalledWith(
      "project-1",
      "world-entity:create",
    );
    expect(mocked.projectPersist).toHaveBeenCalledWith(
      "project-1",
      "world-entity:delete",
    );
  });
});
