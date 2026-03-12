import os from "node:os";
import path from "node:path";
import * as fsp from "node:fs/promises";
import { afterEach, describe, expect, it } from "vitest";
import {
  probeLuieContainer,
  readLuieContainerEntry,
  writeLuieContainer,
} from "../../../src/main/services/io/luieContainer.js";

const logger = {
  info: () => undefined,
  debug: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

describe("luieContainer", () => {
  let tempRoot = "";

  afterEach(async () => {
    if (!tempRoot) return;
    await fsp.rm(tempRoot, { recursive: true, force: true });
    tempRoot = "";
  });

  it("detects package-v1 zip containers written through the container seam", async () => {
    tempRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "luie-container-"));
    const packagePath = path.join(tempRoot, "project.luie");

    await writeLuieContainer({
      targetPath: packagePath,
      payload: {
        meta: {
          projectId: "project-1",
          title: "Container Test",
        },
        chapters: [
          {
            id: "chapter-1",
            content: "# hello",
          },
        ],
        characters: [],
        terms: [],
        snapshots: [],
      },
      logger,
    });

    const probe = await probeLuieContainer(packagePath);
    const metaRaw = await readLuieContainerEntry(packagePath, "meta.json", logger);
    const chapterRaw = await readLuieContainerEntry(
      packagePath,
      "manuscript/chapter-1.md",
      logger,
    );

    expect(probe).toMatchObject({
      exists: true,
      kind: "package-v1",
      layout: "file",
    });
    expect(metaRaw).toContain('"title": "Container Test"');
    expect(chapterRaw).toBe("# hello");
  });

  it("detects legacy directory packages as package-v1", async () => {
    tempRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "luie-container-dir-"));
    const packagePath = path.join(tempRoot, "legacy-project.luie");
    await fsp.mkdir(path.join(packagePath, "manuscript"), { recursive: true });
    await fsp.writeFile(
      path.join(packagePath, "meta.json"),
      JSON.stringify({ projectId: "project-1", title: "Legacy Dir" }, null, 2),
      "utf8",
    );

    const probe = await probeLuieContainer(packagePath);
    const metaRaw = await readLuieContainerEntry(packagePath, "meta.json", logger);

    expect(probe).toMatchObject({
      exists: true,
      kind: "package-v1",
      layout: "directory",
    });
    expect(metaRaw).toContain('"title": "Legacy Dir"');
  });

  it("detects sqlite-backed .luie headers without treating them as zip packages", async () => {
    tempRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "luie-container-sqlite-"));
    const packagePath = path.join(tempRoot, "future-project.luie");
    await fsp.writeFile(
      packagePath,
      Buffer.from("SQLite format 3\u0000placeholder-data", "utf8"),
    );

    const probe = await probeLuieContainer(packagePath);

    expect(probe).toMatchObject({
      exists: true,
      kind: "sqlite-v2",
      layout: "file",
    });
    await expect(
      readLuieContainerEntry(packagePath, "meta.json", logger),
    ).rejects.toThrow("SQLite-backed .luie reading is not implemented yet");
  });
});
