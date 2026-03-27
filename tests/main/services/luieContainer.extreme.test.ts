// TEST_LEVEL: REAL_FS_INTEGRATION
// PROVES: actual SQLite-backed .luie write/read/reopen behavior on the filesystem
// DOES_NOT_PROVE: app-wide release safety or UI/IPC orchestration

import os from "node:os";
import path from "node:path";
import * as fsp from "node:fs/promises";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ErrorCode } from "../../../src/shared/constants/errorCode.js";
import {
  probeLuieContainer,
  readLuieContainerEntry,
  writeLuieContainer,
} from "../../../src/main/services/io/luieContainer.js";
import { writeLuieSqliteEntry } from "../../../src/main/services/io/luieSqliteContainer.js";
import {
  makeDeepPath,
  makeExactMixedByteText,
  makeLongPath,
  makeManyChapters,
  makeMixedNarrativeText,
} from "../luieFixtures.js";

const logger = {
  info: () => undefined,
  debug: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

const exactLimitBytes = 5 * 1024 * 1024;

const expectNoWalSidecars = async (packagePath: string): Promise<void> => {
  await expect(fsp.access(`${packagePath}-wal`)).rejects.toMatchObject({
    code: "ENOENT",
  });
  await expect(fsp.access(`${packagePath}-shm`)).rejects.toMatchObject({
    code: "ENOENT",
  });
};

const buildPackagePayload = (size: number, variant: number) => {
  const chapterOne = makeMixedNarrativeText(size, variant);
  const chapterTwo = makeMixedNarrativeText(Math.max(1, Math.floor(size / 2)), variant + 1);
  const synopsis = makeMixedNarrativeText(Math.max(256, Math.floor(size / 24)), variant + 2);
  const snapshotContent = makeMixedNarrativeText(Math.max(160, Math.floor(size / 18)), variant + 3);

  return {
    meta: {
      projectId: `project-${size}`,
      title: `Extreme Package ${size}`,
    },
    chapters: [
      {
        id: "ch1",
        content: chapterOne,
      },
      {
        id: "ch2",
        content: chapterTwo,
      },
    ],
    characters: [
      {
        id: `character-${size}`,
        name: `한국어 / 日本語 / English character ${size}`,
        description: `This character note mixes 한국어, 日本語, English, and digits 0123456789 for ${size}.`,
      },
    ],
    terms: [
      {
        id: `term-${size}`,
        term: `용어 ${size} / 言葉 / term`,
        definition: `An English definition with 한국어 and 日本語 context for ${size}.`,
      },
    ],
    synopsis: { synopsis, status: "draft" as const },
    plot: {
      columns: [
        {
          id: "plot-col",
          title: `플롯 / プロット / plot ${size}`,
          cards: [],
        },
      ],
    },
    drawing: { paths: [] },
    mindmap: {
      nodes: [
        {
          id: "mind-1",
          label: `마인드맵 / マインドマップ / mindmap ${size}`,
        },
      ],
      edges: [],
    },
    memos: {
      memos: [
        {
          id: "memo-1",
          title: `메모 / メモ / memo ${size}`,
          content: `English memo body with 한국어, 日本語, and digits 0123456789 for ${size}.`,
          tags: ["alpha", "beta"],
        },
      ],
    },
    graph: {
      nodes: [
        {
          id: "graph-1",
          name: `그래프 / グラフ / graph ${size}`,
        },
      ],
      edges: [],
    },
    snapshots: [
      {
        id: "snapshot-1",
        chapterId: "ch1",
        content: snapshotContent,
        description: makeMixedNarrativeText(96, variant + 13),
        createdAt: "2026-03-12T00:00:00.000Z",
      },
    ],
  };
};

describe("luieContainer extreme scenarios", () => {
  let tempRoot = "";

  afterEach(async () => {
    if (tempRoot) {
      await fsp.rm(tempRoot, { recursive: true, force: true });
      tempRoot = "";
    }
    vi.restoreAllMocks();
  });

  it.each([5_000, 100_000, 1_000_000, 2_000_000, 5_000_000])(
    "keeps %i-character mixed-language payloads stable across reopen",
    async (size) => {
      tempRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "luie-container-extreme-"));
      const packagePath = path.join(tempRoot, `normal-${size}.luie`);
      const payload = buildPackagePayload(size, size % 7);

      await writeLuieContainer({
        targetPath: packagePath,
        payload,
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
        "manuscript/ch1.md",
        logger,
      );
      const chapterTwoRaw = await readLuieContainerEntry(
        packagePath,
        "manuscript/ch2.md",
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

      expect(chapterOneRaw).toBe(payload.chapters[0].content);
      expect(chapterTwoRaw).toBe(payload.chapters[1].content);
      expect(JSON.parse(synopsisRaw ?? "{}")).toMatchObject({
        status: "draft",
      });
      expect(charactersRaw).toContain("한국어");
      expect(charactersRaw).toContain("日本語");
      expect(charactersRaw).toContain("English");
      expect(snapshotIndexRaw).toContain('"snapshot-1"');

      await expectNoWalSidecars(packagePath);
    },
  );

  it.each([
    { label: "empty", content: "" },
    { label: "single-char", content: "한" },
  ])("persists boundary content for $label", async ({ label, content }) => {
    tempRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "luie-container-boundary-"));
    const packagePath = path.join(tempRoot, `${label}.luie`);

    await writeLuieContainer({
      targetPath: packagePath,
      payload: {
        meta: {
          projectId: `boundary-${label}`,
          title: `Boundary ${label}`,
        },
        chapters: [
          {
            id: "ch1",
            content,
          },
        ],
        characters: [],
        terms: [],
        synopsis: { synopsis: content, status: "draft" },
        plot: { columns: [] },
        drawing: { paths: [] },
        mindmap: { nodes: [], edges: [] },
        memos: { memos: [] },
        graph: { nodes: [], edges: [] },
        snapshots: [],
      },
      logger,
    });

    const chapterRaw = await readLuieContainerEntry(
      packagePath,
      "manuscript/ch1.md",
      logger,
    );
    expect(chapterRaw).toBe(content);
    await expectNoWalSidecars(packagePath);
  });

  it("accepts exact max-byte entries and rejects one-byte oversized reads", async () => {
    tempRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "luie-container-limit-"));
    const packagePath = path.join(tempRoot, "limit.luie");
    const exactContent = makeExactMixedByteText(exactLimitBytes);
    const oversizedContent = `${exactContent}a`;

    await writeLuieContainer({
      targetPath: packagePath,
      payload: buildPackagePayload(5_000, 14),
      logger,
    });

    await writeLuieSqliteEntry({
      targetPath: packagePath,
      entryPath: "world/limit.json",
      content: exactContent,
      logger,
    });

    const exactRead = await readLuieContainerEntry(
      packagePath,
      "world/limit.json",
      logger,
    );
    expect(exactRead).toBe(exactContent);

    await writeLuieSqliteEntry({
      targetPath: packagePath,
      entryPath: "world/limit.json",
      content: oversizedContent,
      logger,
    });

    await expect(
      readLuieContainerEntry(packagePath, "world/limit.json", logger),
    ).rejects.toMatchObject({
      code: ErrorCode.FS_READ_FAILED,
    });
  });

  it("supports 1,000 manuscript entries without path collisions", async () => {
    tempRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "luie-container-many-"));
    const packagePath = path.join(tempRoot, "many-entries.luie");
    const chapters = makeManyChapters(1_000, 0, 128);

    await writeLuieContainer({
      targetPath: packagePath,
      payload: {
        meta: {
          projectId: "many-entries",
          title: "Many Entries",
        },
        chapters,
        characters: [
          {
            id: "character-1",
            name: "Many entries character",
            description: makeMixedNarrativeText(180, 1),
          },
        ],
        terms: [],
        synopsis: {
          synopsis: makeMixedNarrativeText(512, 2),
          status: "working",
        },
        plot: { columns: [] },
        drawing: { paths: [] },
        mindmap: { nodes: [], edges: [] },
        memos: { memos: [] },
        graph: { nodes: [], edges: [] },
        snapshots: [
          {
            id: "snapshot-1",
            chapterId: "chapter-1",
            content: makeMixedNarrativeText(256, 3),
            createdAt: "2026-03-12T00:00:00.000Z",
          },
        ],
      },
      logger,
    });

    const first = await readLuieContainerEntry(
      packagePath,
      "manuscript/chapter-1.md",
      logger,
    );
    const middle = await readLuieContainerEntry(
      packagePath,
      "manuscript/chapter-500.md",
      logger,
    );
    const last = await readLuieContainerEntry(
      packagePath,
      "manuscript/chapter-1000.md",
      logger,
    );
    const snapshotRaw = await readLuieContainerEntry(
      packagePath,
      "snapshots/snapshot-1.snap",
      logger,
    );

    expect(first).toBe(chapters[0].content);
    expect(middle).toBe(chapters[499].content);
    expect(last).toBe(chapters[999].content);
    expect(JSON.parse(snapshotRaw ?? "{}")).toMatchObject({
      id: "snapshot-1",
      chapterId: "chapter-1",
    });
    await expectNoWalSidecars(packagePath);
  });

  it("supports long and deep relative entry paths", async () => {
    tempRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "luie-container-path-"));
    const packagePath = path.join(tempRoot, "path-extreme.luie");
    const longPath = makeLongPath(220, "long-entry.json");
    const deepPath = makeDeepPath(12, "deep-entry.json");

    await writeLuieContainer({
      targetPath: packagePath,
      payload: buildPackagePayload(5_000, 21),
      logger,
    });

    await writeLuieSqliteEntry({
      targetPath: packagePath,
      entryPath: longPath,
      content: makeMixedNarrativeText(400, 1),
      logger,
    });
    await writeLuieSqliteEntry({
      targetPath: packagePath,
      entryPath: deepPath,
      content: makeMixedNarrativeText(360, 2),
      logger,
    });

    expect(await readLuieContainerEntry(packagePath, longPath, logger)).toBe(
      makeMixedNarrativeText(400, 1),
    );
    expect(await readLuieContainerEntry(packagePath, deepPath, logger)).toBe(
      makeMixedNarrativeText(360, 2),
    );
  });

  it.each(["../evil.txt", "..\\evil.txt"])(
    "rejects unsafe relative path %s",
    async (unsafePath) => {
      tempRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "luie-container-unsafe-"));
      const packagePath = path.join(tempRoot, "unsafe.luie");

      await writeLuieContainer({
        targetPath: packagePath,
        payload: buildPackagePayload(5_000, 31),
        logger,
      });

      await expect(
        writeLuieSqliteEntry({
          targetPath: packagePath,
          entryPath: unsafePath,
          content: "payload",
          logger,
        }),
      ).rejects.toMatchObject({
        code: ErrorCode.FS_READ_FAILED,
      });
    },
  );

  it("rejects invalid JSON when overwriting meta.json directly", async () => {
    tempRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "luie-container-json-"));
    const packagePath = path.join(tempRoot, "invalid-json.luie");

    await writeLuieContainer({
      targetPath: packagePath,
      payload: buildPackagePayload(5_000, 41),
      logger,
    });

    await expect(
      writeLuieSqliteEntry({
        targetPath: packagePath,
        entryPath: "meta.json",
        content: "not-json",
        logger,
      }),
    ).rejects.toMatchObject({
      code: ErrorCode.FS_WRITE_FAILED,
    });
  });

  it("rejects version mismatches and missing container info rows", async () => {
    tempRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "luie-container-info-"));
    const versionMismatchPath = path.join(tempRoot, "version-mismatch.luie");
    const missingInfoPath = path.join(tempRoot, "missing-info.luie");

    await writeLuieContainer({
      targetPath: versionMismatchPath,
      payload: buildPackagePayload(5_000, 51),
      logger,
    });
    await writeLuieContainer({
      targetPath: missingInfoPath,
      payload: buildPackagePayload(5_000, 52),
      logger,
    });

    const versionDb = new Database(versionMismatchPath);
    try {
      versionDb
        .prepare(`UPDATE "LuieContainerInfo" SET "version" = ? WHERE "id" = 1`)
        .run(999);
    } finally {
      versionDb.close();
    }

    const missingInfoDb = new Database(missingInfoPath);
    try {
      missingInfoDb.prepare(`DELETE FROM "LuieContainerInfo"`).run();
    } finally {
      missingInfoDb.close();
    }

    await expect(
      readLuieContainerEntry(versionMismatchPath, "meta.json", logger),
    ).rejects.toMatchObject({
      code: ErrorCode.FS_READ_FAILED,
    });
    await expect(
      readLuieContainerEntry(missingInfoPath, "meta.json", logger),
    ).rejects.toMatchObject({
      code: ErrorCode.FS_READ_FAILED,
    });
  });

  it("rejects corrupted sqlite headers on read", async () => {
    tempRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "luie-container-corrupt-"));
    const packagePath = path.join(tempRoot, "corrupt.luie");
    await fsp.writeFile(
      packagePath,
      Buffer.concat([
        Buffer.from("SQLite format 3\u0000", "utf8"),
        Buffer.from("not-a-valid-database", "utf8"),
      ]),
    );

    const probe = await probeLuieContainer(packagePath);
    expect(probe.kind).toBe("sqlite-v2");
    await expect(
      readLuieContainerEntry(packagePath, "meta.json", logger),
    ).rejects.toBeTruthy();
  });

  it("survives 100 repeated save-read cycles without WAL sidecars", async () => {
    tempRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "luie-container-repeat-"));
    const packagePath = path.join(tempRoot, "repeat.luie");

    await writeLuieContainer({
      targetPath: packagePath,
      payload: buildPackagePayload(5_000, 61),
      logger,
    });

    for (let index = 0; index < 100; index += 1) {
      const body = makeMixedNarrativeText(1_200 + ((index % 7) * 19), index);
      await writeLuieSqliteEntry({
        targetPath: packagePath,
        entryPath: "manuscript/ch1.md",
        content: body,
        logger,
      });
      const readBack = await readLuieContainerEntry(
        packagePath,
        "manuscript/ch1.md",
        logger,
      );
      expect(readBack).toBe(body);
    }

    await expectNoWalSidecars(packagePath);
  });
});
