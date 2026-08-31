import { beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "../../../src/main/database/index.js";
import * as schema from "../../../src/main/database/schema/index.js";
import { ChapterService } from "../../../src/main/services/features/manuscript/chapterService.js";
import { ProjectService } from "../../../src/main/services/features/project/projectService.js";
import { projectService } from "../../../src/main/services/features/project/projectService.js";
import { autoExtractService } from "../../../src/main/services/features/autoExtract/autoExtractService.js";

/**
 * SUT: ChapterService.getAllChapters(목록 경계) + ChapterService.getChapter(본문 해석).
 *
 * 테스트 베이시스: renderer-Optimization-result.md O1-a / O1-b2.
 * O1-a는 목록 조회의 N+1을 배치 조회로 없앴고, O1-b2는 목록 응답에서 본문 자체를 뺐다.
 * 그래서 이 스위트는 두 계약을 나눠 고정한다.
 *   - 목록: 본문 필드가 없고, chapterBody를 조회하지 않으며(select 1회), order/삭제 필터가
 *     유지된다.
 *   - 단건: body → legacy → "" 해석 규칙이 그대로 살아 있다. 본문을 목록에서 뺀 뒤 이
 *     규칙의 유일한 소비자가 getChapter이므로 커버리지를 여기로 옮겼다.
 *
 * PROVES: 목록 응답의 본문 부재, 목록 왕복 1회 고정(챕터 수 무관), order asc·soft delete
 *         제외, 단건 본문 해석 3분기와 빈 문자열 경계, 본문 저장이 목록 계약을 바꾸지 않음.
 * DOES_NOT_PROVE: IPC 직렬화 크기, 렌더러 힙 실측, autoSave 경로.
 *
 * 쓰기 경로(updateChapter)와의 결합을 끊기 위해 픽스처는 DB에 직접 insert한다. 그래야
 * chapterBody가 없는 legacy 상태처럼 서비스 API로는 만들 수 없는 조건을 재현할 수 있다.
 */

const chapterService = new ChapterService();
const localProjectService = new ProjectService();

const { chapter, chapterBody } = schema;

beforeAll(() => {
  vi.spyOn(autoExtractService, "scheduleAnalysis").mockImplementation(() => {});
  vi.spyOn(projectService, "schedulePackageExport").mockImplementation(() => {});
  vi.spyOn(projectService, "attemptImmediatePackageExport").mockResolvedValue({
    exported: false,
  });
  vi.spyOn(localProjectService, "schedulePackageExport").mockImplementation(
    () => {},
  );
});

const createProject = async (title: string): Promise<string> => {
  const project = await localProjectService.createProject({
    title,
    description: "istqb-fixture",
    projectPath: `/tmp/${title}.luie`,
  });
  return String(project.id);
};

type ChapterRowFixture = {
  id: string;
  projectId: string;
  title: string;
  order: number;
  legacyContent: string;
  deletedAt?: string | null;
};

/** chapter 행만 직접 insert한다. chapterBody는 만들지 않는다(legacy 상태 재현). */
const insertChapterRows = async (
  rows: readonly ChapterRowFixture[],
): Promise<void> => {
  if (rows.length === 0) return;
  const now = new Date().toISOString();
  await db
    .getClient()
    .insert(chapter)
    .values(
      rows.map((row) => ({
        id: row.id,
        projectId: row.projectId,
        title: row.title,
        content: row.legacyContent,
        order: row.order,
        wordCount: row.legacyContent.length,
        updatedAt: now,
        deletedAt: row.deletedAt ?? null,
      })),
    );
};

const insertChapterRow = async (row: ChapterRowFixture): Promise<void> =>
  insertChapterRows([row]);

const insertChapterBodyRows = async (
  rows: readonly { chapterId: string; content: string }[],
): Promise<void> => {
  if (rows.length === 0) return;
  const now = new Date().toISOString();
  await db
    .getClient()
    .insert(chapterBody)
    .values(
      rows.map((row) => ({
        chapterId: row.chapterId,
        content: row.content,
        contentHash: "istqb-fixture",
        updatedAt: now,
      })),
    );
};

const insertChapterBodyRow = async (row: {
  chapterId: string;
  content: string;
}): Promise<void> => insertChapterBodyRows([row]);

/** 대상 호출 중 발생한 select 왕복 횟수를 센다. */
const countSelectsDuring = async <T>(
  run: () => Promise<T>,
): Promise<{ result: T; selectCount: number }> => {
  const client = db.getClient();
  const selectSpy = vi.spyOn(client, "select");
  try {
    const result = await run();
    return { result, selectCount: selectSpy.mock.calls.length };
  } finally {
    selectSpy.mockRestore();
  }
};

describe("getAllChapters 목록 경계 (본문 미포함)", () => {
  it("응답 항목에 content 키 자체가 없다", async () => {
    const projectId = await createProject("boundary-no-content");
    await insertChapterRow({
      id: "nc-ch1",
      projectId,
      title: "Chapter 1",
      order: 1,
      legacyContent: "LEGACY_SHOULD_NOT_LEAK",
    });
    await insertChapterBodyRow({
      chapterId: "nc-ch1",
      content: "BODY_SHOULD_NOT_LEAK",
    });

    const chapters = await chapterService.getAllChapters(projectId);

    expect(chapters).toHaveLength(1);
    expect(Object.prototype.hasOwnProperty.call(chapters[0], "content")).toBe(
      false,
    );
    // 목록이 실제로 그리는 필드는 유지돼야 한다.
    expect(chapters[0]).toMatchObject({
      id: "nc-ch1",
      title: "Chapter 1",
      order: 1,
    });
  });

  it("BVA: 챕터 0개면 빈 배열이고 왕복은 1회다", async () => {
    const projectId = await createProject("boundary-empty");

    const { result, selectCount } = await countSelectsDuring(() =>
      chapterService.getAllChapters(projectId),
    );

    expect(result).toEqual([]);
    expect(selectCount).toBe(1);
  });

  it("BVA: 챕터 1개도 왕복 1회다", async () => {
    const projectId = await createProject("boundary-one");
    await insertChapterRow({
      id: "one-ch1",
      projectId,
      title: "Chapter 1",
      order: 1,
      legacyContent: "L",
    });
    await insertChapterBodyRow({ chapterId: "one-ch1", content: "B" });

    const { result, selectCount } = await countSelectsDuring(() =>
      chapterService.getAllChapters(projectId),
    );

    expect(result).toHaveLength(1);
    expect(selectCount).toBe(1);
  });

  it("챕터 20개에서도 왕복이 1회로 고정된다", async () => {
    const projectId = await createProject("boundary-twenty");
    const chapterCount = 20;
    const indexes = Array.from(
      { length: chapterCount },
      (_unused, offset) => offset + 1,
    );

    await insertChapterRows(
      indexes.map((index) => ({
        id: `twenty-ch${index}`,
        projectId,
        title: `Chapter ${index}`,
        order: index,
        legacyContent: `LEGACY_${index}`,
      })),
    );
    await insertChapterBodyRows(
      indexes.map((index) => ({
        chapterId: `twenty-ch${index}`,
        content: `BODY_${index}`,
      })),
    );

    const { result, selectCount } = await countSelectsDuring(() =>
      chapterService.getAllChapters(projectId),
    );

    expect(result).toHaveLength(chapterCount);
    expect(
      result.every(
        (item) => !Object.prototype.hasOwnProperty.call(item, "content"),
      ),
    ).toBe(true);
    // O1-a에서 2회로 줄인 왕복이 O1-b2에서 1회가 된다. body를 볼 이유가 없어졌다.
    expect(selectCount).toBe(1);
  });

  it("order 오름차순을 유지하고 삭제된 챕터를 제외한다", async () => {
    const projectId = await createProject("boundary-order");
    await insertChapterRow({
      id: "o-ch3",
      projectId,
      title: "Third",
      order: 3,
      legacyContent: "3",
    });
    await insertChapterRow({
      id: "o-ch1",
      projectId,
      title: "First",
      order: 1,
      legacyContent: "1",
    });
    await insertChapterRow({
      id: "o-ch2",
      projectId,
      title: "Second",
      order: 2,
      legacyContent: "2",
    });
    await insertChapterRow({
      id: "o-deleted",
      projectId,
      title: "Deleted",
      order: 4,
      legacyContent: "x",
      deletedAt: new Date().toISOString(),
    });

    const chapters = await chapterService.getAllChapters(projectId);

    expect(chapters.map((item) => item.title)).toEqual([
      "First",
      "Second",
      "Third",
    ]);
  });
});

describe("getChapter 본문 해석 (등가분할)", () => {
  it("EP1: chapterBody가 있으면 body 값을 반환한다", async () => {
    const projectId = await createProject("ep1");
    await insertChapterRow({
      id: "ep1-ch1",
      projectId,
      title: "Chapter 1",
      order: 1,
      legacyContent: "LEGACY",
    });
    await insertChapterBodyRow({ chapterId: "ep1-ch1", content: "BODY" });

    const found = await chapterService.getChapter("ep1-ch1");

    expect(found.content).toBe("BODY");
  });

  it("EP2: chapterBody가 없으면 legacy chapter.content로 폴백한다", async () => {
    const projectId = await createProject("ep2");
    await insertChapterRow({
      id: "ep2-ch1",
      projectId,
      title: "Chapter 1",
      order: 1,
      legacyContent: "LEGACY_ONLY",
    });

    const found = await chapterService.getChapter("ep2-ch1");

    expect(found.content).toBe("LEGACY_ONLY");
  });

  it("EP3: 양쪽 모두 빈 값이면 빈 문자열을 반환한다", async () => {
    const projectId = await createProject("ep3");
    await insertChapterRow({
      id: "ep3-ch1",
      projectId,
      title: "Chapter 1",
      order: 1,
      legacyContent: "",
    });

    const found = await chapterService.getChapter("ep3-ch1");

    expect(found.content).toBe("");
  });
});

describe("getChapter 본문 해석 (경계값)", () => {
  // 해석은 `typeof content === "string"`이므로 빈 문자열 body도 유효한 값이다.
  // `||` 폴백으로 잘못 구현하면 legacy 값이 되살아난다.
  it("BVA: body가 빈 문자열이면 legacy로 폴백하지 않는다", async () => {
    const projectId = await createProject("bva-empty-body");
    await insertChapterRow({
      id: "bva-ch1",
      projectId,
      title: "Chapter 1",
      order: 1,
      legacyContent: "LEGACY_SHOULD_NOT_APPEAR",
    });
    await insertChapterBodyRow({ chapterId: "bva-ch1", content: "" });

    const found = await chapterService.getChapter("bva-ch1");

    expect(found.content).toBe("");
  });

  it("body와 legacy가 섞여 있어도 챕터별로 올바른 본문을 짝짓는다", async () => {
    const projectId = await createProject("mixed");
    const indexes = [1, 2, 3, 4, 5, 6];

    await insertChapterRows(
      indexes.map((index) => ({
        id: `mixed-ch${index}`,
        projectId,
        title: `Chapter ${index}`,
        order: index,
        legacyContent: `LEGACY_${index}`,
      })),
    );
    // 짝수 챕터만 chapterBody를 갖는다.
    await insertChapterBodyRows(
      indexes
        .filter((index) => index % 2 === 0)
        .map((index) => ({
          chapterId: `mixed-ch${index}`,
          content: `BODY_${index}`,
        })),
    );

    const resolved = await Promise.all(
      indexes.map(async (index) => {
        const found = await chapterService.getChapter(`mixed-ch${index}`);
        return found.content;
      }),
    );

    expect(resolved).toEqual([
      "LEGACY_1",
      "BODY_2",
      "LEGACY_3",
      "BODY_4",
      "LEGACY_5",
      "BODY_6",
    ]);
  });
});

describe("본문 저장의 상태전이", () => {
  it("본문을 저장해도 목록 계약은 바뀌지 않고 단건 조회가 최신 본문을 준다", async () => {
    const projectId = await createProject("transition");
    const created = await chapterService.createChapter({
      projectId,
      title: "Chapter 1",
    });
    const chapterId = String(created.id);

    expect(await chapterService.getChapter(chapterId)).toMatchObject({
      content: "",
    });

    await chapterService.updateChapter({
      id: chapterId,
      content: "UPDATED_BODY",
    });

    const listed = await chapterService.getAllChapters(projectId);
    const listedChapter = listed.find((item) => item.id === chapterId);
    expect(listedChapter).toBeDefined();
    // 저장 후에도 목록은 본문을 나르지 않는다.
    expect(
      Object.prototype.hasOwnProperty.call(listedChapter!, "content"),
    ).toBe(false);

    const fetched = await chapterService.getChapter(chapterId);
    expect(fetched.content).toBe("UPDATED_BODY");
  });
});
