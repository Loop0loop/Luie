import os from "node:os";
import path from "node:path";
import * as fsp from "node:fs/promises";
import { afterEach, describe, expect, it } from "vitest";
import { withProjectPathStatus } from "../../../src/main/services/core/project/projectListStatus.js";
import { writeLuieContainer } from "../../../src/main/services/io/luieContainer.js";

const logger = {
  info: () => undefined,
  debug: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

describe("withProjectPathStatus sqlite-only classification", () => {
  let tempRoot = "";

  afterEach(async () => {
    if (!tempRoot) return;
    await fsp.rm(tempRoot, { recursive: true, force: true });
    tempRoot = "";
  });

  it("marks sqlite-backed .luie attachments as attached", async () => {
    tempRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "luie-status-sqlite-"));
    const projectPath = path.join(tempRoot, "project.luie");

    await writeLuieContainer({
      targetPath: projectPath,
      payload: {
        meta: { projectId: "project-1", title: "SQLite Project" },
        chapters: [],
        characters: [],
        terms: [],
        synopsis: { synopsis: "", status: "draft" },
        plot: { columns: [] },
        drawing: { paths: [] },
        mindmap: { nodes: [], edges: [] },
        memos: { memos: [] },
        graph: { nodes: [], edges: [] },
        snapshots: [],
      },
      logger,
    });

    const [project] = await withProjectPathStatus([{ projectPath }]);

    expect(project).toMatchObject({
      attachmentStatus: "attached",
      attachmentContainerKind: "sqlite-v2",
      pathMissing: false,
    });
  });

  it("marks legacy package attachments as unsupported", async () => {
    tempRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "luie-status-legacy-"));
    const projectPath = path.join(tempRoot, "legacy-project.luie");
    await fsp.mkdir(path.join(projectPath, "manuscript"), { recursive: true });
    await fsp.writeFile(path.join(projectPath, "meta.json"), "{}", "utf8");

    const [project] = await withProjectPathStatus([{ projectPath }]);

    expect(project).toMatchObject({
      attachmentStatus: "unsupported-legacy-container",
      attachmentContainerKind: "legacy-package",
      pathMissing: false,
    });
  });
});
