import { describe, expect, it } from "vitest";
import { toWorldEntityExportDto } from "../../../src/main/services/core/project/projectExportMapper.js";

describe("world entity memory bridge pointer", () => {
  it("exports the memoryEntityId bridge pointer from world entities", () => {
    const exported = toWorldEntityExportDto({
      id: "world-entity-1",
      projectId: "project-1",
      type: "Place",
      name: "검은 성",
      description: null,
      firstAppearance: null,
      attributes: null,
      memoryEntityId: "memory-entity-1",
      positionX: 10,
      positionY: 20,
      createdAt: "2026-06-08T00:00:00.000Z",
      updatedAt: "2026-06-08T00:00:00.000Z",
      deletedAt: null,
    });

    expect(exported.memoryEntityId).toBe("memory-entity-1");
  });
});
