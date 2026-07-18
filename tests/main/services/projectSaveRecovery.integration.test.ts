// TEST_LEVEL: REAL_DB_FS_INTEGRATION
// PROVES: a stale attached checkpoint is exported and marked current on recovery

import os from "node:os";
import path from "node:path";
import * as fsp from "node:fs/promises";
import { afterEach, describe, expect, it } from "vitest";
import { db } from "../../../src/main/database/index.js";
import * as schema from "../../../src/main/database/schema/index.js";
import { projectService } from "../../../src/main/services/features/project/projectService.js";
import { getProjectRevisionState } from "../../../src/main/services/core/project/projectRevisionStore.js";
import { readLuieContainerEntry } from "../../../src/main/services/io/luieContainer.js";

const logger = {
  info: () => undefined,
  debug: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

describe("project save recovery", () => {
  let tempRoot = "";

  afterEach(async () => {
    await projectService.flushPendingExports();
    if (tempRoot) await fsp.rm(tempRoot, { recursive: true, force: true });
  });

  it("exports the latest database revision after a stale checkpoint", async () => {
    tempRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "luie-recovery-"));
    const projectPath = path.join(tempRoot, "recovered.luie");
    const now = "2026-07-19T00:00:00.000Z";
    await db.getClient().insert(schema.project).values({
      id: "project-recovery",
      title: "Novel",
      revision: 2,
      createdAt: now,
      updatedAt: now,
    });
    await db.getClient().insert(schema.projectAttachment).values({
      projectId: "project-recovery",
      projectPath,
      exportedRevision: 1,
      createdAt: now,
      updatedAt: now,
    });
    await db.getClient().insert(schema.character).values({
      id: "character-recovery",
      projectId: "project-recovery",
      name: "Hero",
      description: "latest",
      createdAt: now,
      updatedAt: now,
    });

    await expect(projectService.scheduleStalePackageExports()).resolves.toBe(1);
    await expect(projectService.flushPendingExports()).resolves.toMatchObject({
      failed: 0,
      timedOut: false,
    });

    const characters = JSON.parse(
      String(
        await readLuieContainerEntry(
          projectPath,
          "world/characters.json",
          logger,
        ),
      ),
    ) as { characters: Array<{ id: string; description?: string }> };
    expect(characters.characters).toContainEqual(
      expect.objectContaining({
        id: "character-recovery",
        description: "latest",
      }),
    );
    await expect(
      getProjectRevisionState("project-recovery"),
    ).resolves.toEqual({ revision: 2, exportedRevision: 2 });
  });
});
