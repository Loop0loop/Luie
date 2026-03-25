import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => {
  const relationCreate = vi.fn();
  const relationFindUnique = vi.fn();
  const relationUpdate = vi.fn();
  const relationDelete = vi.fn();
  const relationDeleteMany = vi.fn();
  const relationFindMany = vi.fn();
  const projectFindMany = vi.fn();
  const projectTouch = vi.fn(async () => undefined);
  const projectPersist = vi.fn(async () => undefined);
  const transaction = vi.fn(async (callback: (client: unknown) => unknown) => {
    return await callback({
      entityRelation: {
        deleteMany: relationDeleteMany,
      },
    });
  });

  return {
    relationCreate,
    relationFindUnique,
    relationUpdate,
    relationDelete,
    relationDeleteMany,
    relationFindMany,
    projectFindMany,
    projectTouch,
    projectPersist,
    transaction,
  };
});

vi.mock("../../../src/main/database/index.js", () => ({
  db: {
    initialize: vi.fn(async () => undefined),
    getClient: () => ({
      entityRelation: {
        create: mocked.relationCreate,
        findUnique: mocked.relationFindUnique,
        update: mocked.relationUpdate,
        delete: mocked.relationDelete,
        deleteMany: mocked.relationDeleteMany,
        findMany: mocked.relationFindMany,
      },
      project: {
        findMany: mocked.projectFindMany,
      },
      character: {
        findMany: vi.fn(async () => []),
      },
      faction: {
        findMany: vi.fn(async () => []),
      },
      event: {
        findMany: vi.fn(async () => []),
      },
      term: {
        findMany: vi.fn(async () => []),
      },
      worldEntity: {
        findMany: vi.fn(async () => []),
      },
      $transaction: mocked.transaction,
    }),
  },
}));

vi.mock("../../../src/main/services/core/projectService.js", () => ({
  projectService: {
    touchProject: (projectId: string) => mocked.projectTouch(projectId),
    persistPackageAfterMutation: (projectId: string, reason: string) =>
      mocked.projectPersist(projectId, reason),
  },
}));

import { EntityRelationService } from "../../../src/main/services/world/entityRelationService.js";

describe("EntityRelationService freshness", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.relationCreate.mockResolvedValue({ id: "relation-1" });
    mocked.relationFindUnique.mockResolvedValue({
      id: "relation-1",
      projectId: "project-1",
      sourceType: "Character",
      targetType: "Event",
    });
    mocked.relationUpdate.mockResolvedValue({
      id: "relation-1",
      projectId: "project-1",
    });
    mocked.relationDelete.mockResolvedValue({
      id: "relation-1",
      projectId: "project-1",
    });
    mocked.projectFindMany.mockResolvedValue([{ id: "project-1" }]);
  });

  it("touches project freshness after relation create and delete", async () => {
    const service = new EntityRelationService();

    await service.createRelation({
      projectId: "project-1",
      sourceId: "character-1",
      sourceType: "Character",
      targetId: "event-1",
      targetType: "Event",
      relation: "involved_in",
    });

    await service.deleteRelation("relation-1");

    expect(mocked.projectTouch).toHaveBeenCalledWith("project-1");
    expect(mocked.projectPersist).toHaveBeenCalledWith(
      "project-1",
      "entity-relation:create",
    );
    expect(mocked.projectPersist).toHaveBeenCalledWith(
      "project-1",
      "entity-relation:delete",
    );
  });
});
