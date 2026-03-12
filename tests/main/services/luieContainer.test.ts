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

  it("reads sqlite-v2 .luie entries through the same container seam", async () => {
    tempRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "luie-container-sqlite-"));
    const packagePath = path.join(tempRoot, "future-project.luie");

    await writeLuieContainer({
      targetPath: packagePath,
      kind: "sqlite-v2",
      payload: {
        meta: {
          projectId: "project-2",
          title: "SQLite Container Test",
        },
        chapters: [
          {
            id: "chapter-1",
            content: "# sqlite hello",
          },
        ],
        characters: [],
        terms: [],
        snapshots: [
          {
            id: "snapshot-1",
            chapterId: "chapter-1",
            content: "snapshot content",
            createdAt: "2026-03-12T00:00:00.000Z",
          },
        ],
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
    const snapshotIndexRaw = await readLuieContainerEntry(
      packagePath,
      "snapshots/index.json",
      logger,
    );

    expect(probe).toMatchObject({
      exists: true,
      kind: "sqlite-v2",
      layout: "file",
    });
    expect(metaRaw).toContain('"container": "sqlite"');
    expect(metaRaw).toContain('"version": 2');
    expect(chapterRaw).toBe("# sqlite hello");
    expect(snapshotIndexRaw).toContain('"snapshot-1"');
    await expect(
      fsp.access(`${packagePath}-wal`),
    ).rejects.toMatchObject({ code: "ENOENT" });
    await expect(
      fsp.access(`${packagePath}-shm`),
    ).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("preserves sqlite-v2 kind on subsequent writes when the target already exists", async () => {
    tempRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "luie-container-sqlite-keep-"));
    const packagePath = path.join(tempRoot, "preserve-kind.luie");

    await writeLuieContainer({
      targetPath: packagePath,
      kind: "sqlite-v2",
      payload: {
        meta: {
          projectId: "project-3",
          title: "First Write",
        },
        chapters: [],
        characters: [],
        terms: [],
        snapshots: [],
      },
      logger,
    });

    await writeLuieContainer({
      targetPath: packagePath,
      payload: {
        meta: {
          projectId: "project-3",
          title: "Second Write",
        },
        chapters: [
          {
            id: "chapter-2",
            content: "updated content",
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
      "manuscript/chapter-2.md",
      logger,
    );

    expect(probe.kind).toBe("sqlite-v2");
    expect(metaRaw).toContain('"title": "Second Write"');
    expect(chapterRaw).toBe("updated content");
  });
});
