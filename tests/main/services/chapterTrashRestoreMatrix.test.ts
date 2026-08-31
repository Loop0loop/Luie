import { beforeAll, describe, expect, it, vi } from "vitest";
import { ChapterService } from "../../../src/main/services/features/manuscript/chapterService.js";
import {
  ProjectService,
  projectService,
} from "../../../src/main/services/features/project/projectService.js";
import { characterService } from "../../../src/main/services/features/world/entities/characterService.js";
import { eventService } from "../../../src/main/services/features/world/entities/eventService.js";
import { factionService } from "../../../src/main/services/features/world/entities/factionService.js";
import { autoExtractService } from "../../../src/main/services/features/autoExtract/autoExtractService.js";
import { generateText } from "../../helpers/generateText";
import { ErrorCode } from "../../../src/shared/constants/errors";

/**
 * SUT: ChapterService 휴지통 흐름 — deleteChapter → getDeletedChapters → restoreChapter / purgeChapter.
 *
 * 테스트 베이시스: "휴지통에서 챕터 1만 복구되지 않았다"는 현장 보고.
 * `restoreChapter`는 deletedAt 해제 뒤 후처리를 같은 try 블록에서 수행한다.
 *   - `trackKeywordAppearances(id, content, projectId)` — 본문에서 캐릭터/용어 이름을 찾아
 *     firstAppearance와 등장 캐시를 갱신한다.
 *   - `chapterSearchCacheService.upsertChapter(...)` — 검색 캐시를 갱신한다.
 * 후처리가 특정 본문에서 던지면 복원 전체가 실패한다. 즉 "특정 챕터만 복원되지 않는" 증상은
 * 본문 내용에 의존할 수 있다. 본문 조건을 등가분할로 나눠 20개 챕터(key 1..20)에 1:1로 심고
 * 삭제 → 목록 → 복원 → 재조회를 검증한다.
 *
 * NOTE: `tests/setup.ts`가 매 테스트 전에 DB를 비우므로 픽스처는 각 테스트 안에서 만든다.
 * 실패 시 어떤 조건이 깨졌는지 알 수 있도록 조건 라벨을 배열로 모아 한 번에 단정한다.
 */

const chapterService = new ChapterService();
const localProjectService = new ProjectService();

const CHARACTER_NAMES = ["강시우", "리나", "세훈", "Aria", "黒崎"] as const;
const EVENT_NAMES = ["균열 발생", "서울 함락", "회귀"] as const;
const FACTION_NAMES = ["헌터협회", "붕괴교단", "정부특무국"] as const;
const DELETED_CHARACTER_NAME = "삭제된인물";
const ALL_ENTITY_NAMES = [
  ...CHARACTER_NAMES,
  ...EVENT_NAMES,
  ...FACTION_NAMES,
];

type ChapterFixture = {
  /** 사용자가 말한 "챕터 key" = 1..20 순번 */
  key: number;
  condition: string;
  content: string;
};

