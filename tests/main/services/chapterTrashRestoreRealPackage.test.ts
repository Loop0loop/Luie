import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { ChapterService } from "../../../src/main/services/features/manuscript/chapterService.js";
import { projectService } from "../../../src/main/services/features/project/projectService.js";
import { db } from "../../../src/main/database/index.js";
import * as schema from "../../../src/main/database/schema/index.js";
import { autoExtractService } from "../../../src/main/services/features/autoExtract/autoExtractService.js";
import {
  probeLuieContainer,
  readLuieContainerEntry,
} from "../../../src/main/services/io/luieContainer.js";
import { ErrorCode } from "../../../src/shared/constants/errors/index.js";
import { generateText } from "../../helpers/generateText";

/**
 * SUT: 사용자가 앱에서 직접 만든 test.luie를 open → 실제 canonical package에
 * chapter:delete / chapter:restore / chapter:purge를 매번 저장하는 통합 경로.
 *
 * 원본은 읽기와 해시 비교만 수행한다. 모든 파괴적 동작은 임시 복사본에서 실행한다.
 */

const chapterService = new ChapterService();
const sourcePackagePath = path.resolve(process.cwd(), "test.luie");
const containerLogger = {
  info: () => undefined,
  debug: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

const CHARACTER_NAMES = ["강시우", "리나", "세훈", "Aria", "黒崎"] as const;
const EVENT_NAMES = ["균열 발생", "서울 함락", "회귀"] as const;
const FACTION_NAMES = ["헌터협회", "붕괴교단", "정부특무국"] as const;
const DELETED_CHARACTER_NAME = "삭제된인물";
const ALL_ENTITY_NAMES = [...CHARACTER_NAMES, ...EVENT_NAMES, ...FACTION_NAMES];

type ChapterFixture = {
  key: number;
  condition: string;
  content: string;
};

type PackageMeta = {
  projectId: string;
  chapters: Array<{
    id: string;
    title: string;
    order: number;
    file: string;
  }>;
};

const buildFixtures = (): ChapterFixture[] => [
  { key: 1, condition: "빈 본문", content: "" },
  { key: 2, condition: "공백만", content: "   \n\n   " },
  {
    key: 3,
    condition: "짧은 본문 · 링크 없음",
    content: "<p>아무 참조도 없는 문장.</p>",
  },
  {
    key: 4,
    condition: "캐릭터 1명",
    content: `<p>${CHARACTER_NAMES[0]}는 균열 앞에 섰다.</p>`,
  },
  {
    key: 5,
    condition: "사건 1개",
    content: `<p>그날 ${EVENT_NAMES[0]}이 시작되었다.</p>`,
  },
  {
    key: 6,
    condition: "세력 1개",
    content: `<p>${FACTION_NAMES[0]}가 통제선을 세웠다.</p>`,
  },
  {
    key: 7,
    condition: "캐릭터+사건+세력 동시",
    content: `<p>${CHARACTER_NAMES[0]}는 ${FACTION_NAMES[0]} 소속으로 ${EVENT_NAMES[0]}을 목격했다.</p>`,
  },
  {
    key: 8,
    condition: "같은 이름 100회 반복",
    content: `<p>${`${CHARACTER_NAMES[1]} `.repeat(100)}</p>`,
  },
  {
    key: 9,
    condition: "긴 본문(30k) + 링크",
    content: `<p>${CHARACTER_NAMES[2]}</p><p>${generateText(30_000)}</p><p>${EVENT_NAMES[1]}</p>`,
  },
  {
    key: 10,
    condition: "HTML 구조 다양",
    content:
      `<h1>${EVENT_NAMES[2]}</h1><ul><li>${CHARACTER_NAMES[0]}</li><li>${FACTION_NAMES[1]}</li></ul>` +
      "<blockquote><em>강조</em>와 <strong>굵게</strong></blockquote>",
  },
  {
    key: 11,
    condition: "이모지/특수문자",
    content: `<p>${CHARACTER_NAMES[3]} 🔥💀 &lt;&amp;&gt; "인용" &#39;따옴표&#39;</p>`,
  },
  {
    key: 12,
    condition: "한/일/영 혼합",
    content: `<p>${CHARACTER_NAMES[4]}는 hunter다. 균열が開いた.</p>`,
  },
  {
    key: 13,
    condition: "개행 없는 단일 장문(12k)",
    content: `<p>${generateText(12_000, "나")}${CHARACTER_NAMES[1]}</p>`,
  },
  {
    key: 14,
    condition: "문단 300개",
    content: `<p>${Array.from({ length: 300 }, (_value, index) => `줄 ${index}`).join("</p><p>")}</p>`,
  },
  {
    key: 15,
    condition: "존재하지 않는 유사 이름",
    content: "<p>강시우우우와 헌터협회회는 없는 이름이다.</p>",
  },
  {
    key: 16,
    condition: "이름이 부분 문자열로만 포함",
    content: "<p>초강시우력, 대헌터협회장</p>",
  },
  {
    key: 17,
    condition: "삭제된 엔티티 이름 포함",
    content: `<p>${DELETED_CHARACTER_NAME}은 이미 지워졌다.</p>`,
  },
  {
    key: 18,
    condition: "모든 엔티티 이름 포함",
    content: `<p>${ALL_ENTITY_NAMES.join(", ")}</p>`,
  },
  {
    key: 19,
    condition: "태그 없는 평문",
    content: `${CHARACTER_NAMES[0]} 평문 본문 ${EVENT_NAMES[0]}`,
  },
  {
    key: 20,
    condition: "긴 본문(30k) + 이모지 + 전체 링크",
    content: `<p>🔥${ALL_ENTITY_NAMES.join("·")}</p><p>${generateText(30_000, "다")}</p>`,
  },
];

const sha256 = async (filePath: string): Promise<string> =>
  createHash("sha256")
    .update(await fs.readFile(filePath))
    .digest("hex");

const readPackageMeta = async (packagePath: string): Promise<PackageMeta> => {
  const raw = await readLuieContainerEntry(
    packagePath,
    "meta.json",
    containerLogger,
  );
  if (!raw) throw new Error(`meta.json missing: ${packagePath}`);
  return JSON.parse(raw) as PackageMeta;
};

let temporaryDirectory: string | null = null;

beforeAll(() => {
  vi.spyOn(autoExtractService, "scheduleAnalysis").mockImplementation(() => {});
});

afterEach(async () => {
  if (!temporaryDirectory) return;
  await fs.rm(temporaryDirectory, { recursive: true, force: true });
  temporaryDirectory = null;
});

describe("사용자 test.luie 실제 패키지 휴지통 통합", () => {
  it("복사본에서 key 1..20을 삭제→역순 복원→purge하며 DB와 .luie 본문을 동일하게 유지한다", async () => {
    const fixtures = buildFixtures();
    const originalHash = await sha256(sourcePackagePath);
    temporaryDirectory = await fs.mkdtemp(
      path.join(os.tmpdir(), "luie-trash-restore-"),
    );
    const packageCopyPath = path.join(temporaryDirectory, "test-copy.luie");
    await fs.copyFile(sourcePackagePath, packageCopyPath);

    expect(await sha256(packageCopyPath)).toBe(originalHash);
    await expect(probeLuieContainer(packageCopyPath)).resolves.toMatchObject({
      exists: true,
      kind: "sqlite-v2",
      layout: "file",
    });

    const opened = await projectService.openLuieProject(packageCopyPath);
    const projectId = String((opened.project as { id: string }).id);
    const importedChapters = await chapterService.getAllChapters(projectId);
    expect(importedChapters).toHaveLength(1);
    expect(importedChapters[0]).toMatchObject({
      title: "챕터 1",
      content: "",
    });

    // 이 테스트의 SUT는 휴지통 + canonical package 영속화다. 엔티티 서비스는 생성 시
    // fire-and-forget 전체 등장 캐시 재구축을 시작하므로, 동시에 테스트하면 SUT와 무관한
    // UNIQUE 경쟁이 섞인다. research 이름 스캔의 실제 DB 입력은 동일하게 직접 구성한다.
    const now = new Date().toISOString();
    await db
      .getClient()
      .insert(schema.character)
      .values([
        ...CHARACTER_NAMES.map((name, index) => ({
          id: `trash-matrix-character-${index + 1}`,
          projectId,
          name,
          updatedAt: now,
        })),
        {
          id: "trash-matrix-character-deleted",
          projectId,
          name: DELETED_CHARACTER_NAME,
          deletedAt: now,
          updatedAt: now,
        },
      ]);
    await db
      .getClient()
      .insert(schema.event)
      .values(
        EVENT_NAMES.map((name, index) => ({
          id: `trash-matrix-event-${index + 1}`,
          projectId,
          name,
          updatedAt: now,
        })),
      );
    await db
      .getClient()
      .insert(schema.faction)
      .values(
        FACTION_NAMES.map((name, index) => ({
          id: `trash-matrix-faction-${index + 1}`,
          projectId,
          name,
          updatedAt: now,
        })),
      );

    const chapterIdByKey = new Map<number, string>([
      [1, String(importedChapters[0].id)],
    ]);
    for (const fixture of fixtures.slice(1)) {
      // eslint-disable-next-line no-await-in-loop -- key와 order를 1:1로 고정한다.
      const created = await chapterService.createChapter({
        projectId,
        title: `Chapter ${fixture.key}`,
      });
      const chapterId = String(created.id);
      chapterIdByKey.set(fixture.key, chapterId);
      // eslint-disable-next-line no-await-in-loop -- 생성 직후 해당 key의 본문을 확정한다.
      await chapterService.updateChapter({
        id: chapterId,
        content: fixture.content,
      });
    }

    // debounce 중인 create/update까지 끝낸 뒤 실제 복사본을 독립적으로 검사한다.
    await projectService.ensureImmediatePackageExport(
      projectId,
      "test:trash-matrix-ready",
    );
    const beforeDeleteMeta = await readPackageMeta(packageCopyPath);
    expect(beforeDeleteMeta.chapters).toHaveLength(20);

    const packageMismatches: string[] = [];
    for (const fixture of fixtures) {
      const chapterId = chapterIdByKey.get(fixture.key)!;
      const metaChapter = beforeDeleteMeta.chapters.find(
        (chapter) => chapter.id === chapterId,
      );
      if (!metaChapter) {
        packageMismatches.push(
          `key ${fixture.key} (${fixture.condition}): meta 누락`,
        );
        continue;
      }
      // eslint-disable-next-line no-await-in-loop -- 각 meta file과 기대 본문을 직접 비교한다.
      const content = await readLuieContainerEntry(
        packageCopyPath,
        metaChapter.file,
        containerLogger,
      );
      if (content !== fixture.content) {
        packageMismatches.push(
          `key ${fixture.key} (${fixture.condition}): 기대 ${fixture.content.length}자 → package ${content?.length ?? -1}자`,
        );
      }
    }
    expect(packageMismatches).toEqual([]);

    const deleteFailures: string[] = [];
    for (const fixture of fixtures) {
      try {
        // eslint-disable-next-line no-await-in-loop -- 삭제 순서를 1→20으로 고정한다.
        await chapterService.deleteChapter(chapterIdByKey.get(fixture.key)!);
      } catch (error) {
        deleteFailures.push(
          `key ${fixture.key} (${fixture.condition}): ${String(error)}`,
        );
      }
    }
    expect(deleteFailures).toEqual([]);
    expect(await chapterService.getAllChapters(projectId)).toHaveLength(0);
    expect(await chapterService.getDeletedChapters(projectId)).toHaveLength(20);
    expect((await readPackageMeta(packageCopyPath)).chapters).toHaveLength(0);

    const restoreFailures: string[] = [];
    for (const fixture of [...fixtures].reverse()) {
      try {
        // eslint-disable-next-line no-await-in-loop -- 복원 순서를 20→1로 고정한다.
        await chapterService.restoreChapter(chapterIdByKey.get(fixture.key)!);
      } catch (error) {
        restoreFailures.push(
          `key ${fixture.key} (${fixture.condition}): ${String(error)}`,
        );
      }
    }
    expect(restoreFailures).toEqual([]);
    expect(await chapterService.getDeletedChapters(projectId)).toHaveLength(0);

    const restoredChapters = await chapterService.getAllChapters(projectId);
    const restoredContentById = new Map(
      restoredChapters.map((chapter) => [String(chapter.id), chapter.content]),
    );
    expect(restoredChapters).toHaveLength(20);
    expect(
      fixtures.flatMap((fixture) => {
        const actual = restoredContentById.get(
          chapterIdByKey.get(fixture.key)!,
        );
        return actual === fixture.content
          ? []
          : [`key ${fixture.key} (${fixture.condition}) DB 본문 불일치`];
      }),
    ).toEqual([]);

    const restoredMeta = await readPackageMeta(packageCopyPath);
    expect(restoredMeta.projectId).toBe(projectId);
    expect(restoredMeta.chapters).toHaveLength(20);
    const restoredPackageMismatches: string[] = [];
    for (const fixture of fixtures) {
      const metaChapter = restoredMeta.chapters.find(
        (chapter) => chapter.id === chapterIdByKey.get(fixture.key),
      );
      if (!metaChapter) {
        restoredPackageMismatches.push(
          `key ${fixture.key}: 복원 package meta 누락`,
        );
        continue;
      }
      // eslint-disable-next-line no-await-in-loop -- 복원 후 package byte 문자열을 조건별 비교한다.
      const content = await readLuieContainerEntry(
        packageCopyPath,
        metaChapter.file,
        containerLogger,
      );
      if (content !== fixture.content) {
        restoredPackageMismatches.push(
          `key ${fixture.key} (${fixture.condition}): 복원 package 본문 불일치`,
        );
      }
    }
    expect(restoredPackageMismatches).toEqual([]);

    // purge는 정상적으로 복원 불가여야 하며, 이 검증도 원본이 아닌 복사본에서만 수행한다.
    const chapterOneId = chapterIdByKey.get(1)!;
    await chapterService.deleteChapter(chapterOneId);
    await chapterService.purgeChapter(chapterOneId);
    await expect(
      chapterService.restoreChapter(chapterOneId),
    ).rejects.toMatchObject({
      code: ErrorCode.CHAPTER_NOT_FOUND,
    });
    expect((await readPackageMeta(packageCopyPath)).chapters).toHaveLength(19);

    expect(await sha256(packageCopyPath)).not.toBe(originalHash);
    expect(await sha256(sourcePackagePath)).toBe(originalHash);
  }, 900_000);
});
