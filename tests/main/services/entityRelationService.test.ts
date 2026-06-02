import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => {
  const relationInsertReturning = vi.fn();
  const relationSelect = vi.fn();
  const relationUpdateReturning = vi.fn();
  const relationDeleteReturning = vi.fn();
  const relationDeleteMany = vi.fn();
  const relationFindMany = vi.fn();
  const projectFindMany = vi.fn();
  const projectSelect = vi.fn();
  const projectTouch = vi.fn(async (_projectId: string) => undefined);
  const projectPersist = vi.fn(async (_projectId: string, _reason: string) => undefined);

  const chainableInsert = {
    values: vi.fn(() => ({ returning: relationInsertReturning })),
  };
  const chainableSelect = {
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        limit: vi.fn(() => mocked.relationSelect()),
        orderBy: vi.fn(() => mocked.relationFindMany()),
      })),
      orderBy: vi.fn(() => mocked.relationFindMany()),
    })),
  };
  const chainableUpdate = {
    set: vi.fn(() => ({
      where: vi.fn(() => ({ returning: relationUpdateReturning })),
    })),
  };
  const chainableDelete = {
    where: vi.fn(() => ({ returning: relationDeleteReturning })),
  };

  const drizzleClient = {
    insert: vi.fn(() => chainableInsert),
    select: vi.fn(() => chainableSelect),
    update: vi.fn(() => chainableUpdate),
    delete: vi.fn(() => chainableDelete),
    transaction: vi.fn(async (callback: (tx: unknown) => unknown) => {
      return await callback(drizzleClient);
    }),
  };

  return {
    relationInsertReturning,
    relationSelect,
    relationUpdateReturning,
    relationDeleteReturning,
    relationDeleteMany,
    relationFindMany,
    projectFindMany,
    projectSelect,
    projectTouch,
    projectPersist,
    drizzleClient,
  };
});

vi.mock("../../../src/main/database/index.js", () => ({
  db: {
    initialize: vi.fn(async () => undefined),
    getClient: () => mocked.drizzleClient,
    getDrizzleClient: () => mocked.drizzleClient,
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
    mocked.relationInsertReturning.mockResolvedValue([{ id: "relation-1", projectId: "project-1" }]);
    mocked.relationSelect.mockResolvedValue([]);
    mocked.relationUpdateReturning.mockResolvedValue([{ id: "relation-1", projectId: "project-1" }]);
    mocked.relationDeleteReturning.mockResolvedValue([{ id: "relation-1", projectId: "project-1" }]);
    mocked.relationFindMany.mockResolvedValue([]);
    mocked.projectFindMany.mockResolvedValue([{ id: "project-1" }]);
    mocked.projectSelect.mockResolvedValue([{ id: "project-1" }]);
  });

  it("touches project freshness after relation create and delete", async () => {
    const service = new EntityRelationService();

    await service.createRelation({
      projectId: "project-1",
      sourceId: "character-1",
      sourceType: "Character",
      targetId: "event-1",
      targetType: "Event",
      relation: "belongs_to",
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

  it("touches project freshness after relation update", async () => {
    mocked.relationSelect.mockResolvedValue([
      {
        id: "relation-1",
        projectId: "project-1",
        sourceId: "character-1",
        sourceType: "Character",
        targetId: "event-1",
        targetType: "Event",
        relation: "belongs_to",
      },
    ]);
    const service = new EntityRelationService();

    await service.updateRelation({
      id: "relation-1",
      relation: "causes",
    });

    expect(mocked.projectTouch).toHaveBeenCalledWith("project-1");
    expect(mocked.projectPersist).toHaveBeenCalledWith(
      "project-1",
      "entity-relation:update",
    );
  });

  it("maps relation rows with canonical world entity pointers", async () => {
    mocked.relationFindMany.mockResolvedValue([
      {
        id: "relation-1",
        projectId: "project-1",
        sourceId: "world-1",
        sourceType: "Place",
        targetId: "character-1",
        targetType: "Character",
        relation: "located_in",
        attributes: "{\"importance\":3}",
      },
    ]);
    const service = new EntityRelationService();

    const result = await service.getAllRelations("project-1");

    expect(result[0]).toMatchObject({
      id: "relation-1",
      sourceWorldEntityId: "world-1",
      targetWorldEntityId: null,
      attributes: { importance: 3 },
    });
  });
});
