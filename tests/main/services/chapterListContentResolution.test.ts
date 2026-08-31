import { beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "../../../src/main/database/index.js";
import * as schema from "../../../src/main/database/schema/index.js";
import { ChapterService } from "../../../src/main/services/features/manuscript/chapterService.js";
import { ProjectService } from "../../../src/main/services/features/project/projectService.js";
import { projectService } from "../../../src/main/services/features/project/projectService.js";
import { autoExtractService } from "../../../src/main/services/features/autoExtract/autoExtractService.js";

/**
 * SUT: ChapterService.getAllChapters — 목록 조회의 본문 해석 경로.
 *
 * 테스트 베이시스: renderer-Optimization-result.md O1.
 * 변경 전에는 챕터마다 readChapterContent를 호출해 왕복이 1 + N*(1~2)회였다. 본 스위트는
 * (a) 본문 해석 결과가 변경 전과 동일한지(등가분할·경계값), (b) 왕복 횟수가 챕터 수와
 * 무관하게 2회로 고정되는지(효율성)를 함께 고정한다.
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

/** getAllChapters 실행 중 발생한 select 왕복 횟수를 센다. */
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

describe("getAllChapters 본문 해석 (등가분할)", () => {
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

    const chapters = await chapterService.getAllChapters(projectId);

    expect(chapters).toHaveLength(1);
    expect(chapters[0].content).toBe("BODY");
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

    const chapters = await chapterService.getAllChapters(projectId);

    expect(chapters).toHaveLength(1);
    expect(chapters[0].content).toBe("LEGACY_ONLY");
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

    const chapters = await chapterService.getAllChapters(projectId);

    expect(chapters[0].content).toBe("");
  });
});

describe("getAllChapters 본문 해석 (경계값)", () => {
  // 변경 전 readChapterContent는 `typeof content === "string"`으로 판정했으므로 빈 문자열
  // body도 유효한 값이다. `||` 폴백으로 잘못 구현하면 legacy 값이 되살아난다.
  it("BVA1: body가 빈 문자열이면 legacy로 폴백하지 않는다", async () => {
    const projectId = await createProject("bva1");
    await insertChapterRow({
      id: "bva1-ch1",
      projectId,
      title: "Chapter 1",
      order: 1,
      legacyContent: "LEGACY_SHOULD_NOT_APPEAR",
    });
    await insertChapterBodyRow({ chapterId: "bva1-ch1", content: "" });

    const chapters = await chapterService.getAllChapters(projectId);

    expect(chapters[0].content).toBe("");
  });

  it("BVA2: 챕터 0개면 빈 배열을 반환하고 body 조회를 하지 않는다", async () => {
    const projectId = await createProject("bva2");

    const { result, selectCount } = await countSelectsDuring(() =>
      chapterService.getAllChapters(projectId),
    );

    expect(result).toEqual([]);
    expect(selectCount).toBe(1);
  });

  it("BVA3: 챕터 1개도 왕복 2회로 처리한다", async () => {
    const projectId = await createProject("bva3");
    await insertChapterRow({
      id: "bva3-ch1",
      projectId,
      title: "Chapter 1",
      order: 1,
      legacyContent: "L",
    });
    await insertChapterBodyRow({ chapterId: "bva3-ch1", content: "B" });

    const { result, selectCount } = await countSelectsDuring(() =>
      chapterService.getAllChapters(projectId),
    );

    expect(result).toHaveLength(1);
    expect(selectCount).toBe(2);
  });
});

describe("getAllChapters 목록 계약", () => {
  it("order 오름차순을 유지하고 삭제된 챕터를 제외한다", async () => {
    const projectId = await createProject("contract");
    await insertChapterRow({
      id: "c-ch3",
      projectId,
      title: "Third",
      order: 3,
      legacyContent: "3",
    });
    await insertChapterRow({
      id: "c-ch1",
      projectId,
      title: "First",
      order: 1,
      legacyContent: "1",
    });
    await insertChapterRow({
      id: "c-ch2",
      projectId,
      title: "Second",
      order: 2,
      legacyContent: "2",
    });
    await insertChapterRow({
      id: "c-deleted",
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

    const chapters = await chapterService.getAllChapters(projectId);

    expect(chapters.map((item) => item.content)).toEqual([
      "LEGACY_1",
      "BODY_2",
      "LEGACY_3",
      "BODY_4",
      "LEGACY_5",
      "BODY_6",
    ]);
  });
});

describe("getAllChapters 효율성", () => {
  // 변경 전: 1 + N*(1~2)회. N=20이면 21~41회.
  // 변경 후: 챕터 수와 무관하게 2회.
  it("챕터 20개에서도 select 왕복이 2회로 고정된다", async () => {
    const projectId = await createProject("efficiency");
    const chapterCount = 20;
    const indexes = Array.from(
      { length: chapterCount },
      (_unused, offset) => offset + 1,
    );

    await insertChapterRows(
      indexes.map((index) => ({
        id: `eff-ch${index}`,
        projectId,
        title: `Chapter ${index}`,
        order: index,
        legacyContent: `LEGACY_${index}`,
      })),
    );
    await insertChapterBodyRows(
      indexes.map((index) => ({
        chapterId: `eff-ch${index}`,
        content: `BODY_${index}`,
      })),
    );

    const { result, selectCount } = await countSelectsDuring(() =>
      chapterService.getAllChapters(projectId),
    );

    expect(result).toHaveLength(chapterCount);
    expect(result.every((item) => item.content.startsWith("BODY_"))).toBe(true);
    expect(selectCount).toBe(2);
  });
});

describe("getAllChapters 상태전이", () => {
  it("본문 저장 후 재조회하면 최신 본문을 반환한다", async () => {
    const projectId = await createProject("transition");
    const created = await chapterService.createChapter({
      projectId,
      title: "Chapter 1",
    });
    const chapterId = String(created.id);

    const before = await chapterService.getAllChapters(projectId);
    expect(before.find((item) => item.id === chapterId)?.content).toBe("");

    await chapterService.updateChapter({
      id: chapterId,
      content: "UPDATED_BODY",
    });

    const after = await chapterService.getAllChapters(projectId);
    expect(after.find((item) => item.id === chapterId)?.content).toBe(
      "UPDATED_BODY",
    );
  });
});
