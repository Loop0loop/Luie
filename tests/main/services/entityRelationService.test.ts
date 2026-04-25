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
        limit: vi.fn(() => Promise.resolve([])),
        orderBy: vi.fn(() => Promise.resolve([])),
      })),
      orderBy: vi.fn(() => Promise.resolve([])),
    })),
  };
  const chainableUpdate = {
    set: vi.fn(() => ({
      where: vi.fn(() => ({ returning: relationDeleteReturning })),
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
    mocked.relationDeleteReturning.mockResolvedValue([{ id: "relation-1", projectId: "project-1" }]);
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
});
