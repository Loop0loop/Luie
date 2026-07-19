// TEST_LEVEL: REAL_DB_FS_INTEGRATION
// PROVES: a stale attached checkpoint is exported and marked current on recovery

import os from "node:os";
import path from "node:path";
import * as fsp from "node:fs/promises";
import { afterEach, describe, expect, it } from "vitest";
import { db } from "../../../src/main/database/index.js";
import * as schema from "../../../src/main/database/schema/index.js";
import { projectService } from "../../../src/main/services/features/project/projectService.js";
import {
  getProjectRevisionState,
  markProjectExported,
} from "../../../src/main/services/core/project/projectRevisionStore.js";
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
    await db.getClient().insert(schema.chapter).values({
      id: "chapter-recovery",
      projectId: "project-recovery",
      title: "Chapter",
      content: "before",
      order: 0,
      createdAt: now,
      updatedAt: now,
    });
    const baseline = await getProjectRevisionState("project-recovery");
    await markProjectExported("project-recovery", baseline.revision);

    await db.getClient().update(schema.chapter).set({
      content: "latest",
      updatedAt: "2026-07-19T01:00:00.000Z",
    });
    const stale = await getProjectRevisionState("project-recovery");
    expect(stale).toEqual({
      revision: baseline.revision + 1,
      exportedRevision: baseline.revision,
    });

    await expect(projectService.scheduleStalePackageExports()).resolves.toBe(1);
    await expect(projectService.flushPendingExports()).resolves.toMatchObject({
      failed: 0,
      timedOut: false,
    });

    await expect(
      readLuieContainerEntry(
        projectPath,
        "manuscript/chapter-recovery.md",
        logger,
      ),
    ).resolves.toBe("latest");
    await expect(
      getProjectRevisionState("project-recovery"),
    ).resolves.toEqual({
      revision: stale.revision,
      exportedRevision: stale.revision,
    });
  });
});
