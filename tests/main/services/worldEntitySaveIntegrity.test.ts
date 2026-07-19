// TEST_LEVEL: REAL_DB_INTEGRATION
// PROVES: world entity patches commit with project revision before package export

import { afterEach, describe, expect, it, vi } from "vitest";
import { db } from "../../../src/main/database/index.js";
import * as schema from "../../../src/main/database/schema/index.js";
import { characterService } from "../../../src/main/services/features/world/entities/characterService.js";
import { eventService } from "../../../src/main/services/features/world/entities/eventService.js";
import { factionService } from "../../../src/main/services/features/world/entities/factionService.js";
import { termService } from "../../../src/main/services/features/world/entities/termService.js";
import { projectService } from "../../../src/main/services/features/project/projectService.js";
import { getProjectRevisionState } from "../../../src/main/services/core/project/projectRevisionStore.js";
import { characterUpdateSchema } from "../../../src/shared/schemas/world.js";

const projectUpdatedAt = (): string | undefined =>
  db
    .getClient()
    .select({ updatedAt: schema.project.updatedAt })
    .from(schema.project)
    .get()?.updatedAt;

describe("world entity save integrity", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("accepts structured attribute patches at the IPC validation boundary", () => {
    expect(
      characterUpdateSchema.parse({
        id: "char-1",
        attributesPatch: { color: "red" },
      }),
    ).toMatchObject({ attributesPatch: { color: "red" } });
  });

  it("merges character attributes and commits revision before scheduling export", async () => {
    const now = "2026-07-18T00:00:00.000Z";
    await db.getClient().insert(schema.project).values({
      id: "project-1",
      title: "Novel",
      createdAt: now,
      updatedAt: now,
    });
    await db.getClient().insert(schema.character).values({
      id: "char-1",
      projectId: "project-1",
      name: "Hero",
      attributes: JSON.stringify({ role: "lead", color: "blue" }),
      createdAt: now,
      updatedAt: now,
    });
    const baseline = await getProjectRevisionState("project-1");
    const schedule = vi
      .spyOn(projectService, "schedulePackageExport")
      .mockImplementation(() => undefined);

    const updated = await characterService.updateCharacter({
      id: "char-1",
      attributesPatch: { color: "red" },
    });

    expect(JSON.parse(String(updated.attributes))).toEqual({
      role: "lead",
      color: "red",
    });
    await expect(getProjectRevisionState("project-1")).resolves.toEqual({
      revision: baseline.revision + 1,
      exportedRevision: 0,
    });
    expect(projectUpdatedAt()).not.toBe(now);
    expect(schedule).toHaveBeenCalledWith("project-1", "character:update");
  });

  it("commits event, faction, and term updates without waiting for package export", async () => {
    const now = "2026-07-18T00:00:00.000Z";
    await db.getClient().insert(schema.project).values({
      id: "project-1",
      title: "Novel",
      createdAt: now,
      updatedAt: now,
    });
    await db.getClient().insert(schema.event).values({
      id: "event-1",
      projectId: "project-1",
      name: "Opening",
      attributes: JSON.stringify({ place: "Seoul" }),
      createdAt: now,
      updatedAt: now,
    });
    await db.getClient().insert(schema.faction).values({
      id: "faction-1",
      projectId: "project-1",
      name: "Guild",
      createdAt: now,
      updatedAt: now,
    });
    await db.getClient().insert(schema.term).values({
      id: "term-1",
      projectId: "project-1",
      term: "Mana",
      order: 0,
      createdAt: now,
      updatedAt: now,
    });
    const baseline = await getProjectRevisionState("project-1");
    const schedule = vi
      .spyOn(projectService, "schedulePackageExport")
      .mockImplementation(() => undefined);

    const updatedEvent = await eventService.updateEvent({
      id: "event-1",
      attributesPatch: { weather: "rain" },
    });
    await expect(getProjectRevisionState("project-1")).resolves.toMatchObject({
      revision: baseline.revision + 1,
    });
    expect(projectUpdatedAt()).not.toBe(now);
    await db.getClient().update(schema.project).set({ updatedAt: now });

    await factionService.updateFaction({
      id: "faction-1",
      description: "Allies",
    });
    await expect(getProjectRevisionState("project-1")).resolves.toMatchObject({
      revision: baseline.revision + 2,
    });
    expect(projectUpdatedAt()).not.toBe(now);
    await db.getClient().update(schema.project).set({ updatedAt: now });

    await termService.updateTerm({
      id: "term-1",
      definition: "Magic energy",
    });

    expect(JSON.parse(String(updatedEvent.attributes))).toEqual({
      place: "Seoul",
      weather: "rain",
    });
    await expect(getProjectRevisionState("project-1")).resolves.toMatchObject({
      revision: baseline.revision + 3,
    });
    expect(projectUpdatedAt()).not.toBe(now);
    expect(schedule.mock.calls).toEqual([
      ["project-1", "event:update"],
      ["project-1", "faction:update"],
      ["project-1", "term:update"],
    ]);
  });

  it("commits create and delete revisions before scheduling export", async () => {
    const now = "2026-07-18T00:00:00.000Z";
    await db.getClient().insert(schema.project).values({
      id: "project-1",
      title: "Novel",
      createdAt: now,
      updatedAt: now,
    });
    const schedule = vi
      .spyOn(projectService, "schedulePackageExport")
      .mockImplementation(() => undefined);
    const baseline = await getProjectRevisionState("project-1");

    const created = await eventService.createEvent({
      projectId: "project-1",
      name: "Opening",
    });
    await expect(getProjectRevisionState("project-1")).resolves.toMatchObject({
      revision: baseline.revision + 1,
    });
    expect(projectUpdatedAt()).not.toBe(now);
    await db.getClient().update(schema.project).set({ updatedAt: now });

    await eventService.deleteEvent(created.id);

    await expect(getProjectRevisionState("project-1")).resolves.toMatchObject({
      revision: baseline.revision + 2,
    });
    expect(projectUpdatedAt()).not.toBe(now);
    expect(schedule.mock.calls).toEqual([
      ["project-1", "event:create"],
      ["project-1", "event:delete"],
    ]);
  });
});
