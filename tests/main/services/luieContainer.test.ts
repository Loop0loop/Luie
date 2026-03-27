// TEST_LEVEL: REAL_FS_INTEGRATION
// PROVES: canonical container read/write behavior against real .luie files
// DOES_NOT_PROVE: higher-level project or UI orchestration

import os from "node:os";
import path from "node:path";
import * as fsp from "node:fs/promises";
import { afterEach, describe, expect, it } from "vitest";
import { ErrorCode } from "../../../src/shared/constants/errorCode.js";
import {
  probeLuieContainer,
  readLuieContainerEntry,
  writeLuieContainer,
} from "../../../src/main/services/io/luieContainer.js";
import { writeLuieSqliteEntry } from "../../../src/main/services/io/luieSqliteContainer.js";
import {
  makeExactMixedByteText,
  makeMixedNarrativeText,
} from "../luieFixtures.js";

const logger = {
  info: () => undefined,
  debug: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

const expectNoWalSidecars = async (packagePath: string): Promise<void> => {
  await expect(fsp.access(`${packagePath}-wal`)).rejects.toMatchObject({
    code: "ENOENT",
  });
  await expect(fsp.access(`${packagePath}-shm`)).rejects.toMatchObject({
    code: "ENOENT",
  });
};

describe("luieContainer", () => {
  let tempRoot = "";

  afterEach(async () => {
    if (!tempRoot) return;
    await fsp.rm(tempRoot, { recursive: true, force: true });
    tempRoot = "";
  });

  it("writes sqlite-v2 containers by default through the container seam", async () => {
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

    const probe = await probeLuieContainer(packagePath);
    const metaRaw = await readLuieContainerEntry(packagePath, "meta.json", logger);
    const chapterRaw = await readLuieContainerEntry(
      packagePath,
      "manuscript/chapter-1.md",
      logger,
    );

    expect(probe).toMatchObject({
      exists: true,
      kind: "sqlite-v2",
      layout: "file",
    });
    expect(metaRaw).toContain('"container": "sqlite"');
    expect(metaRaw).toContain('"version": 2');
    expect(metaRaw).toContain('"title": "Container Test"');
    expect(chapterRaw).toBe("# hello");
  });

  it("detects legacy directory packages and rejects reads", async () => {
    tempRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "luie-container-dir-"));
    const packagePath = path.join(tempRoot, "legacy-project.luie");
    await fsp.mkdir(path.join(packagePath, "manuscript"), { recursive: true });
    await fsp.writeFile(
      path.join(packagePath, "meta.json"),
      JSON.stringify({ projectId: "project-1", title: "Legacy Dir" }, null, 2),
      "utf8",
    );

    const probe = await probeLuieContainer(packagePath);

    expect(probe).toMatchObject({
      exists: true,
      kind: "legacy-package",
      layout: "directory",
    });
    await expect(
      readLuieContainerEntry(packagePath, "meta.json", logger),
    ).rejects.toMatchObject({
      code: ErrorCode.LUIE_LEGACY_FORMAT_UNSUPPORTED,
    });
  });

  it("detects legacy zip packages and rejects reads", async () => {
    tempRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "luie-container-zip-"));
    const packagePath = path.join(tempRoot, "legacy-project.luie");
    await fsp.writeFile(packagePath, Buffer.from([0x50, 0x4b, 0x03, 0x04]));

    const probe = await probeLuieContainer(packagePath);

    expect(probe).toMatchObject({
      exists: true,
      kind: "legacy-package",
      layout: "file",
    });
    await expect(
      readLuieContainerEntry(packagePath, "meta.json", logger),
    ).rejects.toMatchObject({
      code: ErrorCode.LUIE_LEGACY_FORMAT_UNSUPPORTED,
    });
  });

  it("reads sqlite-v2 .luie entries through the same container seam", async () => {
    tempRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "luie-container-sqlite-"));
    const packagePath = path.join(tempRoot, "future-project.luie");

    await writeLuieContainer({
      targetPath: packagePath,
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
        synopsis: { synopsis: "", status: "draft" },
        plot: { columns: [] },
        drawing: { paths: [] },
        mindmap: { nodes: [], edges: [] },
        memos: { memos: [] },
        graph: { nodes: [], edges: [] },
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
    await expectNoWalSidecars(packagePath);
  });

  it.each([5_000, 100_000, 1_000_000, 2_000_000, 5_000_000])(
    "writes and rereads %i-character sqlite-backed payloads without WAL sidecars",
    async (size) => {
      tempRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "luie-container-large-"));
      const packagePath = path.join(tempRoot, `large-${size}.luie`);
      const chapterOne = makeMixedNarrativeText(size, 0);
      const chapterTwo = makeMixedNarrativeText(Math.max(1, Math.floor(size / 3)), 1);
      const synopsis = makeMixedNarrativeText(Math.max(256, Math.floor(size / 24)), 2);
      const snapshotBody = makeMixedNarrativeText(Math.max(160, Math.floor(size / 18)), 3);

      await writeLuieContainer({
        targetPath: packagePath,
        payload: {
          meta: {
            projectId: `project-${size}`,
            title: `Large Container ${size}`,
          },
          chapters: [
            {
              id: "chapter-1",
              content: chapterOne,
            },
            {
              id: "chapter-2",
              content: chapterTwo,
            },
          ],
          characters: [
            {
              id: `character-${size}`,
              name: makeMixedNarrativeText(120, 4),
              description: makeMixedNarrativeText(240, 5),
            },
          ],
          terms: [
            {
              id: `term-${size}`,
              term: makeMixedNarrativeText(80, 6),
              definition: makeMixedNarrativeText(140, 7),
            },
          ],
          synopsis: { synopsis, status: "draft" },
          plot: {
            columns: [
              {
                id: "plot-col",
                title: makeMixedNarrativeText(110, 8),
                cards: [],
              },
            ],
          },
          drawing: { paths: [] },
          mindmap: {
            nodes: [
              {
                id: "mind-1",
                label: makeMixedNarrativeText(70, 9),
              },
            ],
            edges: [],
          },
          memos: {
            memos: [
              {
                id: "memo-1",
                title: makeMixedNarrativeText(90, 10),
                content: makeMixedNarrativeText(160, 11),
                tags: ["alpha", "beta"],
              },
            ],
          },
          graph: {
            nodes: [
              {
                id: "graph-1",
                name: makeMixedNarrativeText(100, 12),
              },
            ],
            edges: [],
          },
          snapshots: [
            {
              id: "snapshot-1",
              chapterId: "chapter-1",
              content: snapshotBody,
              description: `snapshot-${size}`,
              createdAt: "2026-03-12T00:00:00.000Z",
            },
          ],
        },
        logger,
      });

      const probe = await probeLuieContainer(packagePath);
      expect(probe).toMatchObject({
        exists: true,
        kind: "sqlite-v2",
        layout: "file",
      });

      const chapterOneRaw = await readLuieContainerEntry(
        packagePath,
        "manuscript/chapter-1.md",
        logger,
      );
      const chapterTwoRaw = await readLuieContainerEntry(
        packagePath,
        "manuscript/chapter-2.md",
        logger,
      );
      const synopsisRaw = await readLuieContainerEntry(
        packagePath,
        "world/synopsis.json",
        logger,
      );
      const charactersRaw = await readLuieContainerEntry(
        packagePath,
        "world/characters.json",
        logger,
      );
      const snapshotIndexRaw = await readLuieContainerEntry(
        packagePath,
        "snapshots/index.json",
        logger,
      );
      const snapshotRaw = await readLuieContainerEntry(
        packagePath,
        "snapshots/snapshot-1.snap",
        logger,
      );

      expect(chapterOneRaw).toBe(chapterOne);
      expect(chapterTwoRaw).toBe(chapterTwo);
      expect(JSON.parse(synopsisRaw ?? "{}")).toMatchObject({
        synopsis,
        status: "draft",
      });
      expect(charactersRaw).toContain(`character-${size}`);
      expect(charactersRaw).toContain("This is a stable manuscript sentence");
      expect(JSON.parse(snapshotIndexRaw ?? "{}")).toMatchObject({
        snapshots: [expect.objectContaining({ id: "snapshot-1" })],
      });
      expect(JSON.parse(snapshotRaw ?? "{}")).toMatchObject({
        id: "snapshot-1",
        content: snapshotBody,
        description: `snapshot-${size}`,
      });
      await expectNoWalSidecars(packagePath);
    },
  );

  it("preserves sqlite-v2 kind on subsequent writes when the target already exists", async () => {
    tempRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "luie-container-sqlite-keep-"));
    const packagePath = path.join(tempRoot, "preserve-kind.luie");

    await writeLuieContainer({
      targetPath: packagePath,
      payload: {
        meta: {
          projectId: "project-3",
          title: "First Write",
        },
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

  it("refreshes meta.json updatedAt when writing a single sqlite .luie entry", async () => {
    tempRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "luie-container-meta-"));
    const packagePath = path.join(tempRoot, "meta-refresh.luie");

    await writeLuieContainer({
      targetPath: packagePath,
      payload: {
        meta: {
          projectId: "project-4",
          title: "Meta Refresh",
          updatedAt: "2026-03-12T00:00:00.000Z",
        },
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

    await writeLuieSqliteEntry({
      targetPath: packagePath,
      entryPath: "world/synopsis.json",
      content: JSON.stringify(
        {
          synopsis: "updated",
          status: "working",
          updatedAt: "2026-03-12T03:00:00.000Z",
        },
        null,
        2,
      ),
      logger,
    });

    const metaRaw = await readLuieContainerEntry(packagePath, "meta.json", logger);
    const meta = JSON.parse(metaRaw ?? "{}") as { updatedAt?: string };

    expect(meta.updatedAt).toBeDefined();
    expect(Date.parse(meta.updatedAt ?? "")).toBeGreaterThan(
      Date.parse("2026-03-12T00:00:00.000Z"),
    );
  });
});
