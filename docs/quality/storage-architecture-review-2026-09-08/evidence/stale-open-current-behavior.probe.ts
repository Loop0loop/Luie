import path from "node:path";
import os from "node:os";
import * as fs from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "../../../../src/main/database/index.js";
import * as schema from "../../../../src/main/database/schema/index.js";
import { projectService } from "../../../../src/main/services/features/project/projectService.js";
import { chapterService } from "../../../../src/main/services/features/manuscript/chapterService.js";
import { getProjectRevisionState } from "../../../../src/main/services/core/project/projectRevisionStore.js";
import { readLuieContainerEntry } from "../../../../src/main/services/io/luieContainer.js";

describe("storage authority observation", () => {
  it("observes whether reopening an older checkpoint preserves a newer committed body", async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "luie-stale-open-"));
    const packagePath = path.join(tempRoot, "fixture.luie");
    let scheduleSpy: ReturnType<typeof vi.spyOn> | undefined;
    try {
      const project = await projectService.createProject({ title: "Authority fixture", projectPath: packagePath });
      const chapter = await chapterService.createChapter({ projectId: project.id, title: "One" });
      await chapterService.updateChapter({ id: chapter.id, content: "checkpoint A" });
      await projectService.flushPendingExports();
      const baseline = await getProjectRevisionState(project.id);
      const packageMeta = JSON.parse((await readLuieContainerEntry(packagePath, "meta.json"))!);

      // Hold only export scheduling to make the normal 500 ms checkpoint gap deterministic.
      scheduleSpy = vi.spyOn(projectService, "schedulePackageExport").mockImplementation(() => undefined);
      await chapterService.updateChapter({ id: chapter.id, content: "new committed B" });
      const beforeOpen = await chapterService.getChapter(chapter.id);
      const pending = await getProjectRevisionState(project.id);
      const projectRow = db.getClient().select().from(schema.project).where(eq(schema.project.id, project.id)).get();
      expect(beforeOpen.content).toBe("new committed B");
      expect(pending.revision).toBeGreaterThan(pending.exportedRevision);
      const opened = await projectService.openLuieProject(packagePath);
      const afterOpen = await chapterService.getChapter(chapter.id);
      const afterRevision = await getProjectRevisionState(project.id);
      const observation = { baseline, pending, localProjectUpdatedAt: projectRow?.updatedAt, packageUpdatedAt: packageMeta.updatedAt, beforeOpen: beforeOpen.content, conflict: opened.conflict ?? null, afterOpen: afterOpen.content, afterRevision };
      await fs.writeFile("/private/tmp/luie-storage-review/stale-open-observation.json", JSON.stringify(observation, null, 2));
      // This assertion records a defect; a regression test after the fix must require B.
      expect(afterOpen.content).toBe("checkpoint A");
    } finally {
      scheduleSpy?.mockRestore();
      await projectService.flushPendingExports();
      await fs.rm(tempRoot, { recursive: true, force: true });
    }
  });
});