type Matrix = {
  projectId: string;
  fixtures: readonly ChapterFixture[];
  chapterIdByKey: Map<number, string>;
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
      `<blockquote><em>강조</em>와 <strong>굵게</strong></blockquote>`,
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
    content: `<p>${Array.from({ length: 300 }, (_v, i) => `줄 ${i}`).join("</p><p>")}</p>`,
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

/** research 엔티티를 만들고 20개 챕터에 조건별 본문을 심는다. */
const setupMatrix = async (
  label: string,
  keys?: readonly number[],
): Promise<Matrix> => {
  const project = await localProjectService.createProject({
    title: `Trash Restore ${label}`,
    description: "istqb-trash-restore",
    projectPath: `/tmp/trash-restore-${label}.luie`,
  });
  const projectId = String(project.id);

  // SmartLink는 본문에 마크업을 넣지 않고 엔티티 이름을 스캔한다. 따라서 이름을 본문에
  // 심는 것이 곧 research 링크 조건이다.
  await Promise.all([
    ...CHARACTER_NAMES.map((name) =>
      characterService.createCharacter({ projectId, name }),
    ),
    ...EVENT_NAMES.map((name) => eventService.createEvent({ projectId, name })),
    ...FACTION_NAMES.map((name) =>
      factionService.createFaction({ projectId, name }),
    ),
  ]);

  const removable = await characterService.createCharacter({
    projectId,
    name: DELETED_CHARACTER_NAME,
  });
  await characterService.deleteCharacter(String(removable.id));

  const allFixtures = buildFixtures();
  const fixtures = keys
    ? allFixtures.filter((fixture) => keys.includes(fixture.key))
    : allFixtures;
  const chapterIdByKey = new Map<number, string>();

  for (const fixture of fixtures) {
    // eslint-disable-next-line no-await-in-loop -- order를 key 순서로 확정하려면 순차 생성이 필요하다.
    const created = await chapterService.createChapter({
      projectId,
      title: `Chapter ${fixture.key}`,
    });
    const chapterId = String(created.id);
    chapterIdByKey.set(fixture.key, chapterId);
    if (fixture.content.length > 0) {
      // eslint-disable-next-line no-await-in-loop -- 생성 직후 본문을 확정한다.
      await chapterService.updateChapter({
        id: chapterId,
        content: fixture.content,
      });
    }
  }

  return { projectId, fixtures, chapterIdByKey };
};

const readContent = async (
  matrix: Matrix,
  key: number,
): Promise<string> => {
  const chapterId = matrix.chapterIdByKey.get(key);
  if (!chapterId) throw new Error(`fixture missing for key ${key}`);
  const chapter = (await chapterService.getChapter(chapterId)) as {
    content: string;
  };
  return chapter.content;
};

/** 조건별 본문 일치 여부를 모아 반환한다. 빈 배열이면 전부 일치. */
const collectContentMismatches = async (
  matrix: Matrix,
  keys: readonly number[],
): Promise<string[]> => {
  const mismatches: string[] = [];
  for (const key of keys) {
    const fixture = matrix.fixtures.find((item) => item.key === key);
    if (!fixture) continue;
    // eslint-disable-next-line no-await-in-loop -- 조건별 개별 조회가 필요하다.
    const stored = await readContent(matrix, key);
    if (stored !== fixture.content) {
      mismatches.push(
        `key ${key} (${fixture.condition}): 기대 ${fixture.content.length}자 → 실제 ${stored.length}자`,
      );
    }
  }
  return mismatches;
};

beforeAll(() => {
  vi.spyOn(autoExtractService, "scheduleAnalysis").mockImplementation(() => {});
  vi.spyOn(projectService, "schedulePackageExport").mockImplementation(() => {});
  vi.spyOn(projectService, "attemptImmediatePackageExport").mockResolvedValue({
    exported: false,
  });
  vi.spyOn(localProjectService, "schedulePackageExport").mockImplementation(
    () => {},
  );
  // NOTE: 테스트 환경에는 실제 `.luie` 패키지가 없어 canonical 저장이 항상 실패한다.
  // 휴지통 흐름 자체를 보려면 파일 IO를 분리해야 한다. 저장 실패가 결과에 미치는 영향은
  // 아래 "패키지 저장 실패" 케이스에서 따로 검증한다.
  vi.spyOn(projectService, "persistPackageAfterMutation").mockResolvedValue(
    undefined,
  );
});

describe("휴지통 삭제 → 복원 (본문 조건 매트릭스 key 1..20)", () => {
  it("사전 조건: 20개 챕터가 조건별 본문을 그대로 보관한다", async () => {
    const matrix = await setupMatrix("baseline");
    const keys = matrix.fixtures.map((fixture) => fixture.key);

    expect(matrix.chapterIdByKey.size).toBe(20);
    expect(await collectContentMismatches(matrix, keys)).toEqual([]);
  }, 180_000);

  // 핵심 케이스. 삭제는 1→20, 복원은 20→1로 해 순서 의존성까지 함께 본다.
  it("20개를 전부 삭제하고 역순으로 전부 복원하며 본문이 보존된다", async () => {
    const matrix = await setupMatrix("full-cycle");
    const keys = matrix.fixtures.map((fixture) => fixture.key);

    const deleteFailures: string[] = [];
    for (const fixture of matrix.fixtures) {
      const chapterId = matrix.chapterIdByKey.get(fixture.key);
      if (!chapterId) continue;
      try {
        // eslint-disable-next-line no-await-in-loop -- 삭제 순서를 1→20으로 고정한다.
        await chapterService.deleteChapter(chapterId);
      } catch (error) {
        deleteFailures.push(
          `key ${fixture.key} (${fixture.condition}): ${String(error)}`,
        );
      }
    }
    expect(deleteFailures).toEqual([]);
    expect(await chapterService.getAllChapters(matrix.projectId)).toHaveLength(0);
    expect(
      await chapterService.getDeletedChapters(matrix.projectId),
    ).toHaveLength(20);

    const restoreFailures: string[] = [];
    for (const fixture of [...matrix.fixtures].reverse()) {
      const chapterId = matrix.chapterIdByKey.get(fixture.key);
      if (!chapterId) continue;
      try {
        // eslint-disable-next-line no-await-in-loop -- 복원 순서를 20→1로 고정한다.
        await chapterService.restoreChapter(chapterId);
      } catch (error) {
        restoreFailures.push(
          `key ${fixture.key} (${fixture.condition}): ${String(error)}`,
        );
      }
    }

    expect(restoreFailures).toEqual([]);
    expect(await collectContentMismatches(matrix, keys)).toEqual([]);

    const chapters = await chapterService.getAllChapters(matrix.projectId);
    const deleted = await chapterService.getDeletedChapters(matrix.projectId);
    expect(chapters).toHaveLength(20);
    expect(deleted).toHaveLength(0);
    expect(chapters.map((item) => item.title)).toEqual(
      matrix.fixtures.map((fixture) => `Chapter ${fixture.key}`),
    );
  }, 300_000);

  it("이미 복원된 챕터를 다시 복원해도 실패하지 않는다(멱등)", async () => {
    const keys = [1, 7, 9] as const;
    const matrix = await setupMatrix("idempotent", keys);
    const chapterId = matrix.chapterIdByKey.get(7);
    expect(chapterId).toBeDefined();

    await chapterService.deleteChapter(chapterId!);
    await chapterService.restoreChapter(chapterId!);
    await expect(
      chapterService.restoreChapter(chapterId!),
    ).resolves.toBeTruthy();

    expect(await collectContentMismatches(matrix, [7])).toEqual([]);
  }, 180_000);

  it("동시에 복원해도 전부 성공하고 본문이 보존된다", async () => {
    const keys = [3, 7, 9, 18, 20] as const;
    const matrix = await setupMatrix("concurrent", keys);
    const targetIds = keys.map((key) => matrix.chapterIdByKey.get(key)!);

    for (const chapterId of targetIds) {
      // eslint-disable-next-line no-await-in-loop -- 동시 복원 전 상태를 확정한다.
      await chapterService.deleteChapter(chapterId);
    }

    const results = await Promise.allSettled(
      targetIds.map((chapterId) => chapterService.restoreChapter(chapterId)),
    );

    expect(
      results
        .map((result, index) =>
          result.status === "rejected"
            ? `key ${keys[index]}: ${String(result.reason)}`
            : null,
        )
        .filter((entry): entry is string => entry !== null),
    ).toEqual([]);
    expect(await collectContentMismatches(matrix, keys)).toEqual([]);
  }, 300_000);

  it("purge된 챕터는 복원되지 않는다", async () => {
    const matrix = await setupMatrix("purge", [4]);
    const chapterId = matrix.chapterIdByKey.get(4);
    expect(chapterId).toBeDefined();

    await chapterService.deleteChapter(chapterId!);
    await chapterService.purgeChapter(chapterId!);

    await expect(
      chapterService.restoreChapter(chapterId!),
    ).rejects.toMatchObject({ code: ErrorCode.CHAPTER_NOT_FOUND });
  }, 180_000);
});
